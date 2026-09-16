-- Per-day call quota for the paid analysis vendor.
--
-- Every scan costs real money, so the edge function checks this before it calls
-- out. Counting lives in Postgres rather than in the function's memory because
-- edge functions are stateless and replicated — an in-process counter would
-- reset constantly and enforce nothing.
--
-- `subject` is the member's user id when signed in, and a salted hash of the
-- caller's IP otherwise. The raw IP is never stored: it is only ever needed to
-- decide "is this the same caller as a minute ago", which a hash answers.

create table public.analysis_usage (
  subject text not null,
  day date not null default current_date,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (subject, day)
);

-- Only the service role (the edge function) touches this. No policies are
-- granted to anon or authenticated, so with RLS on, the table is invisible to
-- the browser entirely.
alter table public.analysis_usage enable row level security;

create index analysis_usage_day_idx on public.analysis_usage (day);

/**
 * Claim one call against today's quota.
 *
 * Returns true when the caller may proceed. The insert-or-increment is a single
 * statement so two requests racing cannot both see "9 of 10" and both pass.
 */
create function private.claim_analysis_call(p_subject text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  new_count integer;
begin
  insert into public.analysis_usage (subject, day, count)
  values (p_subject, current_date, 1)
  on conflict (subject, day)
  do update set count = public.analysis_usage.count + 1, updated_at = now()
  returning count into new_count;

  return new_count <= p_limit;
end;
$$;

-- The edge function authenticates as the service role, which bypasses these
-- grants; nothing in the browser may call it.
revoke all on function private.claim_analysis_call(text, integer) from public, anon, authenticated;

/** Housekeeping: quota rows older than a week answer no question. */
create function private.prune_analysis_usage()
returns void
language sql
security definer
set search_path = public, private
as $$
  delete from public.analysis_usage where day < current_date - 7;
$$;

revoke all on function private.prune_analysis_usage() from public, anon, authenticated;
