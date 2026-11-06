-- Extend the existing schema without replacing the original migration.
-- Client writes remain disabled until workflow operations are exposed through
-- transactional, authorization-checked database functions.

create schema if not exists biotrace_private;
revoke all on schema biotrace_private from public, anon;
grant usage on schema biotrace_private to authenticated;

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('administrator', 'supplier', 'aggregator', 'plant_operator', 'reviewer', 'buyer'));

alter table public.organization_memberships
  drop constraint if exists organization_memberships_role_check;
alter table public.organization_memberships
  add constraint organization_memberships_role_check
  check (role in ('administrator', 'organization_admin', 'supplier', 'aggregator', 'plant_operator', 'reviewer', 'buyer'));

alter table public.deliveries
  add column if not exists aggregator_org_id uuid references public.organizations(id) on delete restrict,
  add column if not exists destination_facility_id uuid;

create table if not exists public.organization_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  decision_reason text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  check (
    (status = 'pending' and reviewed_by is null and decided_at is null)
    or (status <> 'pending' and reviewed_by is not null and decided_at is not null)
  )
);
create index if not exists organization_verifications_org_idx
  on public.organization_verifications (organization_id, submitted_at desc);

create table if not exists public.organization_verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.organization_verifications(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text not null unique,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists organization_verification_documents_verification_idx
  on public.organization_verification_documents (verification_id);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  address text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists facilities_organization_idx
  on public.facilities (organization_id);

create table if not exists public.facility_memberships (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (facility_id, user_id)
);
create index if not exists facility_memberships_user_idx
  on public.facility_memberships (user_id, is_active);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'deliveries_destination_facility_id_fkey'
  ) then
    alter table public.deliveries
      add constraint deliveries_destination_facility_id_fkey
      foreign key (destination_facility_id) references public.facilities(id) on delete restrict;
  end if;
end
$$;

create table if not exists public.reviewer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  accreditation_status text not null default 'unverified'
    check (accreditation_status in ('unverified', 'pending', 'verified', 'rejected')),
  accreditation_reference text,
  conflict_declaration_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviewer_profiles_organization_idx
  on public.reviewer_profiles (organization_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'active', 'rejected', 'paused')),
  buyer_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_organization_idx
  on public.projects (organization_id);
create index if not exists projects_buyer_visibility_idx
  on public.projects (buyer_visible) where buyer_visible;

create table if not exists public.plant_confirmations (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  facility_id uuid not null references public.facilities(id) on delete restrict,
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('confirmed', 'disputed')),
  measured_quantity_t numeric(12,3) not null check (measured_quantity_t > 0),
  dispute_reason text,
  evidence_file_id uuid references public.evidence_files(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (decision <> 'disputed' or nullif(btrim(dispute_reason), '') is not null)
);
create index if not exists plant_confirmations_delivery_idx
  on public.plant_confirmations (delivery_id, created_at desc);

create table if not exists public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  reviewer_user_id uuid not null references public.reviewer_profiles(user_id) on delete restrict,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'assigned'
    check (status in ('assigned', 'completed', 'cancelled')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'completed') = (completed_at is not null)),
  unique (delivery_id, reviewer_user_id, assigned_at)
);
create index if not exists review_assignments_reviewer_idx
  on public.review_assignments (reviewer_user_id, status);
create index if not exists review_assignments_delivery_idx
  on public.review_assignments (delivery_id);

create table if not exists public.reviewer_conflicts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  reviewer_user_id uuid not null references public.reviewer_profiles(user_id) on delete restrict,
  reason text not null check (length(btrim(reason)) > 0),
  disclosed_at timestamptz not null default now(),
  unique (delivery_id, reviewer_user_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.review_assignments(id) on delete restrict,
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  reviewer_user_id uuid not null references public.reviewer_profiles(user_id) on delete restrict,
  decision text not null check (decision in ('approved', 'corrections_requested', 'rejected')),
  note text not null check (length(btrim(note)) > 0),
  created_at timestamptz not null default now(),
  unique (assignment_id)
);
create index if not exists reviews_delivery_idx on public.reviews (delivery_id, created_at desc);

create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  from_status text,
  to_status text not null
    check (to_status in ('pending_plant_confirmation', 'confirmed', 'disputed', 'awaiting_review', 'corrections_requested', 'reviewed', 'rejected')),
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (from_status is null or from_status <> to_status)
);
create index if not exists delivery_events_delivery_idx
  on public.delivery_events (delivery_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now()
);

create or replace function biotrace_private.reject_immutable_record_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Records in %.% are append-only', tg_table_schema, tg_table_name
    using errcode = '55000';
end;
$$;

create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function biotrace_private.reject_immutable_record_change();
create trigger delivery_events_append_only
before update or delete on public.delivery_events
for each row execute function biotrace_private.reject_immutable_record_change();
create trigger delivery_status_history_append_only
before update or delete on public.delivery_status_history
for each row execute function biotrace_private.reject_immutable_record_change();
create trigger review_decisions_append_only
before update or delete on public.review_decisions
for each row execute function biotrace_private.reject_immutable_record_change();
create trigger reviews_append_only
before update or delete on public.reviews
for each row execute function biotrace_private.reject_immutable_record_change();
create trigger plant_confirmations_append_only
before update or delete on public.plant_confirmations
for each row execute function biotrace_private.reject_immutable_record_change();
create trigger reviewer_conflicts_append_only
before update or delete on public.reviewer_conflicts
for each row execute function biotrace_private.reject_immutable_record_change();

create or replace function biotrace_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = auth.uid()
  );
$$;

create or replace function biotrace_private.is_active_org_member(target_org_id uuid, allowed_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.is_active
      and (allowed_roles is null or om.role = any (allowed_roles))
  );
$$;

create or replace function biotrace_private.is_approved_org_member(target_org_id uuid, allowed_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select biotrace_private.is_active_org_member(target_org_id, allowed_roles)
    and exists (
      select 1
      from public.organization_verifications ov
      where ov.organization_id = target_org_id
        and ov.status = 'approved'
        and not exists (
          select 1
          from public.organization_verifications newer
          where newer.organization_id = ov.organization_id
            and (newer.submitted_at, newer.id) > (ov.submitted_at, ov.id)
        )
    );
$$;

create or replace function biotrace_private.is_assigned_to_facility(target_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.facility_memberships fm
    join public.facilities f on f.id = fm.facility_id
    where fm.facility_id = target_facility_id
      and fm.user_id = auth.uid()
      and fm.is_active
      and biotrace_private.is_approved_org_member(f.organization_id, array['plant_operator'])
  );
$$;

create or replace function biotrace_private.is_facility_admin(target_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.facilities f
    where f.id = target_facility_id
      and biotrace_private.is_active_org_member(f.organization_id, array['organization_admin'])
  );
$$;

create or replace function biotrace_private.can_access_facility(target_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.facilities f
    where f.id = target_facility_id
      and (
        biotrace_private.is_platform_admin()
        or biotrace_private.is_facility_admin(f.id)
        or biotrace_private.is_assigned_to_facility(f.id)
      )
  );
$$;

create or replace function biotrace_private.is_assigned_reviewer(target_delivery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.review_assignments ra
    join public.reviewer_profiles rp on rp.user_id = ra.reviewer_user_id
    join public.deliveries d on d.id = ra.delivery_id
    where ra.delivery_id = target_delivery_id
      and ra.reviewer_user_id = auth.uid()
      and ra.status in ('assigned', 'completed')
      and rp.accreditation_status = 'verified'
      and rp.conflict_declaration_signed_at is not null
      and biotrace_private.is_approved_org_member(rp.organization_id, array['reviewer'])
      and rp.organization_id <> d.supplier_org_id
      and (d.aggregator_org_id is null or rp.organization_id <> d.aggregator_org_id)
      and rp.organization_id <> d.plant_org_id
      and d.created_by is distinct from ra.reviewer_user_id
      and not exists (
        select 1
        from public.reviewer_conflicts rc
        where rc.delivery_id = ra.delivery_id
          and rc.reviewer_user_id = ra.reviewer_user_id
      )
  );
$$;

create or replace function biotrace_private.can_access_delivery(target_delivery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.deliveries d
    where d.id = target_delivery_id
      and (
        biotrace_private.is_platform_admin()
        or biotrace_private.is_approved_org_member(d.supplier_org_id, array['supplier', 'organization_admin'])
        or biotrace_private.is_approved_org_member(d.aggregator_org_id, array['aggregator', 'organization_admin'])
        or biotrace_private.is_approved_org_member(d.plant_org_id, array['organization_admin'])
        or biotrace_private.is_assigned_to_facility(d.destination_facility_id)
        or biotrace_private.is_assigned_reviewer(d.id)
      )
  );
$$;

revoke all on function biotrace_private.reject_immutable_record_change() from public, anon;
grant execute on function biotrace_private.reject_immutable_record_change() to authenticated;
revoke all on function biotrace_private.is_platform_admin() from public, anon;
revoke all on function biotrace_private.is_active_org_member(uuid, text[]) from public, anon;
revoke all on function biotrace_private.is_approved_org_member(uuid, text[]) from public, anon;
revoke all on function biotrace_private.is_assigned_to_facility(uuid) from public, anon;
revoke all on function biotrace_private.is_facility_admin(uuid) from public, anon;
revoke all on function biotrace_private.can_access_facility(uuid) from public, anon;
revoke all on function biotrace_private.is_assigned_reviewer(uuid) from public, anon;
revoke all on function biotrace_private.can_access_delivery(uuid) from public, anon;
grant execute on function biotrace_private.is_platform_admin() to authenticated;
grant execute on function biotrace_private.is_active_org_member(uuid, text[]) to authenticated;
grant execute on function biotrace_private.is_approved_org_member(uuid, text[]) to authenticated;
grant execute on function biotrace_private.is_assigned_to_facility(uuid) to authenticated;
grant execute on function biotrace_private.is_facility_admin(uuid) to authenticated;
grant execute on function biotrace_private.can_access_facility(uuid) to authenticated;
grant execute on function biotrace_private.is_assigned_reviewer(uuid) to authenticated;
grant execute on function biotrace_private.can_access_delivery(uuid) to authenticated;

alter table public.organization_verifications enable row level security;
alter table public.organization_verification_documents enable row level security;
alter table public.facilities enable row level security;
alter table public.facility_memberships enable row level security;
alter table public.reviewer_profiles enable row level security;
alter table public.reviewer_conflicts enable row level security;
alter table public.projects enable row level security;
alter table public.plant_confirmations enable row level security;
alter table public.review_assignments enable row level security;
alter table public.reviews enable row level security;
alter table public.delivery_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_admins enable row level security;

drop policy if exists "profiles_are_visible_to_own_user" on public.profiles;
drop policy if exists "profiles_are_manageable_by_self" on public.profiles;
drop policy if exists "organizations_are_visible_to_members" on public.organizations;
drop policy if exists "memberships_are_visible_to_members" on public.organization_memberships;
drop policy if exists "delivery_access_is_org_scoped" on public.deliveries;
drop policy if exists "delivery_writes_are_limited_to_org_members" on public.deliveries;
drop policy if exists "review_decisions_are_viewable_by_authorized_actors" on public.review_decisions;
drop policy if exists "review_decisions_are_append_only" on public.review_decisions;
drop policy if exists "reviewer_self_review_is_blocked_by_application_logic" on public.review_decisions;
drop policy if exists "status_history_is_readable_for_authorized_users" on public.delivery_status_history;
drop policy if exists "evidence_access_restricted_to_org_and_reviewers" on public.evidence_files;

create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or biotrace_private.is_platform_admin());
create policy "profiles_update_own_name" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "organizations_select_members_or_admin" on public.organizations
for select to authenticated
using (biotrace_private.is_active_org_member(id) or biotrace_private.is_platform_admin());
create policy "memberships_select_self_org_admin_or_platform_admin" on public.organization_memberships
for select to authenticated
using (
  user_id = auth.uid()
  or biotrace_private.is_active_org_member(organization_id, array['organization_admin'])
  or biotrace_private.is_platform_admin()
);

create policy "deliveries_select_authorized_participants" on public.deliveries
for select to authenticated
using (biotrace_private.can_access_delivery(id));
create policy "evidence_select_authorized_delivery_participants" on public.evidence_files
for select to authenticated
using (biotrace_private.can_access_delivery(delivery_id));
create policy "reviews_select_authorized_delivery_participants" on public.review_decisions
for select to authenticated
using (biotrace_private.can_access_delivery(delivery_id));
create policy "delivery_history_select_authorized_participants" on public.delivery_status_history
for select to authenticated
using (biotrace_private.can_access_delivery(delivery_id));

create policy "verifications_select_org_members_or_admin" on public.organization_verifications
for select to authenticated
using (biotrace_private.is_active_org_member(organization_id) or biotrace_private.is_platform_admin());
create policy "verification_documents_select_org_members_or_admin" on public.organization_verification_documents
for select to authenticated
using (
  exists (
    select 1
    from public.organization_verifications ov
    where ov.id = verification_id
      and (biotrace_private.is_active_org_member(ov.organization_id) or biotrace_private.is_platform_admin())
  )
);
create policy "facilities_select_org_members_or_admin" on public.facilities
for select to authenticated
using (biotrace_private.can_access_facility(id));
create policy "facility_memberships_select_self_org_admin_or_platform_admin" on public.facility_memberships
for select to authenticated
using (
  user_id = auth.uid()
  or biotrace_private.is_facility_admin(facility_id)
  or biotrace_private.is_platform_admin()
);

create policy "reviewer_profiles_select_self_or_admin" on public.reviewer_profiles
for select to authenticated
using (user_id = auth.uid() or biotrace_private.is_platform_admin());
create policy "reviewer_conflicts_select_participants_or_admin" on public.reviewer_conflicts
for select to authenticated
using (
  reviewer_user_id = auth.uid()
  or biotrace_private.is_platform_admin()
  or biotrace_private.can_access_delivery(delivery_id)
);

create policy "projects_select_owner_buyer_or_admin" on public.projects
for select to authenticated
using (
  biotrace_private.is_platform_admin()
  or biotrace_private.is_approved_org_member(organization_id)
  or (
    status in ('approved', 'active')
    and
    buyer_visible
    and exists (
      select 1 from public.organization_memberships om
      where om.user_id = auth.uid()
        and biotrace_private.is_approved_org_member(om.organization_id, array['buyer'])
    )
  )
);
create policy "plant_confirmations_select_delivery_participants" on public.plant_confirmations
for select to authenticated
using (biotrace_private.can_access_delivery(delivery_id));
create policy "review_assignments_select_delivery_participants" on public.review_assignments
for select to authenticated
using (
  (reviewer_user_id = auth.uid() and biotrace_private.is_assigned_reviewer(delivery_id))
  or biotrace_private.can_access_delivery(delivery_id)
);
create policy "reviews_select_delivery_participants" on public.reviews
for select to authenticated
using (biotrace_private.can_access_delivery(delivery_id));
create policy "delivery_events_select_delivery_participants" on public.delivery_events
for select to authenticated
using (biotrace_private.can_access_delivery(delivery_id));
create policy "audit_logs_select_platform_admins" on public.audit_logs
for select to authenticated
using (biotrace_private.is_platform_admin());
create policy "platform_admins_select_self_or_admin" on public.platform_admins
for select to authenticated
using (user_id = auth.uid() or biotrace_private.is_platform_admin());

revoke all on table
  public.profiles,
  public.organizations,
  public.organization_memberships,
  public.deliveries,
  public.evidence_files,
  public.review_decisions,
  public.delivery_status_history
from anon, authenticated;
grant select on table
  public.profiles,
  public.organizations,
  public.organization_memberships,
  public.deliveries,
  public.evidence_files,
  public.review_decisions,
  public.delivery_status_history
to authenticated;
grant update (full_name) on table public.profiles to authenticated;

revoke all on table
  public.organization_verifications,
  public.organization_verification_documents,
  public.facilities,
  public.facility_memberships,
  public.reviewer_profiles,
  public.reviewer_conflicts,
  public.projects,
  public.plant_confirmations,
  public.review_assignments,
  public.reviews,
  public.delivery_events,
  public.audit_logs,
  public.platform_admins
from anon, authenticated;
grant select on table
  public.organization_verifications,
  public.organization_verification_documents,
  public.facilities,
  public.facility_memberships,
  public.reviewer_profiles,
  public.reviewer_conflicts,
  public.projects,
  public.plant_confirmations,
  public.review_assignments,
  public.reviews,
  public.delivery_events,
  public.audit_logs,
  public.platform_admins
to authenticated;

comment on table public.organization_verifications is
  'Versioned organization verification submissions and administrator decisions.';
comment on table public.reviewer_profiles is
  'Reviewer-firm affiliation and accreditation evidence; values are not certification claims.';
comment on table public.reviews is
  'Review decisions linked to an assignment; writes are reserved for a transactional workflow function.';
comment on table public.audit_logs is
  'Append-only administrative audit records; authenticated clients have read-only access.';
comment on table public.platform_admins is
  'Trusted platform administrator assignments; never writable by public or authenticated clients.';
