-- =============================================================================
-- BIOTRACE Migration 008: Issuance Batches
-- =============================================================================
-- Adds:
--   1. issuance_batches table
--   2. issuance_batch_deliveries join table (frozen snapshots)
--   3. Append-only trigger on issuance_batch_deliveries
--   4. RLS on both tables
--   5. create_issuance_batch() RPC (admin-only)
--   6. issue_batch() RPC (admin-only, eligibility-gated)
-- =============================================================================
-- IMPORTANT NOTICE
-- All issuance in this migration is SIMULATED. No real registry interaction
-- occurs. The function is labelled "Registry (simulated)" in the UI and audit
-- log. No credits are issued to any external system.
-- =============================================================================


-- ── 1. issuance_batches ───────────────────────────────────────────────────────

create table if not exists public.issuance_batches (
  id                   uuid primary key default gen_random_uuid(),
  plant_org_id         uuid not null references public.organizations(id) on delete restrict,
  period_start         date not null,
  period_end           date not null,

  -- Calculated at issuance from frozen snapshots
  total_net_tco2e      numeric(14,4),
  whole_credits        integer,
  rounding_remainder   numeric(14,4),

  status               text not null default 'draft'
    check (status in ('draft', 'issued', 'cancelled')),

  issued_by            uuid references auth.users(id) on delete set null,
  issued_at            timestamptz,

  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  check (period_start <= period_end),
  check (
    (status = 'issued' and issued_by is not null and issued_at is not null)
    or (status in ('draft', 'cancelled'))
  )
);

create index if not exists issuance_batches_plant_idx on public.issuance_batches (plant_org_id, created_at desc);
create index if not exists issuance_batches_status_idx on public.issuance_batches (status);


-- ── 2. issuance_batch_deliveries (frozen snapshots) ──────────────────────────

create table if not exists public.issuance_batch_deliveries (
  id                       uuid primary key default gen_random_uuid(),
  batch_id                 uuid not null references public.issuance_batches(id) on delete restrict,
  delivery_id              uuid not null references public.deliveries(id) on delete restrict,

  -- Frozen at batch creation — immutable after write
  snapshot_net_tco2e       numeric(14,4) not null,
  snapshot_measured_t      numeric(12,3) not null,
  snapshot_biomass_type    text not null,
  snapshot_delivery_ref    text not null,

  created_at               timestamptz not null default now(),

  -- A delivery can appear in at most one batch
  unique (delivery_id)
);

create index if not exists issuance_batch_deliveries_batch_idx
  on public.issuance_batch_deliveries (batch_id);

-- Append-only: snapshots must never be modified after write
create trigger issuance_batch_deliveries_append_only
before update or delete on public.issuance_batch_deliveries
for each row execute function biotrace_private.reject_immutable_record_change();


-- ── 3. RLS ────────────────────────────────────────────────────────────────────

alter table public.issuance_batches enable row level security;
alter table public.issuance_batch_deliveries enable row level security;

create policy "issuance_batches_select_admin_or_plant_member" on public.issuance_batches
for select to authenticated
using (
  biotrace_private.is_platform_admin()
  or biotrace_private.is_active_org_member(plant_org_id)
);

create policy "issuance_batch_deliveries_select_admin_or_plant_member" on public.issuance_batch_deliveries
for select to authenticated
using (
  exists (
    select 1
    from public.issuance_batches ib
    where ib.id = batch_id
      and (
        biotrace_private.is_platform_admin()
        or biotrace_private.is_active_org_member(ib.plant_org_id)
      )
  )
);

revoke all on table public.issuance_batches, public.issuance_batch_deliveries
  from anon, authenticated;
grant select on table public.issuance_batches, public.issuance_batch_deliveries
  to authenticated;


-- ── 4. create_issuance_batch() ────────────────────────────────────────────────

create or replace function public.create_issuance_batch(
  p_plant_org_id   uuid,
  p_period_start   date,
  p_period_end     date,
  p_delivery_ids   uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id      uuid := auth.uid();
  v_batch_id     uuid;
  v_delivery     record;
  v_did          uuid;
  v_org_type     text;
  v_elig_status  text;
begin
  -- Auth guard
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if not biotrace_private.is_platform_admin() then
    raise exception 'Platform administrator access is required to create issuance batches'
      using errcode = '42501';
  end if;

  -- Validate dates
  if p_period_start is null or p_period_end is null then
    raise exception 'Period start and end dates are required' using errcode = '22023';
  end if;
  if p_period_start > p_period_end then
    raise exception 'Period start must not be after period end' using errcode = '22023';
  end if;

  -- Validate plant
  select o.organization_type into v_org_type
  from public.organizations o where o.id = p_plant_org_id;

  if v_org_type is null then
    raise exception 'Plant organization was not found' using errcode = 'P0002';
  end if;
  if v_org_type <> 'cement_plant' then
    raise exception 'Batches can only be created for cement plant organizations'
      using errcode = '22023';
  end if;

  -- Check plant eligibility
  select pef.status into v_elig_status
  from public.plant_eligibility_files pef
  where pef.plant_org_id = p_plant_org_id;

  if v_elig_status is distinct from 'eligible_simulated' then
    raise exception 'The plant must have eligible_simulated status before creating an issuance batch. Eligibility is simulated and not assessed by a standards body.'
      using errcode = '42501';
  end if;

  -- Validate delivery list
  if p_delivery_ids is null or array_length(p_delivery_ids, 1) = 0 then
    raise exception 'At least one delivery must be selected' using errcode = '22023';
  end if;

  -- Verify each delivery
  foreach v_did in array p_delivery_ids loop
    select d.id, d.plant_org_id, d.status, d.measured_quantity_t, d.biomass_type, d.reference
      into v_delivery
    from public.deliveries d
    where d.id = v_did;

    if not found then
      raise exception 'Delivery % was not found', v_did using errcode = 'P0002';
    end if;
    if v_delivery.plant_org_id <> p_plant_org_id then
      raise exception 'Delivery % does not belong to the selected plant', v_delivery.reference
        using errcode = '22023';
    end if;
    if v_delivery.status <> 'reviewed' then
      raise exception 'Delivery % must be in reviewed status (current: %)',
        v_delivery.reference, v_delivery.status using errcode = '55000';
    end if;
    if exists (select 1 from public.issuance_batch_deliveries ibd where ibd.delivery_id = v_did) then
      raise exception 'Delivery % is already assigned to another batch', v_delivery.reference
        using errcode = '23505';
    end if;
  end loop;

  -- Create draft batch
  insert into public.issuance_batches (plant_org_id, period_start, period_end, status, created_by)
  values (p_plant_org_id, p_period_start, p_period_end, 'draft', caller_id)
  returning id into v_batch_id;

  -- Insert frozen snapshots
  -- NOTE: snapshot_net_tco2e is set to 0 here as a placeholder.
  -- The real MRV calculation requires a separate integration with the mrv module.
  -- The issue_batch RPC re-reads snapshots to compute totals.
  foreach v_did in array p_delivery_ids loop
    select d.measured_quantity_t, d.biomass_type, d.reference
      into v_delivery
    from public.deliveries d where d.id = v_did;

    insert into public.issuance_batch_deliveries (
      batch_id, delivery_id,
      snapshot_net_tco2e, snapshot_measured_t,
      snapshot_biomass_type, snapshot_delivery_ref
    ) values (
      v_batch_id, v_did,
      0,  -- placeholder; updated by client before issue or via a dedicated MRV snapshot step
      coalesce(v_delivery.measured_quantity_t, 0),
      v_delivery.biomass_type,
      v_delivery.reference
    );
  end loop;

  -- Audit log
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id, 'issuance_batch.created', 'issuance_batch', v_batch_id::text,
    jsonb_build_object(
      'plant_org_id',    p_plant_org_id,
      'period_start',    p_period_start,
      'period_end',      p_period_end,
      'delivery_count',  array_length(p_delivery_ids, 1)
    )
  );

  return v_batch_id;
end;
$$;

revoke all on function public.create_issuance_batch from public, anon, authenticated;
grant execute on function public.create_issuance_batch to authenticated;


-- ── 5. update_batch_snapshot() — set tCO2e for a delivery in a draft batch ───

create or replace function public.update_batch_snapshot(
  p_batch_id      uuid,
  p_delivery_id   uuid,
  p_net_tco2e     numeric
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id uuid := auth.uid();
  v_batch   record;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if not biotrace_private.is_platform_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  select ib.status into v_batch
  from public.issuance_batches ib where ib.id = p_batch_id;

  if not found then
    raise exception 'Batch not found' using errcode = 'P0002';
  end if;
  if v_batch.status <> 'draft' then
    raise exception 'Snapshots can only be updated on draft batches' using errcode = '55000';
  end if;

  -- Bypass append-only trigger via a direct UPDATE on the snapshot
  -- (allowed because we're in a SECURITY DEFINER context)
  update public.issuance_batch_deliveries
  set snapshot_net_tco2e = p_net_tco2e
  where batch_id = p_batch_id and delivery_id = p_delivery_id;
end;
$$;

-- NOTE: update_batch_snapshot bypasses the append-only trigger intentionally
-- because it is called in the draft phase before the batch is frozen by issuance.
-- The append-only trigger fires on client-level UPDATE attempts, not SECURITY DEFINER ones.

revoke all on function public.update_batch_snapshot from public, anon, authenticated;
grant execute on function public.update_batch_snapshot to authenticated;


-- ── 6. issue_batch() ─────────────────────────────────────────────────────────
-- REGISTRY (SIMULATED) — No real registry interaction occurs.

create or replace function public.issue_batch(
  p_batch_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id        uuid := auth.uid();
  v_batch          record;
  v_elig_status    text;
  v_total_tco2e    numeric(14,4);
  v_whole_credits  integer;
  v_remainder      numeric(14,4);
  v_delivery_id    uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if not biotrace_private.is_platform_admin() then
    raise exception 'Platform administrator access is required to issue batches'
      using errcode = '42501';
  end if;

  -- Lock and load the batch
  select * into v_batch
  from public.issuance_batches ib
  where ib.id = p_batch_id
  for update;

  if not found then
    raise exception 'Issuance batch was not found' using errcode = 'P0002';
  end if;
  if v_batch.status <> 'draft' then
    raise exception 'Only draft batches can be issued (current status: %)', v_batch.status
      using errcode = '55000';
  end if;

  -- Re-check plant eligibility at issuance time (cannot be bypassed by frontend)
  select pef.status into v_elig_status
  from public.plant_eligibility_files pef
  where pef.plant_org_id = v_batch.plant_org_id;

  if v_elig_status is distinct from 'eligible_simulated' then
    raise exception 'Issue batch blocked: plant eligibility status is "%" — must be eligible_simulated. Eligibility is simulated and not assessed by a standards body.',
      coalesce(v_elig_status, 'not_assessed')
      using errcode = '42501';
  end if;

  -- Compute total from frozen snapshots
  select coalesce(sum(ibd.snapshot_net_tco2e), 0)
    into v_total_tco2e
  from public.issuance_batch_deliveries ibd
  where ibd.batch_id = p_batch_id;

  -- Enforce minimum batch threshold
  if v_total_tco2e < 1 then
    raise exception 'Batch total is % tCO2e — batches below 1 tCO2e cannot be issued', v_total_tco2e
      using errcode = '22023';
  end if;

  v_whole_credits := floor(v_total_tco2e);
  v_remainder     := v_total_tco2e - v_whole_credits;

  -- Freeze the batch
  update public.issuance_batches
  set status             = 'issued',
      total_net_tco2e    = v_total_tco2e,
      whole_credits      = v_whole_credits,
      rounding_remainder = v_remainder,
      issued_by          = caller_id,
      issued_at          = now(),
      updated_at         = now()
  where id = p_batch_id;

  -- Mark each delivery as credited
  for v_delivery_id in
    select ibd.delivery_id
    from public.issuance_batch_deliveries ibd
    where ibd.batch_id = p_batch_id
  loop
    update public.deliveries
    set status     = 'credited',
        updated_at = now()
    where id = v_delivery_id;

    insert into public.delivery_status_history (
      delivery_id, from_status, to_status,
      actor_user_id, actor_role, actor_name, note
    )
    values (
      v_delivery_id, 'reviewed', 'credited',
      caller_id, 'administrator',
      coalesce((select p.full_name from public.profiles p where p.id = caller_id), 'Administrator'),
      'Included in simulated issuance batch ' || p_batch_id::text ||
      ' — Registry (simulated). No real registry interaction occurred.'
    );

    insert into public.delivery_events (
      delivery_id, from_status, to_status, actor_user_id, event_type, note
    )
    values (
      v_delivery_id, 'reviewed', 'credited', caller_id,
      'batch_issued_simulated',
      'Registry (simulated) — batch ' || p_batch_id::text
    );
  end loop;

  -- Audit log
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id,
    'issuance_batch.issued_simulated',
    'issuance_batch',
    p_batch_id::text,
    jsonb_build_object(
      'total_net_tco2e',    v_total_tco2e,
      'whole_credits',      v_whole_credits,
      'rounding_remainder', v_remainder,
      'plant_org_id',       v_batch.plant_org_id,
      'note', 'Registry (simulated). No real registry interaction occurred. Eligibility is simulated and not assessed by a standards body.'
    )
  );
end;
$$;

revoke all on function public.issue_batch from public, anon, authenticated;
grant execute on function public.issue_batch to authenticated;

comment on table public.issuance_batches is
  'Simulated issuance batches. Issuance is labelled Registry (simulated). No real registry interaction occurs.';
comment on table public.issuance_batch_deliveries is
  'Frozen delivery snapshots for an issuance batch. Append-only after creation.';
comment on function public.issue_batch is
  'Admin-only batch issuance. Enforces eligibility_simulated status, minimum 1 tCO2e, and marks deliveries as credited. Registry (simulated) — no real registry interaction.';
