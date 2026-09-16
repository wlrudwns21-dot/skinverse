-- Temporary instrumentation for the analyze-skin function.
--
-- The edge function logs are not reachable from where this is being debugged,
-- and the symptom (client error, no quota row) is consistent with several very
-- different causes: a CORS preflight the browser refuses, a request that never
-- reaches the handler, or a multipart body that arrives unparseable. Each of
-- those is fixed differently, so the function records where it actually got to.
--
-- Drop this table once the analysis path is confirmed working.
create table if not exists public.fn_hits (
  id bigserial primary key,
  at timestamptz not null default now(),
  stage text not null,
  detail jsonb
);

alter table public.fn_hits enable row level security;
-- No policies: only the service role, from inside the edge function, writes here.

comment on table public.fn_hits is
  'TEMPORARY debug trace for analyze-skin. Safe to drop once the path is verified.';
