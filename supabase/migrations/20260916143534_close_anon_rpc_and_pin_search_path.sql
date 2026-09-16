/*
 * Item 6 of the audit: two SECURITY DEFINER functions were callable without
 * signing in.
 *
 * Neither leaked anything — admin_member_directory() returns zero rows without
 * an operator's JWT, and my_analysis_quota() has no member to report on — but
 * an unauthenticated caller has no business reaching either, and a function
 * that is merely well-behaved today is not the same as one that cannot be
 * called. Every RPC here is about the signed-in caller, so `authenticated` is
 * the whole audience.
 */
revoke execute on function public.admin_member_directory() from anon, public;
revoke execute on function public.my_analysis_quota() from anon, public;
revoke execute on function public.my_admin_status() from anon, public;
revoke execute on function public.is_admin() from anon, public;

grant execute on function public.admin_member_directory() to authenticated;
grant execute on function public.my_analysis_quota() to authenticated;
grant execute on function public.my_admin_status() to authenticated;
grant execute on function public.is_admin() to authenticated;

/*
 * Item 7: private.my_email() ran with whatever search_path the caller had.
 *
 * It is called from inside the admin_users policies, so a caller who could
 * create a schema ahead of it on the path could shadow what it resolves to and
 * answer the question "whose email is this?" themselves. `authenticated` has no
 * CREATE right on any schema, so this was not reachable — but the whole point
 * of pinning the path is that it stops depending on that remaining true.
 */
create or replace function private.my_email()
returns text language sql stable set search_path = public, private, pg_temp as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
