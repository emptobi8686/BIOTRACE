-- =============================================================================
-- BIOTRACE Migration 009: Review Fees
-- =============================================================================
-- Adds:
--   1. review_fee_settings table (latest row = current fee)
--   2. review_fee_snapshots table (fee locked per review)
--   3. RLS on both tables
--   4. set_review_fee() RPC (admin-only)
--   5. record_review() RPC — records a review decision AND locks the fee snapshot
-- =============================================================================
-- IMPORTANT:
--   - The cement plant pays the review fee.
--   - Fees are independent of the review decision.
--   - Reviewers do not receive a percentage of credit sales.
--   - Payment records are simulated — no real payment processing occurs.
-- =============================================================================


-- ── 1. review_fee_settings ────────────────────────────────────────────────────

create table if not exists public.review_fee_settings (
  id             uuid primary key default gen_random_uuid(),
  fee_amount     numeric(12,2) not null check (fee_amount >= 0),
  currency       text not null default 'NGN',
  effective_from timestamptz not null default now(),
  set_by         uuid not null references auth.users(id) on delete restrict,
  created_at     timestamptz not null default now()
);

create index if not exists review_fee_settings_effective_idx
  on public.review_fee_settings (effective_from desc);

-- Append-only: fee history must be preserved
create trigger review_fee_settings_append_only
before update or delete on public.review_fee_settings
for each row execute function biotrace_private.reject_immutable_record_change();


-- ── 2. review_fee_snapshots ───────────────────────────────────────────────────

create table if not exists public.review_fee_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  delivery_id         uuid not null references public.deliveries(id) on delete restrict,
  review_id           uuid references public.reviews(id) on delete restrict,
  fee_setting_id      uuid references public.review_fee_settings(id) on delete restrict,

  -- Frozen fee at review start
  fee_amount          numeric(12,2) not null,
  currency            text not null default 'NGN',

  -- Payer: the cement plant
  payer_org_id        uuid references public.organizations(id) on delete restrict,

  -- Payment status — simulated only
  status              text not null default 'pending'
    check (status in ('pending', 'simulated_paid')),

  snapshot_at         timestamptz not null default now(),
  created_at          timestamptz not null default now(),

  unique (delivery_id, review_id)
);

create index if not exists review_fee_snapshots_delivery_idx
  on public.review_fee_snapshots (delivery_id);

-- Append-only: historical fee records must be preserved
create trigger review_fee_snapshots_append_only
before update or delete on public.review_fee_snapshots
for each row execute function biotrace_private.reject_immutable_record_change();


-- ── 3. RLS ────────────────────────────────────────────────────────────────────

alter table public.review_fee_settings enable row level security;
alter table public.review_fee_snapshots enable row level security;

create policy "review_fee_settings_select_admin_or_authenticated" on public.review_fee_settings
for select to authenticated
using (biotrace_private.is_platform_admin() or auth.uid() is not null);
-- All authenticated users can read current fee settings (transparency)

create policy "review_fee_snapshots_select_admin_or_plant" on public.review_fee_snapshots
for select to authenticated
using (
  biotrace_private.is_platform_admin()
  or (payer_org_id is not null and biotrace_private.is_active_org_member(payer_org_id))
  or biotrace_private.can_access_delivery(delivery_id)
);

revoke all on table public.review_fee_settings, public.review_fee_snapshots
  from anon, authenticated;
grant select on table public.review_fee_settings, public.review_fee_snapshots
  to authenticated;


-- ── 4. set_review_fee() ───────────────────────────────────────────────────────

create or replace function public.set_review_fee(
  p_fee_amount numeric,
  p_currency   text default 'NGN'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id  uuid := auth.uid();
  v_fee_id   uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if not biotrace_private.is_platform_admin() then
    raise exception 'Platform administrator access is required to set review fees'
      using errcode = '42501';
  end if;
  if p_fee_amount is null or p_fee_amount < 0 then
    raise exception 'Fee amount must be zero or a positive number' using errcode = '22023';
  end if;
  if p_currency is null or length(btrim(p_currency)) <> 3 then
    raise exception 'Currency must be a 3-character ISO 4217 code' using errcode = '22023';
  end if;

  insert into public.review_fee_settings (fee_amount, currency, set_by)
  values (p_fee_amount, upper(btrim(p_currency)), caller_id)
  returning id into v_fee_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id, 'review_fee.set', 'review_fee_setting', v_fee_id::text,
    jsonb_build_object('fee_amount', p_fee_amount, 'currency', upper(btrim(p_currency)))
  );

  return v_fee_id;
end;
$$;

revoke all on function public.set_review_fee from public, anon, authenticated;
grant execute on function public.set_review_fee to authenticated;


-- ── 5. record_review() ───────────────────────────────────────────────────────
-- Records a review decision AND atomically locks a fee snapshot for the plant.

create or replace function public.record_review(
  p_delivery_id uuid,
  p_decision    text,
  p_note        text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id         uuid := auth.uid();
  v_reviewer_name   text;
  v_delivery        record;
  v_assignment      record;
  v_review_id       uuid;
  v_norm_decision   text := lower(btrim(p_decision));
  v_norm_note       text := nullif(btrim(p_note), '');
  v_fee_setting     record;
  v_fee_id          uuid;
  v_new_status      text;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  -- Load reviewer name
  select coalesce(nullif(btrim(p.full_name), ''), u.email, 'Reviewer')
    into v_reviewer_name
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = caller_id;

  -- Validate decision
  if v_norm_decision not in ('approved', 'corrections_requested', 'rejected') then
    raise exception 'Decision must be approved, corrections_requested, or rejected'
      using errcode = '22023';
  end if;

  if v_norm_note is null or length(v_norm_note) < 10 then
    raise exception 'Decision note must be at least 10 characters' using errcode = '22023';
  end if;

  -- Load and lock delivery
  select * into v_delivery
  from public.deliveries d
  where d.id = p_delivery_id
  for update;

  if not found then
    raise exception 'Delivery not found' using errcode = 'P0002';
  end if;

  if v_delivery.status not in ('awaiting_review', 'corrections_requested') then
    raise exception 'Only deliveries awaiting review or with corrections requested can be reviewed (current: %)',
      v_delivery.status using errcode = '55000';
  end if;

  -- Authorization: caller must be an assigned reviewer for this delivery
  if not (biotrace_private.is_platform_admin() or biotrace_private.is_assigned_reviewer(p_delivery_id)) then
    raise exception 'Caller is not an assigned reviewer for this delivery'
      using errcode = '42501';
  end if;

  -- Find the assignment
  select * into v_assignment
  from public.review_assignments ra
  where ra.delivery_id = p_delivery_id
    and ra.reviewer_user_id = caller_id
    and ra.status = 'assigned'
  order by ra.assigned_at desc
  limit 1;

  if not found and not biotrace_private.is_platform_admin() then
    raise exception 'No active review assignment found for this delivery'
      using errcode = 'P0002';
  end if;

  -- Record the review decision
  insert into public.reviews (
    assignment_id, delivery_id, reviewer_user_id, decision, note
  )
  values (
    v_assignment.id,
    p_delivery_id,
    caller_id,
    v_norm_decision,
    v_norm_note
  )
  returning id into v_review_id;

  -- Determine new delivery status
  v_new_status := case v_norm_decision
    when 'approved'               then 'reviewed'
    when 'corrections_requested'  then 'corrections_requested'
    when 'rejected'               then 'rejected'
  end;

  -- Update delivery status
  update public.deliveries
  set status = v_new_status, updated_at = now()
  where id = p_delivery_id;

  -- Mark assignment complete if approved or rejected
  if v_assignment.id is not null and v_norm_decision in ('approved', 'rejected') then
    update public.review_assignments
    set status = 'completed', completed_at = now()
    where id = v_assignment.id;
  end if;

  -- Status history entry
  insert into public.delivery_status_history (
    delivery_id, from_status, to_status, actor_user_id, actor_role, actor_name, note
  )
  values (
    p_delivery_id, v_delivery.status, v_new_status,
    caller_id, 'reviewer', v_reviewer_name, v_norm_note
  );

  -- Delivery event
  insert into public.delivery_events (
    delivery_id, from_status, to_status, actor_user_id, event_type, note
  )
  values (
    p_delivery_id, v_delivery.status, v_new_status, caller_id,
    'review_decision_' || v_norm_decision, v_norm_note
  );

  -- ── Fee snapshot: lock current fee against this review ──────────────────
  -- Retrieve the most recent fee setting at or before now
  select * into v_fee_setting
  from public.review_fee_settings rfs
  order by rfs.effective_from desc
  limit 1;

  if found then
    insert into public.review_fee_snapshots (
      delivery_id, review_id, fee_setting_id,
      fee_amount, currency, payer_org_id, status
    )
    values (
      p_delivery_id, v_review_id, v_fee_setting.id,
      v_fee_setting.fee_amount, v_fee_setting.currency,
      v_delivery.plant_org_id,
      'pending'  -- simulated — no real payment
    )
    returning id into v_fee_id;
  end if;

  -- Audit log
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id, 'delivery.review_recorded', 'delivery', p_delivery_id::text,
    jsonb_build_object(
      'decision',     v_norm_decision,
      'new_status',   v_new_status,
      'review_id',    v_review_id,
      'fee_snapshot', v_fee_id,
      'fee_amount',   v_fee_setting.fee_amount
    )
  );

  return v_review_id;
end;
$$;

revoke all on function public.record_review from public, anon, authenticated;
grant execute on function public.record_review to authenticated;

comment on table public.review_fee_settings is
  'Append-only fee settings. Latest row is the current fee. The cement plant pays the fee.';
comment on table public.review_fee_snapshots is
  'Fee locked at review time. Append-only. Payment status is simulated — no real payment processing.';
comment on function public.record_review is
  'Records review decision and atomically creates a fee snapshot. Reviewers do not receive a percentage of sales.';
