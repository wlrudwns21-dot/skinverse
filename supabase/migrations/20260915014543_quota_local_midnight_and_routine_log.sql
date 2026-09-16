-- ── the member's own midnight ───────────────────────────────────────────────
-- The daily analysis allowance keyed on Postgres `current_date`, which is UTC.
-- For a customer in Seoul that meant the allowance reset at 09:00, not at
-- midnight — "one a day" quietly meant "one per UTC day", which is nobody's day.
-- The member's timezone now decides, so the reset lands where they expect it.
alter table public.profiles
  add column if not exists timezone text not null default 'Asia/Seoul';

-- The limit moves out of the edge function's environment and into settings, so
-- the app can tell the customer how many they have left. A number the server
-- enforces and the screen cannot read is a number the screen has to guess at.
alter table public.store_settings
  add column if not exists analysis_daily_limit integer not null default 1;

-- Which day a subject's usage belongs to, in their own timezone.
-- One definition, used by the claim, the release and the remaining count, so
-- the three can never disagree about when tomorrow starts.
create or replace function private.usage_day(p_subject text)
returns date
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p
      where p_subject = 'user:' || p.id::text),
    'Asia/Seoul'
  ))::date;
$$;

create or replace function private.claim_analysis_call(p_subject text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  new_count integer;
begin
  insert into public.analysis_usage (subject, day, count)
  values (p_subject, private.usage_day(p_subject), 1)
  on conflict (subject, day)
  do update set count = public.analysis_usage.count + 1, updated_at = now()
  returning count into new_count;

  return new_count <= p_limit;
end;
$$;

create or replace function private.release_analysis_call(p_subject text)
returns void
language sql
security definer
set search_path = 'public', 'private'
as $$
  update public.analysis_usage
     set count = greatest(count - 1, 0), updated_at = now()
   where subject = p_subject and day = private.usage_day(p_subject);
$$;

-- What the caller has left today, and when it comes back.
-- Reads only the caller's own row: the subject is built from auth.uid() here
-- rather than taken as an argument, so it cannot be pointed at anyone else.
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
    -- Next local midnight, as an absolute instant the client can count down to.
    'resets_at', ((private.usage_day('user:' || auth.uid()::text) + 1)::timestamp
                   at time zone coalesce(
                     (select p.timezone from public.profiles p where p.id = auth.uid()),
                     'Asia/Seoul'))
  )
  where auth.uid() is not null;
$$;

revoke all on function public.my_analysis_quota() from public;
grant execute on function public.my_analysis_quota() to authenticated;

-- ── the routine, day by day ─────────────────────────────────────────────────
-- One row per step actually done. Keyed on the local day the member was living
-- in when they did it, written by the client, because a routine cleared at
-- 23:30 in Seoul belongs to that evening and not to the next UTC day.
create table if not exists public.routine_checks (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  slot text not null check (slot in ('am', 'pm')),
  step_key text not null,
  checked_at timestamptz not null default now(),
  primary key (user_id, day, slot, step_key)
);

create index if not exists routine_checks_user_day on public.routine_checks (user_id, day desc);

alter table public.routine_checks enable row level security;

create policy "own routine checks read" on public.routine_checks
  for select using ((select auth.uid()) = user_id);
create policy "own routine checks insert" on public.routine_checks
  for insert with check ((select auth.uid()) = user_id);
create policy "own routine checks delete" on public.routine_checks
  for delete using ((select auth.uid()) = user_id);

-- Steps the member added themselves. `preset` names an entry in the app's
-- curated list rather than holding free text: a routine step is advice, and
-- advice a customer typed into a box is advice nobody reviewed.
create table if not exists public.routine_extras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null check (slot in ('am', 'pm')),
  preset text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slot, preset)
);

create index if not exists routine_extras_user on public.routine_extras (user_id);

alter table public.routine_extras enable row level security;

create policy "own routine extras read" on public.routine_extras
  for select using ((select auth.uid()) = user_id);
create policy "own routine extras insert" on public.routine_extras
  for insert with check ((select auth.uid()) = user_id);
create policy "own routine extras delete" on public.routine_extras
  for delete using ((select auth.uid()) = user_id);
