-- The admin console showed a member's "email" as the first eight characters of
-- their uuid, because auth.users is not reachable through PostgREST and the
-- profile row never carried the address. That is not an email — an operator
-- answering a support thread had no way to tell who they were looking at.
--
-- This is the one place the two halves are joined. It is SECURITY DEFINER, so
-- it can read auth.users, and it opens with an is_admin() guard, so that
-- privilege is spent only on an operator. A caller who is not an admin gets an
-- empty set rather than an error: there is nothing here for them, and a
-- different response for "not an admin" than for "no members" would confirm
-- the function is worth attacking.
--
-- Only the columns an operator needs to identify and support a customer are
-- returned. Password hashes, recovery tokens and the rest of auth.users stay
-- where they are.
create or replace function public.admin_member_directory()
returns table (
  id uuid,
  email text,
  -- Null until the member clicks the link in their confirmation mail. An
  -- operator chasing "I never got my points" needs to see this first.
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  -- 'email', or 'google'/'apple'/… if social sign-in is ever turned on.
  provider text,
  -- What they typed on the signup form, as they typed it. Kept apart from the
  -- profile columns below, which they can edit afterwards — the difference
  -- between the two is often the answer to a support question.
  signup_name text,
  signup_country text,
  signup_city text,
  signup_language text,
  signup_timezone text,
  -- The profile as it stands now.
  name text,
  country text,
  city text,
  language text,
  timezone text,
  skin_condition text,
  points integer,
  streak integer,
  routine_reminders boolean,
  created_at timestamptz,
  scan_count bigint,
  order_count bigint,
  last_scan_at timestamptz,
  total_spent numeric
)
language sql
stable
security definer
set search_path = 'public', 'private', 'auth'
as $$
  select
    p.id,
    u.email::text,
    u.email_confirmed_at,
    u.last_sign_in_at,
    coalesce(u.raw_app_meta_data ->> 'provider', 'email')::text,
    nullif(u.raw_user_meta_data ->> 'name', '')::text,
    nullif(u.raw_user_meta_data ->> 'country', '')::text,
    nullif(u.raw_user_meta_data ->> 'city', '')::text,
    nullif(u.raw_user_meta_data ->> 'language', '')::text,
    nullif(u.raw_user_meta_data ->> 'timezone', '')::text,
    p.name,
    p.country,
    p.city,
    p.language,
    p.timezone,
    p.skin_condition,
    p.points,
    p.streak,
    p.routine_reminders,
    p.created_at,
    coalesce(s.n, 0),
    coalesce(o.n, 0),
    s.last_at,
    coalesce(o.spent, 0)
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select count(*) as n, max(created_at) as last_at
    from public.scans where user_id = p.id
  ) s on true
  left join lateral (
    select count(*) as n, sum(total) as spent
    from public.orders where user_id = p.id
  ) o on true
  where private.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.admin_member_directory() from public;
grant execute on function public.admin_member_directory() to authenticated;
