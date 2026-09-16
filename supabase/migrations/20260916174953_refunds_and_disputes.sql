alter table public.orders
  add column if not exists refunded_total numeric not null default 0
    check (refunded_total >= 0),
  add column if not exists refunded_at timestamptz;

comment on column public.orders.refunded_total is
  '이 주문에서 지금까지 돌려준 금액의 합계. 부분 환불이 여러 번 일어날 수 있어 누적합으로 둡니다.';

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status = any (array[
    'pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled',
    'partly_refunded', 'refunded', 'reversed', 'payment_failed'
  ])
);

create or replace function private.guard_payment_status()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare
  frozen constant text[] := array['partly_refunded', 'refunded', 'reversed', 'payment_failed'];
begin
  if new.status is not distinct from old.status then return new; end if;

  if current_setting('role', true) = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.status = any (frozen) then
    raise exception '결제 상태(%)는 결제사 웹훅으로만 기록됩니다.', new.status
      using errcode = 'check_violation';
  end if;

  if old.status = any (frozen) then
    raise exception '환불·분쟁 처리된 주문(%)의 상태는 되돌릴 수 없습니다.', old.status
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists guard_payment_status on public.orders;
create trigger guard_payment_status
  before update of status on public.orders
  for each row execute function private.guard_payment_status();

create index if not exists audit_log_payment_ref_idx
  on public.audit_log (action, (detail ->> 'ref'))
  where detail ? 'ref';

create or replace function public.reverse_checkout(
  p_order_no text,
  p_kind text,
  p_amount numeric,
  p_ref text,
  p_note text
)
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare
  ord public.orders%rowtype;
  amt numeric;
  was_refunded numeric;
  now_refunded numeric;
  is_full boolean;
  new_status text;
  clawed_before int := 0;
  claw_target int := 0;
  claw int := 0;
  taken int := 0;
  short int := 0;
  returned int := 0;
  bal int;
  item record;
  restocked boolean := false;
  n int;
begin
  if p_kind is null or p_kind not in ('refund', 'reversal', 'denied') then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;

  select * into ord from public.orders where order_no = p_order_no for update;
  if ord.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_such_order');
  end if;

  if p_ref is not null and exists (
    select 1 from public.audit_log
     where action in ('order.refunded', 'order.reversed', 'order.payment_failed')
       and detail ->> 'ref' = p_ref
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true, 'orderNo', p_order_no);
  end if;

  if ord.status = 'pending' then
    if p_kind = 'denied' then
      perform public.void_checkout(p_order_no, coalesce(p_note, '결제 거절로 자동 취소'));
      return jsonb_build_object('ok', true, 'orderNo', p_order_no, 'voided', true);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'not_settled');
  end if;

  if ord.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'reason', 'already_cancelled');
  end if;

  amt := greatest(0, coalesce(p_amount, ord.total));
  was_refunded := coalesce(ord.refunded_total, 0);
  now_refunded := least(ord.total, was_refunded + amt);
  is_full := ord.total <= 0 or now_refunded >= ord.total;

  new_status := case
    when p_kind = 'denied' then 'payment_failed'
    when p_kind = 'reversal' then 'reversed'
    when is_full then 'refunded'
    else 'partly_refunded'
  end;

  if ord.paid_at is not null and ord.points_earned > 0 and ord.user_id is not null then
    if ord.total > 0 then
      clawed_before := round(ord.points_earned * (was_refunded / ord.total))::int;
      claw_target := round(ord.points_earned * (now_refunded / ord.total))::int;
    else
      claw_target := ord.points_earned;
    end if;
    claw := greatest(0, claw_target - clawed_before);
  end if;

  if is_full and p_kind in ('refund', 'denied')
     and ord.points_used > 0 and ord.user_id is not null then
    returned := ord.points_used;
  end if;

  if ord.user_id is not null and (claw > 0 or returned > 0) then
    select points into bal from public.profiles where id = ord.user_id for update;
    if bal is not null then
      taken := least(claw, greatest(0, bal + returned));
      short := claw - taken;
      update public.profiles
         set points = bal + returned - taken, updated_at = now()
       where id = ord.user_id;
    end if;
  end if;

  if p_kind = 'denied' then
    for item in select product_id, qty from public.order_items where order_id = ord.id loop
      update public.products
         set stock = stock + item.qty, sold = greatest(0, sold - item.qty)
       where id = item.product_id;
    end loop;
    restocked := true;
  end if;

  update public.orders
     set status = new_status,
         refunded_total = now_refunded,
         refunded_at = now()
   where id = ord.id;
  get diagnostics n = row_count;

  insert into public.audit_log (actor, action, subject, detail)
  values (
    'system',
    case p_kind
      when 'denied' then 'order.payment_failed'
      when 'reversal' then 'order.reversed'
      else 'order.refunded'
    end,
    p_order_no,
    jsonb_build_object(
      'ref', p_ref, 'kind', p_kind, 'amount', amt,
      'refundedTotal', now_refunded, 'orderTotal', ord.total, 'full', is_full,
      'statusFrom', ord.status, 'statusTo', new_status,
      'pointsClawedBack', taken, 'pointsShort', short, 'pointsReturned', returned,
      'stockReturned', restocked, 'note', left(coalesce(p_note, ''), 300)
    )
  );

  return jsonb_build_object(
    'ok', n > 0, 'orderNo', p_order_no, 'status', new_status, 'full', is_full,
    'refundedTotal', now_refunded, 'pointsClawedBack', taken,
    'pointsShort', short, 'pointsReturned', returned, 'stockReturned', restocked
  );
end $$;

revoke all on function public.reverse_checkout(text, text, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.reverse_checkout(text, text, numeric, text, text)
  to service_role;
