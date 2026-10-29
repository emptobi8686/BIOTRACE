-- BIOTRACE schema for milestone 3
-- This migration is intentionally versioned and does not reset an existing project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('administrator', 'supplier', 'plant_operator', 'reviewer', 'buyer')),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text not null default 'supplier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('administrator', 'supplier', 'plant_operator', 'reviewer', 'buyer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_memberships_user_idx
  on public.organization_memberships (user_id);

create index if not exists organization_memberships_org_idx
  on public.organization_memberships (organization_id);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  supplier_org_id uuid not null references public.organizations(id) on delete restrict,
  supplier_name text not null,
  plant_org_id uuid not null references public.organizations(id) on delete restrict,
  plant_name text not null,
  biomass_type text not null,
  origin_location text not null,
  declared_quantity_t numeric(12,3) not null check (declared_quantity_t > 0),
  unit text not null default 't' check (unit = 't'),
  delivery_date date not null,
  vehicle_reference text,
  notes text default '',
  status text not null check (status in ('pending_plant_confirmation', 'confirmed', 'disputed', 'awaiting_review', 'corrections_requested', 'reviewed', 'rejected')),
  measured_quantity_t numeric(12,3),
  discrepancy_note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deliveries_status_idx on public.deliveries (status);
create index if not exists deliveries_supplier_org_idx on public.deliveries (supplier_org_id);
create index if not exists deliveries_plant_org_idx on public.deliveries (plant_org_id);

create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  kind text not null check (kind in ('delivery_note', 'weighing_ticket', 'photo', 'transport_doc', 'other')),
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_files_delivery_idx on public.evidence_files (delivery_id);

create table if not exists public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  reviewer_name text not null,
  reviewer_role text not null check (reviewer_role in ('administrator', 'supplier', 'plant_operator', 'reviewer', 'buyer')),
  decision text not null check (decision in ('approved', 'corrections_requested', 'rejected')),
  note text not null,
  created_at timestamptz not null default now(),
  unique (delivery_id, reviewer_user_id, created_at)
);

create index if not exists review_decisions_delivery_idx on public.review_decisions (delivery_id);

create table if not exists public.delivery_status_history (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('pending_plant_confirmation', 'confirmed', 'disputed', 'awaiting_review', 'corrections_requested', 'reviewed', 'rejected')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null check (actor_role in ('administrator', 'supplier', 'plant_operator', 'reviewer', 'buyer')),
  actor_name text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (from_status is null or from_status <> to_status)
);

create index if not exists delivery_status_history_delivery_idx on public.delivery_status_history (delivery_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.deliveries enable row level security;
alter table public.evidence_files enable row level security;
alter table public.review_decisions enable row level security;
alter table public.delivery_status_history enable row level security;

create policy "profiles_are_visible_to_own_user" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_are_manageable_by_self" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "organizations_are_visible_to_members" on public.organizations
for select using (
  exists (
    select 1 from public.organization_memberships om
    where om.organization_id = organizations.id and om.user_id = auth.uid() and om.is_active = true
  )
);

create policy "memberships_are_visible_to_members" on public.organization_memberships
for select using (user_id = auth.uid());

create policy "delivery_access_is_org_scoped" on public.deliveries
for select using (
  auth.uid() is not null and (
    exists (
      select 1 from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.organization_id = deliveries.supplier_org_id
        and om.is_active = true
    ) or exists (
      select 1 from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.organization_id = deliveries.plant_org_id
        and om.is_active = true
    ) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'administrator'
    ) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'reviewer'
    )
  )
);

create policy "delivery_writes_are_limited_to_org_members" on public.deliveries
for update using (
  exists (
    select 1 from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = deliveries.supplier_org_id
      and om.is_active = true
      and om.role in ('supplier', 'administrator')
  )
  or exists (
    select 1 from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = deliveries.plant_org_id
      and om.is_active = true
      and om.role in ('plant_operator', 'administrator')
  )
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'
  )
) with check (
  exists (
    select 1 from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = deliveries.supplier_org_id
      and om.is_active = true
      and om.role in ('supplier', 'administrator')
  )
  or exists (
    select 1 from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.organization_id = deliveries.plant_org_id
      and om.is_active = true
      and om.role in ('plant_operator', 'administrator')
  )
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'
  )
);

create policy "review_decisions_are_viewable_by_authorized_actors" on public.review_decisions
for select using (
  reviewer_user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('administrator', 'reviewer')
  )
  or exists (
    select 1 from public.deliveries d
    where d.id = review_decisions.delivery_id
      and (
        exists (
          select 1 from public.organization_memberships om
          where om.user_id = auth.uid() and om.organization_id = d.supplier_org_id and om.is_active = true
        )
        or exists (
          select 1 from public.organization_memberships om
          where om.user_id = auth.uid() and om.organization_id = d.plant_org_id and om.is_active = true
        )
      )
  )
);

create policy "review_decisions_are_append_only" on public.review_decisions
for insert with check (
  reviewer_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'reviewer'
  )
);

create policy "status_history_is_readable_for_authorized_users" on public.delivery_status_history
for select using (
  exists (
    select 1 from public.deliveries d
    where d.id = delivery_status_history.delivery_id
      and (
        exists (
          select 1 from public.organization_memberships om
          where om.user_id = auth.uid() and om.organization_id = d.supplier_org_id and om.is_active = true
        )
        or exists (
          select 1 from public.organization_memberships om
          where om.user_id = auth.uid() and om.organization_id = d.plant_org_id and om.is_active = true
        )
        or exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.role in ('administrator', 'reviewer')
        )
      )
  )
);

create policy "evidence_access_restricted_to_org_and_reviewers" on public.evidence_files
for select using (
  exists (
    select 1 from public.deliveries d
    where d.id = evidence_files.delivery_id
      and (
        exists (
          select 1 from public.organization_memberships om
          where om.user_id = auth.uid() and om.organization_id = d.supplier_org_id and om.is_active = true
        )
        or exists (
          select 1 from public.organization_memberships om
          where om.user_id = auth.uid() and om.organization_id = d.plant_org_id and om.is_active = true
        )
        or exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.role in ('administrator', 'reviewer')
        )
      )
  )
);

create policy "reviewer_self_review_is_blocked_by_application_logic" on public.review_decisions
for insert with check (true);

comment on table public.organizations is 'Explicit organization ownership and membership boundaries for BIOTRACE records.';
comment on table public.deliveries is 'Operational delivery records with workflow state and audit history.';
comment on table public.review_decisions is 'Immutable review decisions as an auditable log tied to a delivery.';
comment on table public.delivery_status_history is 'Single source of truth for workflow transitions and actor metadata.';
