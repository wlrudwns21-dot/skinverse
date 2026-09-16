-- Admin access.
--
-- Admins are identified by email rather than by user id so the first operator
-- can be authorised before they have ever signed up — the moment they create an
-- account with a listed address, they are an admin.
--
-- Everything lives in a `private` schema, which PostgREST does not expose, so
-- neither the table nor the helper is reachable as an API endpoint. That is what
-- keeps a SECURITY DEFINER helper from becoming a privilege-escalation surface.

create schema if not exists private;

create table private.admin_emails (
  email text primary key,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- STABLE + SECURITY DEFINER so policies can call it without tripping over the
-- RLS of the tables they guard, and so it is evaluated once per statement.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = private, public
as $$
  select exists (
    select 1 from private.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Policy evaluation runs as the querying role, so it needs to reach the helper.
-- The schema stays unexposed, so this grant does not create an RPC endpoint.
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- ── admin read access across every member's rows ──────────────────────────
create policy "admin reads all profiles"    on public.profiles       for select using (private.is_admin());
create policy "admin reads all orders"      on public.orders         for select using (private.is_admin());
create policy "admin reads all order items" on public.order_items    for select using (private.is_admin());
create policy "admin reads all scans"       on public.scans          for select using (private.is_admin());
create policy "admin reads all routines"    on public.routines       for select using (private.is_admin());
create policy "admin reads all claims"      on public.mission_claims for select using (private.is_admin());
create policy "admin reads all redemptions" on public.redemptions    for select using (private.is_admin());

-- ── admin writes: fulfilment and manual point grants ──────────────────────
create policy "admin updates orders"  on public.orders   for update using (private.is_admin()) with check (private.is_admin());
create policy "admin updates profiles" on public.profiles for update using (private.is_admin()) with check (private.is_admin());

-- Seed the first operator. Signing up with this address grants admin access.
--
-- REDACTED. The real address is in the database, not here: this repository is
-- public, and in this design the operator's email IS the admin identity —
-- is_admin() matches auth.jwt()->>'email' against admin_users. Publishing it
-- tells an attacker exactly which account to spray passwords at, which is the
-- one question they would otherwise have to answer themselves.
insert into private.admin_emails (email, note)
values ('operator@example.com', 'first operator')
on conflict (email) do nothing;
