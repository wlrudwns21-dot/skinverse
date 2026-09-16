-- The console needs to ask "am I an admin?" before it renders anything. The
-- private helper is deliberately unreachable over the API, so expose a thin
-- SECURITY INVOKER wrapper: it reveals only a boolean about the caller
-- themselves, never the admin list.
create function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.is_admin();
$$;

grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_admin() from anon;
