-- BIOTRACE Milestone 2: Administrator Provisioning
-- This migration provides a safe, idempotent mechanism to grant platform administrator access.
-- Execution is restricted to database owners / service-role in the Supabase SQL Editor.

create or replace function biotrace_private.grant_platform_admin_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = lower(btrim(target_email));

  if target_user_id is null then
    raise exception 'User with email % was not found in auth.users', target_email using errcode = 'P0002';
  end if;

  insert into public.platform_admins (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_state)
  values (
    target_user_id,
    'platform_admin.granted',
    'platform_admin',
    target_user_id::text,
    jsonb_build_object('email', target_email, 'granted_at', now())
  );

  return target_user_id;
end;
$$;

revoke all on function biotrace_private.grant_platform_admin_by_email(text) from public, anon, authenticated;

comment on function biotrace_private.grant_platform_admin_by_email(text) is
  'Securely provisions a platform administrator by user email. Requires service-role or superuser access.';

