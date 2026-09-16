/*
 * Checkout has to survive a payment step in the middle.
 *
 * `place_order` did everything in one statement, which was right while the
 * payment was a mock: reserve the stock, spend the points, write the order,
 * empty the basket. A real payment arrives between "what does this cost" and
 * "the money moved", and either half can fail on its own.
 *
 * So it splits three ways:
 *
 *   begin_checkout   reserve the stock, hold the points, write a `pending`
 *                    order, and say what it costs. Nothing is sold yet.
 *   settle_checkout  the money arrived. Mark it paid, grant the points earned,
 *                    empty the basket.
 *   void_checkout    it did not arrive. Put the stock and the points back.
 *
 * The important one is `settle_checkout`, and the reason is worth stating: two
 * different things call it. The browser calls it when PayPal's capture returns,
 * and PayPal's webhook calls it independently — that redundancy is the whole
 * point of the webhook, because the browser may be closed before it reports
 * back. So it will be called twice for most orders, sometimes at once, and it
 * must grant the points exactly once.
 */

-- 'pending' is an order nobody has paid for yet. It holds stock, so it is not
-- nothing, but it must never appear as a sale.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'));

alter table public.orders
  add column if not exists payment_provider text,
  -- PayPal's id for the order, which is how a webhook finds ours.
  add column if not exists payment_order_id text,
  add column if not exists payment_capture_id text,
  add column if not exists paid_at timestamptz;

create index if not exists orders_payment_order_id_idx
  on public.orders (payment_order_id) where payment_order_id is not null;
create index if not exists orders_pending_idx
  on public.orders (created_at) where status = 'pending';


-- ── phase 1: reserve ────────────────────────────────────────────────────────
create or replace function public.begin_checkout(
  p_ship_method  text,
  p_ship_name    text,
  p_ship_country text,
  p_ship_address text,
  p_use_points   boolean default true
)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := auth.uid();
  pts int; cap_pct int; earn_rate int;
  ship_fee numeric; ship_eta text;
  sub numeric := 0; lines int := 0;
  cap_pts int; used_pts int; total numeric; earned int;
  order_no text; new_order uuid; attempt int := 0;
  item record; taken int;
  name_t text := btrim(coalesce(p_ship_name, ''));
  country_t text := btrim(coalesce(p_ship_country, ''));
  address_t text := btrim(coalesce(p_ship_address, ''));
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;

  if name_t = '' or country_t = '' or address_t = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_address');
  end if;
  if length(name_t) > 120 or length(country_t) > 80 or length(address_t) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'address_too_long');
  end if;

  select points into pts from public.profiles where id = uid for update;
  if pts is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  -- An abandoned checkout holds stock and points. One open order at a time, so
  -- a customer who walks away cannot pin the whole shelf by reloading.
  if exists (select 1 from public.orders where user_id = uid and status = 'pending') then
    return jsonb_build_object('ok', false, 'reason', 'checkout_already_open');
  end if;

  select fee, eta into ship_fee, ship_eta
  from public.shipping_methods where id = p_ship_method and active;
  if ship_fee is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_ship_method');
  end if;

  select coalesce(sum(p.price * c.qty), 0), count(*) into sub, lines
  from public.cart_items c
  join public.products p on p.id = c.product_id and p.active
  where c.user_id = uid;

  if lines = 0 then return jsonb_build_object('ok', false, 'reason', 'cart_empty'); end if;

  select use_cap_pct, earn_per_dollar into cap_pct, earn_rate from public.store_settings limit 1;
  cap_pct := coalesce(cap_pct, 0);
  earn_rate := coalesce(earn_rate, 0);

  cap_pts := floor(sub * cap_pct / 100.0)::int * 100;
  used_pts := case when coalesce(p_use_points, true) then least(pts, cap_pts) else 0 end;
  total := greatest(0, sub + ship_fee - (used_pts / 100.0));
  earned := round(total * earn_rate)::int;

  -- Reserve the goods. Ordered by product id so two baskets holding the same
  -- two products take their locks in the same sequence and cannot deadlock.
  for item in
    select c.product_id, c.qty from public.cart_items c
    join public.products p on p.id = c.product_id and p.active
    where c.user_id = uid order by c.product_id
  loop
    update public.products set stock = stock - item.qty, sold = sold + item.qty
     where id = item.product_id and stock >= item.qty
    returning stock into taken;
    if taken is null then
      return jsonb_build_object('ok', false, 'reason', 'insufficient_stock',
        'productId', item.product_id, 'wanted', item.qty,
        'available', (select p.stock from public.products p where p.id = item.product_id));
    end if;
  end loop;

  loop
    attempt := attempt + 1;
    order_no := 'SV-' || to_char(now(), 'YYMM') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    begin
      insert into public.orders (
        user_id, order_no, subtotal, shipping, points_used, total, points_earned,
        ship_method, eta, ship_name, ship_country, ship_address, status
      ) values (
        uid, order_no, sub, ship_fee, used_pts, total, earned,
        p_ship_method, ship_eta, name_t, country_t, address_t, 'pending'
      ) returning id into new_order;
      exit;
    exception when unique_violation then
      if attempt >= 8 then raise; end if;
    end;
  end loop;

  insert into public.order_items (order_id, product_id, brand, product_name, unit_price, qty)
  select new_order, p.id, p.brand, p.name, p.price, c.qty
  from public.cart_items c
  join public.products p on p.id = c.product_id and p.active
  where c.user_id = uid;

  -- Points are spent here, not at settlement: they are part of what makes the
  -- total what it is, and a balance that could be spent twice while an order
  -- is open is the same bug as overselling. void_checkout puts them back.
  if used_pts > 0 then
    update public.profiles set points = pts - used_pts, updated_at = now() where id = uid;
  end if;

  return jsonb_build_object(
    'ok', true, 'orderNo', order_no, 'subtotal', sub, 'shipping', ship_fee,
    'pointsUsed', used_pts, 'total', total, 'pointsEarned', earned,
    'eta', ship_eta, 'points', pts - used_pts
  );
end $$;

revoke all on function public.begin_checkout(text, text, text, text, boolean) from public, anon;
grant execute on function public.begin_checkout(text, text, text, text, boolean) to authenticated, service_role;


-- ── phase 2: the money arrived ──────────────────────────────────────────────
/*
 * Idempotent by construction. The UPDATE carries `status = 'pending'` in its
 * WHERE clause, so the second caller changes zero rows and takes the early
 * return — it does not re-grant the points. Under concurrency the row lock
 * serialises the two, and the loser sees 'paid' rather than 'pending'.
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

  if ord.status <> 'pending' then
    -- Already settled, by whichever of the two callers got here first.
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
    update public.profiles
       set points = points + ord.points_earned, updated_at = now()
     where id = ord.user_id;
  end if;

  -- Only now: a basket emptied before payment is a basket the customer cannot
  -- get back if the payment fails.
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


-- ── phase 3: it did not arrive ──────────────────────────────────────────────
create or replace function public.void_checkout(p_order_no text, p_reason text default '')
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  ord public.orders%rowtype;
  item record;
  n int;
begin
  select * into ord from public.orders where order_no = p_order_no for update;
  if ord.id is null then return jsonb_build_object('ok', false, 'reason', 'no_such_order'); end if;

  -- A member may abandon their own checkout; the server may abandon anyone's.
  if auth.uid() is not null and ord.user_id is distinct from auth.uid() and not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not_yours');
  end if;

  if ord.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  update public.orders set status = 'cancelled' where id = ord.id and status = 'pending';
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'reason', 'not_pending'); end if;

  -- Put the shelf back.
  for item in select product_id, qty from public.order_items where order_id = ord.id loop
    update public.products set stock = stock + item.qty, sold = greatest(0, sold - item.qty)
     where id = item.product_id;
  end loop;

  if ord.points_used > 0 and ord.user_id is not null then
    update public.profiles set points = points + ord.points_used, updated_at = now()
     where id = ord.user_id;
  end if;

  insert into public.audit_log (actor, action, subject, detail)
  values (private.actor(), 'order.void', p_order_no,
          jsonb_build_object('reason', left(coalesce(p_reason, ''), 200),
                             'stockReturned', true, 'pointsReturned', ord.points_used));

  return jsonb_build_object('ok', true, 'pointsReturned', ord.points_used);
end $$;

revoke all on function public.void_checkout(text, text) from public, anon;
grant execute on function public.void_checkout(text, text) to authenticated, service_role;


-- A pending order holds stock. Nobody should see someone else's, and the shop
-- should not count them as sales.
drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders
  for select using ((select auth.uid()) = user_id);
