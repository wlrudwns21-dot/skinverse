-- my_admin_role() only ever returns the caller's own role, but shipping it as a
-- SECURITY DEFINER function in the exposed schema still puts a definer endpoint
-- on the API surface. Split it the same way as is_admin(): the definer half
-- lives in the unexposed `private` schema, and the public entry point is a plain
-- SECURITY INVOKER wrapper.

create function private.my_admin_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select role from public.admin_users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

grant execute on function private.my_admin_role() to authenticated;

create or replace function public.my_admin_role()
returns text
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.my_admin_role();
$$;

revoke execute on function public.my_admin_role() from anon, public;
grant execute on function public.my_admin_role() to authenticated;
