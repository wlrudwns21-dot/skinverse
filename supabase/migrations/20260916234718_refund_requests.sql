/*
 * A customer asking for their money back.
 *
 * Deliberately a request and not a refund. The customer states what they want
 * and why; an operator decides, and the money only actually moves when PayPal
 * says it did — the webhook remains the single writer of payment state. This
 * table is the conversation in between, and it exists so that conversation is
 * not happening in email where nobody can audit it.
 *
 * One open request per order. Re-asking after a decline reopens the same row
 * rather than queueing a second one, so the operator sees a customer, not a
 * backlog.
 */
create table if not exists public.refund_requests (
  order_no      text primary key references public.orders(order_no) on delete cascade,
  user_id       uuid,
  reason        text not null default '',
  /* What the customer asked for, in the settlement currency. Null means "all
     of it" — most people do not itemise, and guessing for them is worse. */
  amount        numeric check (amount is null or amount > 0),
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'declined', 'done', 'cancelled')),
  requested_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    text,
  note          text not null default ''
);

create index if not exists refund_requests_open_idx
  on public.refund_requests (status, requested_at) where status = 'pending';

alter table public.refund_requests enable row level security;

-- The customer sees their own so the order screen can say "접수됨"; operators
-- see the queue.
drop policy if exists "own refund request read" on public.refund_requests;
create policy "own refund request read" on public.refund_requests
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

-- Every write goes through the functions below. No direct policy: a customer
-- must not be able to mark their own request approved, and an operator must
-- not be able to invent one against an order nobody complained about.
revoke insert, update, delete on public.refund_requests from anon, authenticated;


/** Ask for a refund on your own order. */
create or replace function public.request_refund(p_order_no text, p_reason text default '')
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare
  uid uuid := auth.uid();
  ord public.orders%rowtype;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  select * into ord from public.orders where order_no = p_order_no;
  if ord.id is null or ord.user_id is distinct from uid then
    return jsonb_build_object('ok', false, 'reason', 'no_such_order');
  end if;

  -- Nothing to give back before the money arrived, and nothing left to give
  -- back once it has gone.
  if ord.paid_at is null then
    return jsonb_build_object('ok', false, 'reason', 'not_paid');
  end if;
  if ord.status in ('refunded', 'reversed', 'payment_failed', 'cancelled') then
    return jsonb_build_object('ok', false, 'reason', 'already_settled');
  end if;

  insert into public.refund_requests (order_no, user_id, reason, status)
  values (p_order_no, uid, left(coalesce(p_reason, ''), 1000), 'pending')
  on conflict (order_no) do update
    set status = 'pending',
        reason = left(coalesce(p_reason, ''), 1000),
        requested_at = now(),
        decided_at = null,
        decided_by = null
    where public.refund_requests.status in ('declined', 'cancelled');

  insert into public.audit_log (actor, action, subject, detail)
  values (private.actor(), 'refund.requested', p_order_no,
          jsonb_build_object('reason', left(coalesce(p_reason, ''), 300),
                             'orderTotal', ord.total, 'orderStatus', ord.status));

  return jsonb_build_object('ok', true, 'status', 'pending');
end $$;

revoke all on function public.request_refund(text, text) from public, anon;
grant execute on function public.request_refund(text, text) to authenticated;


/** Change your mind, while it is still waiting. */
create or replace function public.cancel_refund_request(p_order_no text)
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  update public.refund_requests
     set status = 'cancelled', decided_at = now(), decided_by = 'member'
   where order_no = p_order_no and user_id = uid and status = 'pending';
  get diagnostics n = row_count;

  return jsonb_build_object('ok', n > 0, 'reason', case when n = 0 then 'nothing_pending' else null end);
end $$;

revoke all on function public.cancel_refund_request(text) from public, anon;
grant execute on function public.cancel_refund_request(text) to authenticated;


/*
 * Turn one down.
 *
 * Declining is a real answer — a used cosmetic cannot be resold, and
 * 전자상거래법 allows refusal on those grounds — but it has to be said out
 * loud, with a reason the customer can read. Hence the note being required.
 */
create or replace function public.decline_refund_request(p_order_no text, p_note text)
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare n int;
begin
  if not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not_an_operator');
  end if;
  if btrim(coalesce(p_note, '')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'reason_required');
  end if;

  update public.refund_requests
     set status = 'declined', decided_at = now(),
         decided_by = private.actor(), note = left(p_note, 1000)
   where order_no = p_order_no and status = 'pending';
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'reason', 'nothing_pending'); end if;

  insert into public.audit_log (actor, action, subject, detail)
  values (private.actor(), 'refund.declined', p_order_no,
          jsonb_build_object('note', left(p_note, 300)));

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.decline_refund_request(text, text) from public, anon;
grant execute on function public.decline_refund_request(text, text) to authenticated;


/*
 * Close the request when the money actually moves.
 *
 * Called from reverse_checkout, so a refund issued straight from PayPal's
 * dashboard — with no request behind it — still leaves the queue consistent.
 */
create or replace function private.close_refund_request(p_order_no text)
returns void language plpgsql security definer
set search_path = public, private, pg_temp as $$
begin
  update public.refund_requests
     set status = 'done', decided_at = coalesce(decided_at, now()),
         decided_by = coalesce(decided_by, 'paypal')
   where order_no = p_order_no and status in ('pending', 'approved');
end $$;


/** The operator's queue, with enough of the order to decide without clicking. */
create or replace function public.admin_refund_queue()
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
begin
  if not private.is_admin() then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(row_to_json(q) order by q.requested_at)
    from (
      select r.order_no, r.reason, r.amount, r.status, r.requested_at, r.note,
             o.total, o.refunded_total, o.status as order_status,
             o.ship_name, o.ship_country, o.paid_at, o.payment_capture_id
      from public.refund_requests r
      join public.orders o on o.order_no = r.order_no
      where r.status = 'pending'
    ) q
  ), '[]'::jsonb);
end $$;

revoke all on function public.admin_refund_queue() from public, anon;
grant execute on function public.admin_refund_queue() to authenticated;
