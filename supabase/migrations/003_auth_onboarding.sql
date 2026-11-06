alter table public.profiles
  add column if not exists account_status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('pending_email_verification', 'active', 'suspended'));
  end if;
end
$$;

alter table public.organizations
  add column if not exists registration_number text,
  add column if not exists contact_email text,
  add column if not exists phone text,
  add column if not exists business_address text,
  add column if not exists relevant_information text;

create unique index if not exists organizations_registration_number_unique
  on public.organizations (lower(btrim(registration_number)))
  where nullif(btrim(registration_number), '') is not null;

alter table public.organization_memberships
  drop constraint if exists organization_memberships_role_check;
alter table public.organization_memberships
  add constraint organization_memberships_role_check
  check (role in (
    'administrator',
    'organization_admin',
    'member',
    'supplier',
    'aggregator',
    'plant_operator',
    'reviewer',
    'buyer'
  ));

alter table public.organization_verifications
  drop constraint if exists organization_verifications_status_check;
alter table public.organization_verifications
  add constraint organization_verifications_status_check
  check (status in (
    'pending',
    'under_review',
    'approved',
    'rejected',
    'additional_information_required'
  ));

alter table public.organization_verifications
  drop constraint if exists organization_verifications_check;
alter table public.organization_verifications
  add constraint organization_verifications_review_state_check
  check (
    (status = 'pending' and reviewed_by is null and decided_at is null)
    or (status = 'under_review' and reviewed_by is not null and decided_at is null)
    or (
      status in ('approved', 'rejected', 'additional_information_required')
      and reviewed_by is not null
      and decided_at is not null
    )
  );

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  normalized_name text;
  normalized_email text;
  next_account_status text;
begin
  normalized_email := coalesce(nullif(btrim(new.email), ''), '');
  normalized_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  if normalized_name is null then
    normalized_name := coalesce(nullif(split_part(normalized_email, '@', 1), ''), 'BIOTRACE user');
  end if;

  next_account_status := case
    when new.email_confirmed_at is null then 'pending_email_verification'
    else 'active'
  end;

  insert into public.profiles (id, full_name, email, role, account_status)
  values (new.id, normalized_name, normalized_email, 'supplier', next_account_status)
  on conflict (id) do update
  set email = excluded.email,
      account_status = excluded.account_status,
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_auth_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_profile_created_or_updated on auth.users;
create trigger on_auth_user_profile_created_or_updated
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.handle_auth_user_profile();

insert into public.profiles (id, full_name, email, role, account_status)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'BIOTRACE user'
  ),
  coalesce(u.email, ''),
  'supplier',
  case when u.email_confirmed_at is null
    then 'pending_email_verification'
    else 'active'
  end
from auth.users u
on conflict (id) do nothing;

create or replace function public.register_organization(
  p_name text,
  p_organization_type text,
  p_registration_number text,
  p_contact_email text,
  p_phone text,
  p_business_address text,
  p_relevant_information text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  caller_confirmed_at timestamptz;
  caller_account_status text;
  organization_id uuid;
  normalized_name text := nullif(btrim(p_name), '');
  normalized_registration_number text := nullif(btrim(p_registration_number), '');
  normalized_contact_email text := nullif(lower(btrim(p_contact_email)), '');
  normalized_phone text := nullif(btrim(p_phone), '');
  normalized_address text := nullif(btrim(p_business_address), '');
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  select u.email, u.email_confirmed_at, p.account_status
    into caller_email, caller_confirmed_at, caller_account_status
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = caller_id;

  if caller_email is null or caller_confirmed_at is null then
    raise exception 'Confirm your email before registering an organization' using errcode = '42501';
  end if;
  if caller_account_status is distinct from 'active' then
    raise exception 'This account is not active and cannot register an organization' using errcode = '42501';
  end if;

  if normalized_name is null or length(normalized_name) < 2 or length(normalized_name) > 200 then
    raise exception 'Organization name must contain 2 to 200 characters' using errcode = '22023';
  end if;
  if normalized_registration_number is null
    or length(normalized_registration_number) < 2
    or length(normalized_registration_number) > 100 then
    raise exception 'A valid registration number is required' using errcode = '22023';
  end if;
  if normalized_contact_email is null
    or length(normalized_contact_email) > 254
    or normalized_contact_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid organization contact email is required' using errcode = '22023';
  end if;
  if normalized_phone is null or length(normalized_phone) < 7 or length(normalized_phone) > 40 then
    raise exception 'A valid contact phone number is required' using errcode = '22023';
  end if;
  if normalized_address is null or length(normalized_address) < 5 or length(normalized_address) > 500 then
    raise exception 'A business address of 5 to 500 characters is required' using errcode = '22023';
  end if;
  if p_organization_type is null or p_organization_type not in (
    'supplier',
    'biomass_aggregator',
    'cement_plant',
    'independent_reviewer',
    'carbon_buyer'
  ) then
    raise exception 'Unsupported organization type' using errcode = '22023';
  end if;
  if p_relevant_information is not null and length(btrim(p_relevant_information)) > 5000 then
    raise exception 'Relevant information must be no more than 5000 characters' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(normalized_registration_number), 0));
  if exists (
    select 1
    from public.organizations o
    where lower(btrim(o.registration_number)) = lower(normalized_registration_number)
  ) then
    raise exception 'An organization with this registration number already exists' using errcode = '23505';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('organization-name:' || lower(normalized_name), 0));
  if exists (
    select 1
    from public.organizations o
    where lower(btrim(o.name)) = lower(normalized_name)
  ) then
    raise exception 'An organization with this legal name already exists' using errcode = '23505';
  end if;

  insert into public.organizations (
    name,
    organization_type,
    registration_number,
    contact_email,
    phone,
    business_address,
    relevant_information
  )
  values (
    normalized_name,
    p_organization_type,
    normalized_registration_number,
    normalized_contact_email,
    normalized_phone,
    normalized_address,
    nullif(btrim(p_relevant_information), '')
  )
  returning id into organization_id;

  insert into public.organization_memberships (organization_id, user_id, role, is_active)
  values (organization_id, caller_id, 'organization_admin', true);

  insert into public.organization_verifications (organization_id, status, submitted_by)
  values (organization_id, 'pending', caller_id);

  update public.profiles
  set role = case p_organization_type
        when 'supplier' then 'supplier'
        when 'biomass_aggregator' then 'aggregator'
        when 'cement_plant' then 'plant_operator'
        when 'independent_reviewer' then 'reviewer'
        when 'carbon_buyer' then 'buyer'
      end,
      updated_at = now()
  where id = caller_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id,
    'organization.registered',
    'organization',
    organization_id::text,
    jsonb_build_object('organization_type', p_organization_type, 'verification_status', 'pending')
  );

  return organization_id;
end;
$$;

revoke all on function public.register_organization(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_organization(text, text, text, text, text, text, text)
  to authenticated;

create or replace function public.add_organization_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id uuid := auth.uid();
  organization_type text;
  target_email_confirmed_at timestamptz;
  target_account_status text;
  membership_id uuid;
  allowed_role text;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if p_user_id is null or p_user_id = caller_id then
    raise exception 'A different registered user is required' using errcode = '22023';
  end if;
  if p_role is null
    or p_role in ('administrator', 'organization_admin')
    or p_role not in (
    'member',
    'supplier',
    'aggregator',
    'plant_operator',
    'reviewer',
    'buyer'
  ) then
    raise exception 'This operation cannot grant privileged membership roles' using errcode = '42501';
  end if;

  if not biotrace_private.is_approved_org_member(
    p_organization_id,
    array['organization_admin']
  ) then
    raise exception 'An approved organization administrator is required' using errcode = '42501';
  end if;

  select o.organization_type
    into organization_type
  from public.organizations o
  where o.id = p_organization_id;

  allowed_role := case organization_type
    when 'supplier' then 'supplier'
    when 'biomass_aggregator' then 'aggregator'
    when 'cement_plant' then 'plant_operator'
    when 'independent_reviewer' then 'reviewer'
    when 'carbon_buyer' then 'buyer'
    else null
  end;

  if organization_type is null
    or (p_role <> 'member' and p_role <> allowed_role) then
    raise exception 'Membership role is not permitted for this organization type' using errcode = '42501';
  end if;

  select u.email_confirmed_at, p.account_status
    into target_email_confirmed_at, target_account_status
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if not found or target_email_confirmed_at is null or target_account_status <> 'active' then
    raise exception 'The selected user must have a confirmed email address' using errcode = '22023';
  end if;

  insert into public.organization_memberships (organization_id, user_id, role, is_active)
  values (p_organization_id, p_user_id, p_role, true)
  returning id into membership_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    caller_id,
    'organization.member_added',
    'organization_membership',
    membership_id::text,
    jsonb_build_object('organization_id', p_organization_id, 'member_user_id', p_user_id, 'role', p_role)
  );

  return membership_id;
end;
$$;

revoke all on function public.add_organization_member(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.add_organization_member(uuid, uuid, text)
  to authenticated;

create or replace function public.review_organization_verification(
  p_verification_id uuid,
  p_status text,
  p_decision_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, biotrace_private
as $$
declare
  caller_id uuid := auth.uid();
  current_status text;
  organization_id uuid;
  normalized_reason text := nullif(btrim(p_decision_reason), '');
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if not biotrace_private.is_platform_admin() then
    raise exception 'Platform administrator access is required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in (
    'under_review',
    'approved',
    'rejected',
    'additional_information_required'
  ) then
    raise exception 'Unsupported verification status' using errcode = '22023';
  end if;
  if p_status in ('rejected', 'additional_information_required')
    and (normalized_reason is null or length(normalized_reason) > 2000) then
    raise exception 'A decision reason of 1 to 2000 characters is required' using errcode = '22023';
  end if;
  if p_decision_reason is not null and length(p_decision_reason) > 2000 then
    raise exception 'Decision reason must be no more than 2000 characters' using errcode = '22023';
  end if;

  select ov.status, ov.organization_id
    into current_status, organization_id
  from public.organization_verifications ov
  where ov.id = p_verification_id
  for update;

  if not found then
    raise exception 'Verification submission was not found' using errcode = 'P0002';
  end if;
  if current_status not in ('pending', 'under_review') then
    raise exception 'Only pending or in-review submissions may be updated' using errcode = '55000';
  end if;

  update public.organization_verifications
  set status = p_status,
      reviewed_by = caller_id,
      decision_reason = normalized_reason,
      decided_at = case when p_status = 'under_review' then null else now() end
  where id = p_verification_id;

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
    'organization.verification_' || p_status,
    'organization_verification',
    p_verification_id::text,
    jsonb_build_object('organization_id', organization_id, 'status', current_status),
    jsonb_build_object('organization_id', organization_id, 'status', p_status, 'reason', normalized_reason)
  );
end;
$$;

revoke all on function public.review_organization_verification(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_organization_verification(uuid, text, text)
  to authenticated;
