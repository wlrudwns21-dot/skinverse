/*
 * Who did what, to whom, when.
 *
 * Mission claims and redemptions already have their own tables with
 * timestamps — those rows ARE their own audit trail. What had none was
 * everything an operator does: granting points, changing an order's status,
 * approving an operator, changing someone's role. If a console account were
 * compromised, or an operator went bad, there was no way to reconstruct it.
 *
 * Written by triggers rather than by the application, so it records what
 * actually happened to the table rather than what some code path intended.
 * Nothing can write here from a client: no INSERT policy exists, and the
 * triggers are SECURITY DEFINER.
 */
create table if not exists public.audit_log (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  -- The JWT's email, so an operator action is attributable to a person.
  -- 'system' when there is no caller (a trigger firing during a migration).
  actor     text not null default 'system',
  action    text not null,
  -- What it was done to: a member's id, an order number, an operator's email.
  subject   text,
  detail    jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_subject_idx on public.audit_log (subject, at desc);
create index if not exists audit_log_action_idx on public.audit_log (action, at desc);

alter table public.audit_log enable row level security;

-- Masters read it. Not every operator: the log is how you investigate an
-- operator, so it should not be readable by the person being investigated.
drop policy if exists "master reads audit log" on public.audit_log;
create policy "master reads audit log" on public.audit_log
  for select to authenticated using (private.is_master());

-- Deliberately no INSERT, UPDATE or DELETE policy. A log a caller can edit is
-- not a log. Even a master cannot rewrite it through the API.
revoke insert, update, delete on public.audit_log from anon, authenticated;


/** The signed-in caller, for attribution. Never fails; unknown becomes 'system'. */
create or replace function private.actor()
returns text language sql stable set search_path = public, private, pg_temp as $$
  select coalesce(nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''), 'system')
$$;


-- ── every point movement ────────────────────────────────────────────────────
/*
 * The single most valuable row in here. Points are money, and this fires
 * whatever moved them — an operator's grant, a mission claim, a redemption, an
 * order. Recording the before and after rather than the delta means a gap in
 * the sequence is visible rather than merely absent.
 */
create or replace function public.audit_points_change()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.points is distinct from old.points then
    insert into public.audit_log (actor, action, subject, detail)
    values (
      private.actor(),
      'points.change',
      old.id::text,
      jsonb_build_object(
        'from', old.points,
        'to', new.points,
        'delta', new.points - old.points,
        'self', private.actor() = 'system' or auth.uid() = old.id
      )
    );
  end if;
  return new;
end $$;

revoke all on function public.audit_points_change() from public, anon, authenticated;

drop trigger if exists profiles_audit_points on public.profiles;
create trigger profiles_audit_points
  after update of points on public.profiles
  for each row execute function public.audit_points_change();


-- ── who is an operator ──────────────────────────────────────────────────────
create or replace function public.audit_operator_change()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor, action, subject, detail)
    values (private.actor(), 'operator.add', new.email,
            jsonb_build_object('role', new.role, 'status', new.status, 'note', new.note));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (actor, action, subject, detail)
    values (private.actor(), 'operator.remove', old.email,
            jsonb_build_object('role', old.role, 'status', old.status));
    return old;
  else
    -- Only the two fields that change what someone can do.
    if new.role is distinct from old.role or new.status is distinct from old.status then
      insert into public.audit_log (actor, action, subject, detail)
      values (private.actor(), 'operator.change', new.email,
              jsonb_build_object(
                'role', jsonb_build_object('from', old.role, 'to', new.role),
                'status', jsonb_build_object('from', old.status, 'to', new.status)));
    end if;
    return new;
  end if;
end $$;

revoke all on function public.audit_operator_change() from public, anon, authenticated;

drop trigger if exists admin_users_audit on public.admin_users;
create trigger admin_users_audit
  after insert or update or delete on public.admin_users
  for each row execute function public.audit_operator_change();


-- ── fulfilment ──────────────────────────────────────────────────────────────
create or replace function public.audit_order_change()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.status is distinct from old.status or new.tracking is distinct from old.tracking then
    insert into public.audit_log (actor, action, subject, detail)
    values (private.actor(), 'order.update', old.order_no,
            jsonb_build_object(
              'status', jsonb_build_object('from', old.status, 'to', new.status),
              'tracking', jsonb_build_object('from', old.tracking, 'to', new.tracking)));
  end if;
  return new;
end $$;

revoke all on function public.audit_order_change() from public, anon, authenticated;

drop trigger if exists orders_audit on public.orders;
create trigger orders_audit
  after update on public.orders
  for each row execute function public.audit_order_change();
