-- Make the quota functions reachable by the edge function again.
--
-- Two things were wrong at once, both introduced while tightening security.
--
-- 1. Revoking EXECUTE from PUBLIC to keep browsers out also removed the
--    implicit grant the service role was relying on, and the service role
--    never had USAGE on the `private` schema. The edge function's quota claim
--    therefore failed with a permission error, which it reported as
--    `quota_unavailable` — and the app turned that into "analysis failed" and
--    quietly showed the demo result instead.
--
-- 2. `.schema('private').rpc(...)` goes through PostgREST, which only serves
--    schemas on its exposed list. Whether `private` is on that list is a
--    project setting, not something the schema can assert — so relying on it
--    makes the analysis path depend on a dashboard toggle nobody would think
--    to check.
--
-- The fix for both: thin wrappers in `public`, where PostgREST always looks,
-- each SECURITY DEFINER so it runs with the owner's rights and needs no grants
-- on `private` at all. The logic stays in one place, in `private`.
--
-- Access stays exactly as narrow as before: EXECUTE is revoked from PUBLIC,
-- anon and authenticated, and granted only to service_role — which lives in
-- the edge function and never in a browser.

create or replace function public.claim_analysis_call(p_subject text, p_limit integer)
returns boolean
language sql
security definer
set search_path to 'public', 'private'
as $$
  select private.claim_analysis_call(p_subject, p_limit);
$$;

create or replace function public.release_analysis_call(p_subject text)
returns void
language sql
security definer
set search_path to 'public', 'private'
as $$
  select private.release_analysis_call(p_subject);
$$;

-- Nobody gets these by default. A browser holding an anon or a user token must
-- not be able to mint itself quota, nor hand quota back after spending it.
revoke execute on function public.claim_analysis_call(text, integer) from public, anon, authenticated;
revoke execute on function public.release_analysis_call(text) from public, anon, authenticated;

grant execute on function public.claim_analysis_call(text, integer) to service_role;
grant execute on function public.release_analysis_call(text) to service_role;
