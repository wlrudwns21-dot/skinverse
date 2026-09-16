-- The timezone on a profile is written by the browser, so it is input, not
-- fact. `now() at time zone 'nonsense'` raises, and this function sits in the
-- path of every analysis — an unrecognised zone would take skin analysis down
-- for that member entirely rather than merely putting their midnight in the
-- wrong place. Anything Postgres does not recognise falls back to Seoul.
create or replace function private.usage_day(p_subject text)
returns date
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select (now() at time zone coalesce(
    (select p.timezone
       from public.profiles p
      where p_subject = 'user:' || p.id::text
        and exists (select 1 from pg_timezone_names z where z.name = p.timezone)),
    'Asia/Seoul'
  ))::date;
$$;

-- Same guard for the figure the app shows the customer, so the screen and the
-- server cannot fall back differently.
create or replace function public.my_analysis_quota()
returns json
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select json_build_object(
    'used', coalesce((
      select u.count from public.analysis_usage u
       where u.subject = 'user:' || auth.uid()::text
         and u.day = private.usage_day('user:' || auth.uid()::text)
    ), 0),
    'limit', coalesce((select s.analysis_daily_limit from public.store_settings s limit 1), 1),
    'resets_at', ((private.usage_day('user:' || auth.uid()::text) + 1)::timestamp
                   at time zone coalesce(
                     (select p.timezone
                        from public.profiles p
                       where p.id = auth.uid()
                         and exists (select 1 from pg_timezone_names z where z.name = p.timezone)),
                     'Asia/Seoul'))
  )
  where auth.uid() is not null;
$$;

revoke all on function public.my_analysis_quota() from public;
grant execute on function public.my_analysis_quota() to authenticated;
