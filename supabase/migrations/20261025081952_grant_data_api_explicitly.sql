/**
 * Say out loud which roles may reach which table.
 *
 * Until now nothing in this repository granted the Data API anything. Every
 * table was reachable because Supabase sets ALTER DEFAULT PRIVILEGES on
 * `public` when a project is created, so each CREATE TABLE silently handed
 * anon, authenticated and service_role the full set. From 30 October 2026
 * that stops: a table created after then is invisible to supabase-js, REST
 * and GraphQL until something grants it, and the failure is a 42501
 * permission denied that RLS cannot help with, because Postgres checks the
 * grant before it ever looks at a policy.
 *
 * Existing tables keep what they have, so nothing breaks on the live project
 * on the day. The thing that breaks is a rebuild. These 61 migrations have
 * never been able to stand up a working database on their own — they have
 * only ever worked because the project they were replayed into had already
 * been set up to grant everything automatically. After 30 October a fresh
 * project, a preview branch or a local `supabase db reset` would come up with
 * all 28 tables unreachable and no obvious reason why.
 *
 * So this writes down what the live database already has. Running it against
 * the live database changed nothing, and that was checked rather than
 * assumed: the digest of every table and column privilege held by anon,
 * authenticated and service_role was 2efa62fb72a3bcf3318a31ce52029614 over
 * 3344 rows both before and after. What it buys is that the repository can
 * rebuild the schema again.
 *
 * Two deliberate narrowings from earlier migrations are preserved: the money
 * and points tables take no insert or update from the API roles, because the
 * SECURITY DEFINER functions own those writes, and product_costs is closed to
 * anon entirely. The column-level update grants near the bottom are what let
 * a customer edit their own profile and an operator set a tracking number
 * without either of them being able to touch anything else in the row.
 *
 * Only the four privileges the Data API can actually use are granted. The
 * old automatic grant also handed over TRUNCATE, REFERENCES, TRIGGER and
 * MAINTAIN, which PostgREST has no way to invoke and no reason to hold.
 */

/** Read and write for everyone who reaches the API. RLS is what actually
 * decides who sees which row — these grants only open the door to the table. */
grant select, insert, update, delete on public.admin_users to anon, authenticated, service_role;
grant select, insert, update, delete on public.analysis_usage to anon, authenticated, service_role;
grant select, insert, update, delete on public.cart_items to anon, authenticated, service_role;
grant select, insert, update, delete on public.fx_rates to anon, authenticated, service_role;
grant select, insert, update, delete on public.ingredient_copy_unmatched to anon, authenticated, service_role;
grant select, insert, update, delete on public.ingredients to anon, authenticated, service_role;
grant select, insert, update, delete on public.missions to anon, authenticated, service_role;
grant select, insert, update, delete on public.products to anon, authenticated, service_role;
grant select, insert, update, delete on public.restricted_ingredients to anon, authenticated, service_role;
grant select, insert, update, delete on public.rewards to anon, authenticated, service_role;
grant select, insert, update, delete on public.routine_checks to anon, authenticated, service_role;
grant select, insert, update, delete on public.routine_extras to anon, authenticated, service_role;
grant select, insert, update, delete on public.routines to anon, authenticated, service_role;
grant select, insert, update, delete on public.scans to anon, authenticated, service_role;
grant select, insert, update, delete on public.shipping_methods to anon, authenticated, service_role;
grant select, insert, update, delete on public.store_settings to anon, authenticated, service_role;
grant select, insert, update, delete on public.support_faqs to anon, authenticated, service_role;
grant select, insert, update, delete on public.support_messages to anon, authenticated, service_role;
grant select, insert, update, delete on public.support_threads to anon, authenticated, service_role;

/** Rows are written only by the SECURITY DEFINER functions that own the
 * money and the points, so the API roles never get insert or update here. */
grant select, delete on public.mission_claims to anon, authenticated, service_role;
grant select, delete on public.order_items to anon, authenticated, service_role;
grant select, delete on public.orders to anon, authenticated, service_role;
grant select, delete on public.profiles to anon, authenticated, service_role;
grant select, delete on public.redemptions to anon, authenticated, service_role;
grant select, insert, update, delete on public.mission_claims to service_role;
grant select, insert, update, delete on public.order_items to service_role;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.redemptions to service_role;

/** Append-only from the server's side. The API may read and nothing else. */
grant select on public.audit_log to anon, authenticated, service_role;
grant select on public.deletion_requests to anon, authenticated, service_role;
grant select on public.refund_requests to anon, authenticated, service_role;
grant select, insert, update, delete on public.audit_log to service_role;
grant select, insert, update, delete on public.deletion_requests to service_role;
grant select, insert, update, delete on public.refund_requests to service_role;

/** What each product costs us. Never anon — only a signed-in operator, and
 * the policy on the table narrows that to an admin. */
grant select, insert, update, delete on public.product_costs to authenticated;
grant select, insert, update, delete on public.product_costs to service_role;

/**
 * The two column-level update grants, restated.
 *
 * `20260916142952_narrow_remaining_money_grants.sql` and its neighbours
 * revoked update on these tables and handed back only these columns. A
 * rebuilt database never runs that revoke against a full grant, so the
 * narrow grant has to be stated directly or the columns come back closed.
 */
grant update (status, tracking) on public.orders to authenticated;
grant update (address, birth_date, city, country, customs_code, gender, language, name, phone, phone_cc, postal_code, routine_reminders, skin_condition, timezone, updated_at)
  on public.profiles to authenticated;

/** The three sequences behind the serial keys, for the inserts above. */
grant usage, select on sequence public.audit_log_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.ingredients_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.restricted_ingredients_id_seq to anon, authenticated, service_role;

/**
 * Stop the automatic grant here too, rather than waiting for the 30th.
 *
 * Supabase will do this to the project on 30 October regardless. Doing it in
 * a migration means a local reset and a preview branch behave the same way as
 * production does, instead of a new table working in one and failing in the
 * other. From here on, a migration that creates a table grants it in the same
 * file — see the ones above for the shape.
 */
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
