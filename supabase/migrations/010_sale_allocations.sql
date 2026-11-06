-- =============================================================================
-- BIOTRACE Migration 010: Sale Allocation Records
-- =============================================================================
-- Adds:
--   1. sale_allocation_records table
--   2. Append-only trigger
--   3. RLS
--   4. create_sale_allocations() RPC (admin-only, called after issue_batch)
-- =============================================================================
-- ALL ALLOCATION FIGURES ARE PLACEHOLDER SIMULATIONS.
-- No real money has been or will be transferred.
-- Reviewers are explicitly excluded as payout beneficiaries.
-- Payee types are: plant (project owner), supplier (delivery tonnes basis), platform.
-- =============================================================================


-- ── 1. sale_allocation_records ────────────────────────────────────────────────

create table if not exists public.sale_allocation_records (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references public.issuance_batches(id) on delete restrict,

  -- Who receives (plant, supplier, or platform)
  payee_type       text not null
    check (payee_type in ('plant', 'supplier', 'platform')),
  payee_org_id     uuid references public.organizations(id) on delete restrict,
  -- payee_org_id is null for 'platform' payee type

  -- Basis
  allocation_basis text not null,
    -- e.g. 'project_owner', 'delivery_tonnes', 'platform_fee'
  basis_value      numeric(14,4),
    -- tonnes for suppliers, percentage for others

  -- Amount — PLACEHOLDER
  amount           numeric(14,2) not null default 0,
  currency         text not null default 'NGN',

  -- Always simulated — no real payment
  status           text not null default 'simulated'
    check (status = 'simulated'),

  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists sale_allocation_records_batch_idx
  on public.sale_allocation_records (batch_id);

create index if not exists sale_allocation_records_payee_idx
  on public.sale_allocation_records (payee_org_id)
  where payee_org_id is not null;

-- Append-only: allocation records must never be modified
create trigger sale_allocation_records_append_only
before update or delete on public.sale_allocation_records
for each row execute function biotrace_private.reject_immutable_record_change();


-- ── 2. RLS ────────────────────────────────────────────────────────────────────

alter table public.sale_allocation_records enable row level security;

create policy "sale_allocations_select_admin_or_participant" on public.sale_allocation_records
for select to authenticated
using (
  biotrace_private.is_platform_admin()
  or (payee_org_id is not null and biotrace_private.is_active_org_member(payee_org_id))
  or exists (
    select 1 from public.issuance_batches ib
    where ib.id = batch_id
      and biotrace_private.is_active_org_member(ib.plant_org_id)
  )
);

revoke all on table public.sale_allocation_records from anon, authenticated;
grant select on table public.sale_allocation_records to authenticated;


-- ── 3. create_sale_allocations() ─────────────────────────────────────────────

create or replace function public.create_sale_allocations(
  p_batch_id              uuid,
  p_plant_amount          numeric,
  p_platform_amount       numeric,
  p_platform_fee_pct      numeric  default 0.10,  -- 10% placeholder
  p_per_supplier_amounts  jsonb    default null
  -- e.g. '[{"org_id": "uuid", "amount": 5000, "basis_value": 42.5}]'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id     uuid := auth.uid();
  v_batch       record;
  v_supplier    jsonb;
  v_org_id      uuid;
  v_amount      numeric;
  v_basis       numeric;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if not biotrace_private.is_platform_admin() then
    raise exception 'Administrator access is required to create allocation records'
      using errcode = '42501';
  end if;

  -- Load the batch
  select * into v_batch from public.issuance_batches ib where ib.id = p_batch_id;
  if not found then
    raise exception 'Issuance batch not found' using errcode = 'P0002';
  end if;
  if v_batch.status <> 'issued' then
    raise exception 'Allocation records can only be created for issued batches (current: %)',
      v_batch.status using errcode = '55000';
  end if;

  -- Check no allocations already exist for this batch
  if exists (select 1 from public.sale_allocation_records sar where sar.batch_id = p_batch_id) then
    raise exception 'Allocation records already exist for this batch' using errcode = '23505';
  end if;

  -- Plant allocation (project owner)
  insert into public.sale_allocation_records (
    batch_id, payee_type, payee_org_id,
    allocation_basis, basis_value, amount, currency, created_by
  ) values (
    p_batch_id, 'plant', v_batch.plant_org_id,
    'project_owner', null,
    coalesce(p_plant_amount, 0), 'NGN', caller_id
  );

  -- Platform fee
  insert into public.sale_allocation_records (
    batch_id, payee_type, payee_org_id,
    allocation_basis, basis_value, amount, currency, created_by
  ) values (
    p_batch_id, 'platform', null,
    'platform_fee', coalesce(p_platform_fee_pct, 0.10),
    coalesce(p_platform_amount, 0), 'NGN', caller_id
  );

  -- Per-supplier allocations
  if p_per_supplier_amounts is not null then
    for v_supplier in select * from jsonb_array_elements(p_per_supplier_amounts)
    loop
      v_org_id := (v_supplier->>'org_id')::uuid;
      v_amount := (v_supplier->>'amount')::numeric;
      v_basis  := (v_supplier->>'basis_value')::numeric;

      insert into public.sale_allocation_records (
        batch_id, payee_type, payee_org_id,
        allocation_basis, basis_value, amount, currency, created_by
      ) values (
        p_batch_id, 'supplier', v_org_id,
        'delivery_tonnes', v_basis,
        coalesce(v_amount, 0), 'NGN', caller_id
      );
    end loop;
  end if;

  -- Audit log
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id, 'sale_allocations.created', 'issuance_batch', p_batch_id::text,
    jsonb_build_object(
      'batch_id',        p_batch_id,
      'plant_amount',    p_plant_amount,
      'platform_amount', p_platform_amount,
      'note', 'ALL FIGURES ARE PLACEHOLDER SIMULATIONS. No real money transferred. Reviewer not included as beneficiary.'
    )
  );
end;
$$;

revoke all on function public.create_sale_allocations from public, anon, authenticated;
grant execute on function public.create_sale_allocations to authenticated;

comment on table public.sale_allocation_records is
  'Simulated sale allocation records. status is always "simulated". No real payments occur. Reviewers are not included as payout beneficiaries. All amounts are placeholder values.';
comment on function public.create_sale_allocations is
  'Admin-only RPC to create placeholder sale allocation records for an issued batch. Reviewers are explicitly excluded as beneficiaries.';
