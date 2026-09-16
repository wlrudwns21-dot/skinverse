/*
 * Account deletion, as a queue an operator works rather than a gate they hold.
 *
 * Worth being precise about, because the difference is legal rather than
 * cosmetic: PIPA 제36조 requires a deletion demand to be acted on without
 * delay, and withdrawing from a service is a contractual right. A business
 * cannot refuse it. So there is no "reject" here — the operator's job is to
 * check nothing is mid-shipment, separate what must legally be kept, and carry
 * the deletion out. The queue exists so that happens deliberately and leaves a
 * record, not so anyone can say no.
 *
 * Deliberately NOT a foreign key to auth.users: the row has to outlive the
 * account it describes, otherwise completing a deletion erases the evidence
 * that we completed it.
 */
create table if not exists public.deletion_requests (
  user_id       uuid primary key,
  -- Captured at request time, because after the deletion there is nowhere left
  -- to look this up.
  email         text not null,
  name          text not null default '',
  requested_at  timestamptz not null default now(),
  reason        text not null default '',
  status        text not null default 'pending'
                check (status in ('pending', 'done', 'cancelled')),
  processed_at  timestamptz,
  processed_by  text,
  note          text not null default ''
);

create index if not exists deletion_requests_status_idx
  on public.deletion_requests (status, requested_at);

alter table public.deletion_requests enable row level security;

-- A member sees their own request, so the app can show "처리 대기 중" rather
-- than pretending nothing happened. Operators see the queue.
drop policy if exists "own deletion request read" on public.deletion_requests;
create policy "own deletion request read" on public.deletion_requests
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

-- Writes go through the functions below only. No direct INSERT or UPDATE
-- policy: a member must not be able to mark their own request done, and an
-- operator must not be able to fabricate one against someone else.
revoke insert, update, delete on public.deletion_requests from anon, authenticated;


/** Ask to be deleted. Idempotent — asking twice does not queue twice. */
create or replace function public.request_account_deletion(p_reason text default '')
returns jsonb language plpgsql security definer set search_path = public, private, auth as $$
declare
  uid uuid := auth.uid();
  addr text;
  who text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  select u.email into addr from auth.users u where u.id = uid;
  select p.name into who from public.profiles p where p.id = uid;

  insert into public.deletion_requests (user_id, email, name, reason, status)
  values (uid, coalesce(addr, ''), coalesce(who, ''), left(coalesce(p_reason, ''), 500), 'pending')
  on conflict (user_id) do update
    -- Re-asking after a cancellation re-opens the same row rather than being
    -- silently ignored.
    set status = 'pending',
        requested_at = now(),
        reason = left(coalesce(p_reason, ''), 500),
        processed_at = null,
        processed_by = null
    where public.deletion_requests.status <> 'done';

  return jsonb_build_object('ok', true, 'status', 'pending');
end $$;

revoke all on function public.request_account_deletion(text) from public, anon;
grant execute on function public.request_account_deletion(text) to authenticated;


/** Change your mind, while it is still waiting. */
create or replace function public.cancel_account_deletion()
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  update public.deletion_requests
     set status = 'cancelled', processed_at = now(), processed_by = 'member'
   where user_id = uid and status = 'pending';
  get diagnostics n = row_count;

  -- Nothing pending is not an error: it means already processed, or never asked.
  return jsonb_build_object('ok', n > 0, 'reason', case when n = 0 then 'nothing_pending' else null end);
end $$;

revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;


/*
 * Carry it out.
 *
 * Deleting the auth user is what does the work: everything without a retention
 * duty cascades away with it — the profile, scans, routines, the cart, mission
 * claims, redemptions, routine logs. Orders and support threads survive with
 * their user_id set to NULL, because the previous migration changed those two
 * to ON DELETE SET NULL for exactly this moment.
 *
 * The request row is updated BEFORE the delete: it has no foreign key, but
 * writing the outcome first means a failure half way leaves the queue honest
 * rather than showing a deletion that did not finish.
 */
create or replace function public.complete_account_deletion(p_user uuid, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public, private, auth as $$
declare
  actor text := private.actor();
  req public.deletion_requests%rowtype;
  orders_kept int;
  threads_kept int;
begin
  if not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not_an_operator');
  end if;

  select * into req from public.deletion_requests where user_id = p_user and status = 'pending';
  if req.user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_pending_request');
  end if;

  select count(*) into orders_kept from public.orders where user_id = p_user;
  select count(*) into threads_kept from public.support_threads where user_id = p_user;

  update public.deletion_requests
     set status = 'done', processed_at = now(), processed_by = actor,
         note = left(coalesce(p_note, ''), 500)
   where user_id = p_user;

  delete from auth.users where id = p_user;

  -- Written by hand rather than by a trigger: the profile row this would have
  -- fired on no longer exists by the time we would want to log it.
  insert into public.audit_log (actor, action, subject, detail)
  values (actor, 'account.delete', req.email,
          jsonb_build_object(
            'requestedAt', req.requested_at,
            'ordersRetained', orders_kept,
            'threadsRetained', threads_kept,
            'note', left(coalesce(p_note, ''), 500)));

  return jsonb_build_object(
    'ok', true,
    'ordersRetained', orders_kept,
    'threadsRetained', threads_kept
  );
end $$;

revoke all on function public.complete_account_deletion(uuid, text) from public, anon;
grant execute on function public.complete_account_deletion(uuid, text) to authenticated;


/** What the member sees on their own MY screen: pending, or nothing. */
create or replace function public.my_deletion_request()
returns jsonb language sql stable security definer set search_path = public, private as $$
  select case when d.user_id is null then null
              else jsonb_build_object('status', d.status, 'requestedAt', d.requested_at)
         end
  from (select 1) x
  left join public.deletion_requests d
    on d.user_id = auth.uid() and d.status = 'pending'
$$;

revoke all on function public.my_deletion_request() from public, anon;
grant execute on function public.my_deletion_request() to authenticated;
