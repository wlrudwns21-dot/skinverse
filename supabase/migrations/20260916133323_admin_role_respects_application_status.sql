-- The console decides what to render from `my_admin_role`, and it returned the
-- role on any row at all. With applications now writing their own rows, a
-- pending applicant would have been handed the console shell — every query
-- inside it would have come back empty, because the RLS policies check
-- `is_admin()` and that already requires approval, but showing someone an
-- admin console full of nothing is not the answer to "am I approved yet".
--
-- The role is now null until approved, and the status is reported separately
-- so the screen can say which of "not an operator", "waiting" and "turned
-- down" applies.
create or replace function private.my_admin_role()
returns text
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select role from public.admin_users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and status = 'active';
$$;

/** 'pending' | 'active' | 'rejected', or null when they have never applied. */
create or replace function private.my_admin_status()
returns text
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select status from public.admin_users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.my_admin_status()
returns text
language sql
stable
set search_path = 'public', 'private'
as $$
  select private.my_admin_status();
$$;

revoke all on function public.my_admin_status() from public;
grant execute on function public.my_admin_status() to authenticated;
