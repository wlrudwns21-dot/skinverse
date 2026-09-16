/*
 * Two holes the probe found.
 *
 * 1. A capture that lands after the order was cancelled.
 *
 *    The customer abandons checkout, the stock goes back on the shelf, and
 *    then PayPal captures anyway — a slow webhook, a retried call, a customer
 *    who left the tab open and pressed pay. We took the money and have no
 *    order to fulfil.
 *
 *    settle_checkout returned `alreadySettled: true` for that, which is
 *    technically harmless — it grants nothing — and operationally terrible,
 *    because it reports success and nobody ever finds out. It now says
 *    `conflict` and writes the fact down, so someone can refund it.
 *
 *    It still returns ok, deliberately: PayPal retries a webhook that fails,
 *    and retrying will not un-cancel the order. Better to accept the delivery
 *    and raise a flag than to be redelivered the same problem for three days.
 */
create or replace function public.settle_checkout(
  p_order_no text,
  p_provider text default 'paypal',
  p_order_id text default null,
  p_capture_id text default null
)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  ord public.orders%rowtype;
  n int;
begin
  select * into ord from public.orders where order_no = p_order_no for update;
  if ord.id is null then return jsonb_build_object('ok', false, 'reason', 'no_such_order'); end if;

  -- Money arrived for something that is not waiting for money.
  if ord.status = 'cancelled' then
    insert into public.audit_log (actor, action, subject, detail)
    values ('system', 'payment.orphaned', p_order_no,
            jsonb_build_object(
              'provider', p_provider, 'orderId', p_order_id, 'captureId', p_capture_id,
              'total', ord.total,
              'note', '취소된 주문에 결제가 들어왔습니다. 환불이 필요할 수 있습니다.'));
    return jsonb_build_object('ok', true, 'conflict', 'cancelled', 'orderNo', p_order_no,
                              'total', ord.total);
  end if;

  if ord.status <> 'pending' then
    return jsonb_build_object('ok', true, 'alreadySettled', true, 'orderNo', p_order_no);
  end if;

  update public.orders
     set status = 'paid', paid_at = now(),
         payment_provider = coalesce(p_provider, payment_provider),
         payment_order_id = coalesce(p_order_id, payment_order_id),
         payment_capture_id = coalesce(p_capture_id, payment_capture_id)
   where id = ord.id and status = 'pending';
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', true, 'alreadySettled', true, 'orderNo', p_order_no);
  end if;

  if ord.points_earned > 0 and ord.user_id is not null then
    update public.profiles set points = points + ord.points_earned, updated_at = now()
     where id = ord.user_id;
  end if;

  if ord.user_id is not null then
    delete from public.cart_items where user_id = ord.user_id;
  end if;

  insert into public.audit_log (actor, action, subject, detail)
  values ('system', 'order.paid', p_order_no,
          jsonb_build_object('provider', p_provider, 'captureId', p_capture_id,
                             'total', ord.total, 'pointsEarned', ord.points_earned));

  return jsonb_build_object('ok', true, 'alreadySettled', false, 'orderNo', p_order_no,
                            'pointsEarned', ord.points_earned);
end $$;

revoke all on function public.settle_checkout(text, text, text, text) from public, anon, authenticated;
grant execute on function public.settle_checkout(text, text, text, text) to service_role;


/*
 * 2. A checkout nobody finished.
 *
 *    begin_checkout allows one open order at a time, which stops a customer
 *    pinning the whole shelf by reloading. The cost is that a browser closed
 *    mid-payment leaves stock reserved and that customer unable to check out
 *    again — for ever, because nothing was going to clean it up.
 *
 *    Thirty minutes is longer than any honest PayPal approval and short enough
 *    that a shelf is not held overnight. Voiding is safe even if the payment
 *    then lands: that is exactly the conflict case above, which is now loud.
 */
create or replace function public.expire_stale_checkouts(p_minutes int default 30)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  ord record;
  freed int := 0;
begin
  for ord in
    select order_no from public.orders
     where status = 'pending'
       and created_at < now() - make_interval(mins => greatest(1, p_minutes))
  loop
    perform public.void_checkout(ord.order_no, format('%s분 이상 미결제로 자동 취소', p_minutes));
    freed := freed + 1;
  end loop;

  return jsonb_build_object('ok', true, 'expired', freed);
end $$;

revoke all on function public.expire_stale_checkouts(int) from public, anon, authenticated;
grant execute on function public.expire_stale_checkouts(int) to service_role;
