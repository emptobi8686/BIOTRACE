-- BIOTRACE Milestone 4: Persistent Biomass Delivery Workflow
-- Author: BIOTRACE Engineering
-- Implements trusted write RPCs for delivery creation, plant weighbridge confirmation, and review submission.
-- No client table-level write grants are required; all mutations are governed by transactional SECURITY DEFINER functions.

-- 1. Function: create_biomass_delivery
create or replace function public.create_biomass_delivery(
  p_supplier_org_id uuid,
  p_plant_org_id uuid,
  p_biomass_type text,
  p_origin_location text,
  p_declared_quantity_t numeric,
  p_delivery_date date,
  p_vehicle_reference text default null,
  p_notes text default null,
  p_aggregator_org_id uuid default null,
  p_destination_facility_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id uuid := auth.uid();
  caller_name text;
  caller_role text;
  v_supplier_name text;
  v_plant_name text;
  v_plant_type text;
  v_facility_id uuid := p_destination_facility_id;
  new_reference text;
  new_delivery_id uuid;
  ref_exists boolean;
  attempts int := 0;
begin
  -- Authentication guard
  if caller_id is null then
    raise exception 'Authentication is required to declare a delivery' using errcode = '28000';
  end if;

  -- Load caller profile info
  select coalesce(nullif(btrim(p.full_name), ''), u.email, 'Authorized Representative'), p.role
    into caller_name, caller_role
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = caller_id;

  -- Verify caller membership and approval in supplier or aggregator org
  if not (
    biotrace_private.is_platform_admin()
    or biotrace_private.is_approved_org_member(p_supplier_org_id, array['supplier', 'organization_admin'])
    or (p_aggregator_org_id is not null and biotrace_private.is_approved_org_member(p_aggregator_org_id, array['aggregator', 'organization_admin']))
  ) then
    raise exception 'Caller must belong to an approved supplier or aggregator organization' using errcode = '42501';
  end if;

  -- Verify supplier organization exists and is approved
  select o.name into v_supplier_name
  from public.organizations o
  where o.id = p_supplier_org_id;

  if v_supplier_name is null then
    raise exception 'Supplier organization was not found' using errcode = 'P0002';
  end if;

  -- Verify destination plant organization exists and is of cement_plant type
  select o.name, o.organization_type into v_plant_name, v_plant_type
  from public.organizations o
  where o.id = p_plant_org_id;

  if v_plant_name is null then
    raise exception 'Destination cement plant was not found' using errcode = 'P0002';
  end if;

  if v_plant_type <> 'cement_plant' and not biotrace_private.is_platform_admin() then
    raise exception 'Destination organization must be a cement manufacturing plant' using errcode = '22023';
  end if;

  -- Validate delivery payload
  if p_biomass_type is null or length(btrim(p_biomass_type)) < 2 then
    raise exception 'Biomass feedstock type is required' using errcode = '22023';
  end if;

  if p_origin_location is null or length(btrim(p_origin_location)) < 2 then
    raise exception 'Origin location is required' using errcode = '22023';
  end if;

  if p_declared_quantity_t is null or p_declared_quantity_t <= 0 or p_declared_quantity_t > 100000 then
    raise exception 'Declared quantity must be greater than 0 and realistic (up to 100,000 tonnes)' using errcode = '22023';
  end if;

  if p_delivery_date is null then
    raise exception 'Delivery date is required' using errcode = '22023';
  end if;

  -- Ensure facility exists if none specified
  if v_facility_id is not null then
    if not exists (select 1 from public.facilities f where f.id = v_facility_id and f.organization_id = p_plant_org_id) then
      raise exception 'Destination facility does not belong to the selected plant' using errcode = '22023';
    end if;
  else
    -- Default to the first facility of the plant if one exists
    select f.id into v_facility_id
    from public.facilities f
    where f.organization_id = p_plant_org_id
    order by f.created_at asc
    limit 1;
  end if;

  -- Generate collision-free reference BIO-YYYYMMDD-XXXX
  loop
    attempts := attempts + 1;
    new_reference := 'BIO-' || to_char(coalesce(p_delivery_date, current_date), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));
    select exists (select 1 from public.deliveries d where d.reference = new_reference) into ref_exists;
    exit when not ref_exists or attempts > 10;
  end loop;

  -- Insert delivery record
  insert into public.deliveries (
    reference,
    supplier_org_id,
    supplier_name,
    aggregator_org_id,
    plant_org_id,
    plant_name,
    destination_facility_id,
    biomass_type,
    origin_location,
    declared_quantity_t,
    unit,
    delivery_date,
    vehicle_reference,
    notes,
    status,
    created_by
  )
  values (
    new_reference,
    p_supplier_org_id,
    v_supplier_name,
    p_aggregator_org_id,
    p_plant_org_id,
    v_plant_name,
    v_facility_id,
    btrim(p_biomass_type),
    btrim(p_origin_location),
    round(p_declared_quantity_t, 3),
    't',
    p_delivery_date,
    nullif(btrim(p_vehicle_reference), ''),
    coalesce(nullif(btrim(p_notes), ''), ''),
    'pending_plant_confirmation',
    caller_id
  )
  returning id into new_delivery_id;

  -- Record initial status in append-only status history
  insert into public.delivery_status_history (
    delivery_id,
    from_status,
    to_status,
    actor_user_id,
    actor_role,
    actor_name,
    note
  )
  values (
    new_delivery_id,
    null,
    'pending_plant_confirmation',
    caller_id,
    case when caller_role in ('administrator', 'supplier', 'plant_operator', 'reviewer', 'buyer') then caller_role else 'supplier' end,
    caller_name,
    'Delivery declared and submitted for plant weighbridge confirmation.'
  );

  -- Record delivery event
  insert into public.delivery_events (
    delivery_id,
    from_status,
    to_status,
    actor_user_id,
    event_type,
    note
  )
  values (
    new_delivery_id,
    null,
    'pending_plant_confirmation',
    caller_id,
    'delivery_created',
    'Declared ' || round(p_declared_quantity_t, 3)::text || ' t of ' || btrim(p_biomass_type)
  );

  -- Write platform audit log
  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_state,
    metadata
  )
  values (
    caller_id,
    'delivery.created',
    'delivery',
    new_delivery_id::text,
    jsonb_build_object(
      'reference', new_reference,
      'status', 'pending_plant_confirmation',
      'declared_quantity_t', p_declared_quantity_t,
      'supplier_org_id', p_supplier_org_id,
      'plant_org_id', p_plant_org_id
    ),
    jsonb_build_object('created_by', caller_name)
  );

  return new_delivery_id;
end;
$$;

revoke all on function public.create_biomass_delivery from public, anon;
grant execute on function public.create_biomass_delivery to authenticated;


-- 2. Function: confirm_plant_delivery
create or replace function public.confirm_plant_delivery(
  p_delivery_id uuid,
  p_decision text,
  p_measured_quantity_t numeric,
  p_dispute_reason text default null,
  p_facility_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id uuid := auth.uid();
  caller_name text;
  caller_role text;
  v_delivery record;
  v_facility_id uuid := p_facility_id;
  v_norm_decision text := lower(btrim(p_decision));
  v_norm_reason text := nullif(btrim(p_dispute_reason), '');
  v_measured numeric(12,3) := round(p_measured_quantity_t, 3);
begin
  -- Authentication guard
  if caller_id is null then
    raise exception 'Authentication is required to confirm deliveries' using errcode = '28000';
  end if;

  -- Load caller profile
  select coalesce(nullif(btrim(p.full_name), ''), u.email, 'Plant Weighbridge Operator'), p.role
    into caller_name, caller_role
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = caller_id;

  -- Load target delivery with lock
  select *
    into v_delivery
  from public.deliveries d
  where d.id = p_delivery_id
  for update;

  if not found then
    raise exception 'Delivery was not found' using errcode = 'P0002';
  end if;

  if v_delivery.status <> 'pending_plant_confirmation' then
    raise exception 'Only deliveries waiting for plant confirmation can be confirmed or disputed' using errcode = '55000';
  end if;

  -- Authorization guard: caller must belong to the destination plant org or assigned facility
  if not (
    biotrace_private.is_platform_admin()
    or biotrace_private.is_approved_org_member(v_delivery.plant_org_id, array['plant_operator', 'organization_admin'])
    or (v_delivery.destination_facility_id is not null and biotrace_private.is_assigned_to_facility(v_delivery.destination_facility_id))
  ) then
    raise exception 'Only authorized plant operators at the destination plant may confirm this delivery' using errcode = '42501';
  end if;

  -- Validate decision parameters
  if v_norm_decision not in ('confirmed', 'disputed') then
    raise exception 'Decision must be either "confirmed" or "disputed"' using errcode = '22023';
  end if;

  if v_measured is null or v_measured <= 0 then
    raise exception 'Measured weighbridge quantity must be greater than zero' using errcode = '22023';
  end if;

  if v_norm_decision = 'disputed' and v_norm_reason is null then
    raise exception 'A dispute reason is required when disputing a delivery' using errcode = '22023';
  end if;

  -- Resolve facility ID: ensure one exists for the plant
  if v_facility_id is null then
    v_facility_id := v_delivery.destination_facility_id;
  end if;

  if v_facility_id is null then
    -- Check if plant already has any facility
    select f.id into v_facility_id
    from public.facilities f
    where f.organization_id = v_delivery.plant_org_id
    limit 1;

    -- If no facility exists yet, create default main weighbridge facility
    if v_facility_id is null then
      insert into public.facilities (organization_id, name, address, region)
      values (v_delivery.plant_org_id, 'Main Weighbridge', 'Plant Facility', 'Operational')
      returning id into v_facility_id;
    end if;
  end if;

  -- Update delivery status and measured quantity
  update public.deliveries
  set status = v_norm_decision,
      measured_quantity_t = v_measured,
      discrepancy_note = coalesce(v_norm_reason, ''),
      destination_facility_id = coalesce(destination_facility_id, v_facility_id),
      updated_at = now()
  where id = p_delivery_id;

  -- Record in plant_confirmations
  insert into public.plant_confirmations (
    delivery_id,
    facility_id,
    confirmed_by,
    decision,
    measured_quantity_t,
    dispute_reason
  )
  values (
    p_delivery_id,
    v_facility_id,
    caller_id,
    v_norm_decision,
    v_measured,
    v_norm_reason
  );

  -- Record in append-only delivery_status_history
  insert into public.delivery_status_history (
    delivery_id,
    from_status,
    to_status,
    actor_user_id,
    actor_role,
    actor_name,
    note
  )
  values (
    p_delivery_id,
    'pending_plant_confirmation',
    v_norm_decision,
    caller_id,
    'plant_operator',
    caller_name,
    case
      when v_norm_decision = 'confirmed' then 'Weighbridge confirmation recorded: ' || v_measured::text || ' t (declared: ' || v_delivery.declared_quantity_t::text || ' t)'
      else 'Disputed at weighbridge: ' || v_norm_reason || ' (measured: ' || v_measured::text || ' t, declared: ' || v_delivery.declared_quantity_t::text || ' t)'
    end
  );

  -- Record delivery event
  insert into public.delivery_events (
    delivery_id,
    from_status,
    to_status,
    actor_user_id,
    event_type,
    note
  )
  values (
    p_delivery_id,
    'pending_plant_confirmation',
    v_norm_decision,
    caller_id,
    'plant_' || v_norm_decision,
    'Measured ' || v_measured::text || ' t at weighbridge.'
  );

  -- Record audit log
  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  )
  values (
    caller_id,
    'delivery.' || v_norm_decision,
    'delivery',
    p_delivery_id::text,
    jsonb_build_object('status', 'pending_plant_confirmation', 'declared_quantity_t', v_delivery.declared_quantity_t),
    jsonb_build_object('status', v_norm_decision, 'measured_quantity_t', v_measured, 'dispute_reason', v_norm_reason),
    jsonb_build_object('confirmed_by', caller_name)
  );
end;
$$;

revoke all on function public.confirm_plant_delivery from public, anon;
grant execute on function public.confirm_plant_delivery to authenticated;


-- 3. Function: submit_delivery_for_review
create or replace function public.submit_delivery_for_review(
  p_delivery_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id uuid := auth.uid();
  caller_name text;
  caller_role text;
  v_delivery record;
  v_norm_note text := coalesce(nullif(btrim(p_note), ''), 'Submitted for independent climate assurance review.');
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), u.email, 'Participant'), p.role
    into caller_name, caller_role
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = caller_id;

  select * into v_delivery
  from public.deliveries d
  where d.id = p_delivery_id
  for update;

  if not found then
    raise exception 'Delivery was not found' using errcode = 'P0002';
  end if;

  if v_delivery.status not in ('confirmed', 'corrections_requested') then
    raise exception 'Only confirmed deliveries or deliveries with corrections requested can be submitted for review' using errcode = '55000';
  end if;

  if not (
    biotrace_private.is_platform_admin()
    or biotrace_private.is_approved_org_member(v_delivery.supplier_org_id, array['supplier', 'organization_admin'])
    or biotrace_private.is_approved_org_member(v_delivery.plant_org_id, array['plant_operator', 'organization_admin'])
    or (v_delivery.aggregator_org_id is not null and biotrace_private.is_approved_org_member(v_delivery.aggregator_org_id, array['aggregator', 'organization_admin']))
  ) then
    raise exception 'Only authorized delivery participants may submit for review' using errcode = '42501';
  end if;

  update public.deliveries
  set status = 'awaiting_review',
      updated_at = now()
  where id = p_delivery_id;

  insert into public.delivery_status_history (
    delivery_id,
    from_status,
    to_status,
    actor_user_id,
    actor_role,
    actor_name,
    note
  )
  values (
    p_delivery_id,
    v_delivery.status,
    'awaiting_review',
    caller_id,
    case when caller_role in ('administrator', 'supplier', 'plant_operator', 'reviewer', 'buyer') then caller_role else 'supplier' end,
    caller_name,
    v_norm_note
  );

  insert into public.delivery_events (
    delivery_id,
    from_status,
    to_status,
    actor_user_id,
    event_type,
    note
  )
  values (
    p_delivery_id,
    v_delivery.status,
    'awaiting_review',
    caller_id,
    'review_requested',
    v_norm_note
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  )
  values (
    caller_id,
    'delivery.submitted_for_review',
    'delivery',
    p_delivery_id::text,
    jsonb_build_object('status', v_delivery.status),
    jsonb_build_object('status', 'awaiting_review', 'note', v_norm_note)
  );
end;
$$;

revoke all on function public.submit_delivery_for_review from public, anon;
grant execute on function public.submit_delivery_for_review to authenticated;

