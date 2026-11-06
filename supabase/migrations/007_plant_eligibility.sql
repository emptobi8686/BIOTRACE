-- =============================================================================
-- BIOTRACE Migration 007: Plant Eligibility Files
-- =============================================================================
-- Adds:
--   1. 'credited' delivery status (additive ALTER on check constraint)
--   2. plant_eligibility_files table
--   3. RLS on plant_eligibility_files
--   4. assess_plant_eligibility() RPC (admin-only)
-- =============================================================================

-- ── 1. Add 'credited' to delivery status constraint ───────────────────────────
-- We must drop and recreate the check constraint because PostgreSQL does not
-- support ALTER CONSTRAINT … to change the expression.

alter table public.deliveries
  drop constraint if exists deliveries_status_check;

alter table public.deliveries
  add constraint deliveries_status_check
  check (status in (
    'pending_plant_confirmation',
    'confirmed',
    'disputed',
    'awaiting_review',
    'corrections_requested',
    'reviewed',
    'rejected',
    'credited'              -- ← new: assigned when delivery is included in an issued batch
  ));

-- Also update delivery_status_history to allow 'credited' as a to_status.
alter table public.delivery_status_history
  drop constraint if exists delivery_status_history_to_status_check;

alter table public.delivery_status_history
  add constraint delivery_status_history_to_status_check
  check (to_status in (
    'pending_plant_confirmation',
    'confirmed',
    'disputed',
    'awaiting_review',
    'corrections_requested',
    'reviewed',
    'rejected',
    'credited'
  ));

-- Sync delivery_events to match.
alter table public.delivery_events
  drop constraint if exists delivery_events_to_status_check;

alter table public.delivery_events
  add constraint delivery_events_to_status_check
  check (to_status in (
    'pending_plant_confirmation',
    'confirmed',
    'disputed',
    'awaiting_review',
    'corrections_requested',
    'reviewed',
    'rejected',
    'credited'
  ));


-- ── 2. plant_eligibility_files table ─────────────────────────────────────────

create table if not exists public.plant_eligibility_files (
  id                        uuid primary key default gen_random_uuid(),
  plant_org_id              uuid not null references public.organizations(id) on delete restrict,

  -- Assessment fields
  clinker_facility_exists   boolean,
  baseline_fuel_mix         text,
  first_alt_fuel_date       date,
  investment_evidence       text,

  -- Baseline biomass fate
  baseline_biomass_fate     text
    check (baseline_biomass_fate in ('dumped', 'burned_open', 'sold', 'other') or baseline_biomass_fate is null),
  baseline_fate_evidence    text,

  -- Status
  status                    text not null default 'not_assessed'
    check (status in ('not_assessed', 'eligible_simulated', 'blocked')),
  admin_note                text,

  -- Assessment tracking
  assessed_by               uuid references auth.users(id) on delete set null,
  assessed_at               timestamptz,

  -- Audit
  created_by                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  -- One eligibility file per plant
  unique (plant_org_id),

  -- Assessed_at only set when status is not not_assessed
  check (
    (status = 'not_assessed' and assessed_at is null)
    or (status in ('eligible_simulated', 'blocked') and assessed_at is not null and assessed_by is not null)
  )
);

create index if not exists plant_eligibility_files_org_idx
  on public.plant_eligibility_files (plant_org_id);

create index if not exists plant_eligibility_files_status_idx
  on public.plant_eligibility_files (status);


-- ── 3. RLS on plant_eligibility_files ────────────────────────────────────────

alter table public.plant_eligibility_files enable row level security;

-- Plant members can read their own eligibility file
create policy "eligibility_select_plant_members_or_admin" on public.plant_eligibility_files
for select to authenticated
using (
  biotrace_private.is_platform_admin()
  or biotrace_private.is_active_org_member(plant_org_id)
);

revoke all on table public.plant_eligibility_files from anon, authenticated;
grant select on table public.plant_eligibility_files to authenticated;


-- ── 4. assess_plant_eligibility() RPC ────────────────────────────────────────

create or replace function public.assess_plant_eligibility(
  p_plant_org_id              uuid,
  p_status                    text,
  p_clinker_facility_exists   boolean     default null,
  p_baseline_fuel_mix         text        default null,
  p_first_alt_fuel_date       date        default null,
  p_investment_evidence       text        default null,
  p_baseline_biomass_fate     text        default null,
  p_baseline_fate_evidence    text        default null,
  p_admin_note                text        default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id        uuid := auth.uid();
  v_norm_status    text := lower(btrim(p_status));
  v_eligibility_id uuid;
  v_org_type       text;
begin
  -- Auth guard
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  -- Admin-only
  if not biotrace_private.is_platform_admin() then
    raise exception 'Platform administrator access is required to assess plant eligibility'
      using errcode = '42501';
  end if;

  -- Validate status
  if v_norm_status not in ('not_assessed', 'eligible_simulated', 'blocked') then
    raise exception 'Status must be not_assessed, eligible_simulated, or blocked'
      using errcode = '22023';
  end if;

  -- Verify the organization is a cement plant
  select o.organization_type into v_org_type
  from public.organizations o
  where o.id = p_plant_org_id;

  if v_org_type is null then
    raise exception 'Plant organization was not found' using errcode = 'P0002';
  end if;

  if v_org_type <> 'cement_plant' then
    raise exception 'Eligibility files can only be created for cement plant organizations'
      using errcode = '22023';
  end if;

  -- Upsert eligibility file
  insert into public.plant_eligibility_files (
    plant_org_id,
    status,
    clinker_facility_exists,
    baseline_fuel_mix,
    first_alt_fuel_date,
    investment_evidence,
    baseline_biomass_fate,
    baseline_fate_evidence,
    admin_note,
    assessed_by,
    assessed_at,
    created_by
  )
  values (
    p_plant_org_id,
    v_norm_status,
    p_clinker_facility_exists,
    nullif(btrim(p_baseline_fuel_mix), ''),
    p_first_alt_fuel_date,
    nullif(btrim(p_investment_evidence), ''),
    nullif(btrim(p_baseline_biomass_fate), ''),
    nullif(btrim(p_baseline_fate_evidence), ''),
    nullif(btrim(p_admin_note), ''),
    case when v_norm_status <> 'not_assessed' then caller_id else null end,
    case when v_norm_status <> 'not_assessed' then now() else null end,
    caller_id
  )
  on conflict (plant_org_id) do update
    set status                  = excluded.status,
        clinker_facility_exists = excluded.clinker_facility_exists,
        baseline_fuel_mix       = excluded.baseline_fuel_mix,
        first_alt_fuel_date     = excluded.first_alt_fuel_date,
        investment_evidence     = excluded.investment_evidence,
        baseline_biomass_fate   = excluded.baseline_biomass_fate,
        baseline_fate_evidence  = excluded.baseline_fate_evidence,
        admin_note              = excluded.admin_note,
        assessed_by             = excluded.assessed_by,
        assessed_at             = excluded.assessed_at,
        updated_at              = now()
  returning id into v_eligibility_id;

  -- Audit log
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id,
    'plant_eligibility.' || v_norm_status,
    'plant_eligibility_file',
    v_eligibility_id::text,
    jsonb_build_object(
      'plant_org_id', p_plant_org_id,
      'status',       v_norm_status,
      'admin_note',   nullif(btrim(p_admin_note), '')
    )
  );

  return v_eligibility_id;
end;
$$;

revoke all on function public.assess_plant_eligibility from public, anon, authenticated;
grant execute on function public.assess_plant_eligibility to authenticated;

comment on table public.plant_eligibility_files is
  'One eligibility assessment record per cement plant. Status eligible_simulated is required to create an issuance batch. Eligibility is simulated and not assessed by a standards body.';
comment on function public.assess_plant_eligibility is
  'Admin-only RPC to create or update a plant eligibility assessment. Enforces admin check via biotrace_private.is_platform_admin().';
