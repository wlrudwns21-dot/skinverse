/*
 * Two ways back into the same room, found by listing the grants rather than
 * trusting the policies to be the whole story.
 *
 * 1. `orders` was UPDATE-able column-wide. RLS limits that to operators, so a
 *    member could not reach it — but it let an operator's console rewrite
 *    `total`, `points_earned` and even `user_id` on an order that had already
 *    been placed, and the console only ever sets two fields. A privilege
 *    nobody uses is a privilege waiting to be used by mistake.
 */
revoke update on public.orders from anon, authenticated;
grant update (status, tracking) on public.orders to authenticated;

/*
 * 2. `profiles` was INSERT-able, points column included. Nothing could use it
 *    today — there is no INSERT policy, so row level security refuses every
 *    attempt — but that is one `create policy` away from being an account that
 *    starts life with a million points. The row is created by the
 *    handle_new_user() trigger, which is SECURITY DEFINER and does not need
 *    this grant.
 */
revoke insert on public.profiles from anon, authenticated;
