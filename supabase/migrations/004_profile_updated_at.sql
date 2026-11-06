create or replace function biotrace_private.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function biotrace_private.touch_profile_updated_at()
  from public, anon;
grant execute on function biotrace_private.touch_profile_updated_at()
  to authenticated;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function biotrace_private.touch_profile_updated_at();
