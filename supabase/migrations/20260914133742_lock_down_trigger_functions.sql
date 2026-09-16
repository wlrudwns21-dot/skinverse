-- These two functions only ever run as triggers, but living in the `public`
-- schema they were also reachable as RPC endpoints (/rest/v1/rpc/...) by the
-- anon and authenticated roles. handle_new_user() is SECURITY DEFINER, so that
-- is a privilege-escalation surface we do not want exposed. Revoke EXECUTE from
-- every caller; the triggers themselves run as the table owner and are
-- unaffected.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
