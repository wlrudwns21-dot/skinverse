/*
 * When the money actually goes back, the request stops being open.
 *
 * A trigger rather than a line inside reverse_checkout, because a refund does
 * not always start with a request: an operator may issue one straight from
 * PayPal's dashboard, and the queue must not keep showing a customer waiting
 * for something they have already been given.
 */
create or replace function private.close_refund_on_reversal()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp as $$
begin
  if new.status is distinct from old.status
     and new.status in ('refunded', 'partly_refunded', 'reversed', 'payment_failed') then
    perform private.close_refund_request(new.order_no);
  end if;
  return new;
end $$;

drop trigger if exists orders_close_refund_request on public.orders;
create trigger orders_close_refund_request
  after update of status on public.orders
  for each row execute function private.close_refund_on_reversal();
