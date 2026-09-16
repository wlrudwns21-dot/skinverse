/*
 * place_order now takes the stock it sells.
 *
 * It priced the basket from `products` but never looked at `stock`, so three
 * units in hand could be sold a hundred times and the shortfall would only
 * surface when someone went to pack the boxes. Two customers checking out at
 * the same instant is the ordinary case, not the exotic one.
 *
 * The decrement is the reservation: `set stock = stock - qty where stock >= qty`
 * either matches a row or it does not, under the row lock Postgres takes for
 * the update. Two concurrent orders for the last unit cannot both match — the
 * second waits for the first to commit, then sees stock = 0 and fails. There is
 * no read-then-write window to lose.
 *
 * Everything is one transaction, so a line that cannot be filled rolls back the
 * lines already taken. A half-reserved order never exists.
 */
create or replace function public.place_order(
  p_ship_method  text,
  p_ship_name    text,
  p_ship_country text,
  p_ship_address text,
  p_use_points   boolean default true
)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  uid uuid := auth.uid();
  pts int;
  cap_pct int;
  earn_rate int;
  ship_fee numeric;
  ship_eta text;
  sub numeric := 0;
  lines int := 0;
  cap_pts int;
  used_pts int;
  total numeric;
  earned int;
  order_no text;
  new_order uuid;
  attempt int := 0;
  item record;
  taken int;
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

  select fee, eta into ship_fee, ship_eta
  from public.shipping_methods where id = p_ship_method and active;
  if ship_fee is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_ship_method');
  end if;

  -- The bag as the database has it. Anything the caller believes about it is
  -- not consulted: a line that is not in cart_items is not in this order.
  select coalesce(sum(p.price * c.qty), 0), count(*)
    into sub, lines
  from public.cart_items c
  join public.products p on p.id = c.product_id and p.active
  where c.user_id = uid;

  if lines = 0 then
    return jsonb_build_object('ok', false, 'reason', 'cart_empty');
  end if;

  select use_cap_pct, earn_per_dollar into cap_pct, earn_rate from public.store_settings limit 1;
  cap_pct := coalesce(cap_pct, 0);
  earn_rate := coalesce(earn_rate, 0);

  -- 100 points buy $1, and points may cover at most use_cap_pct of the goods.
  cap_pts := floor(sub * cap_pct / 100.0)::int * 100;
  used_pts := case when coalesce(p_use_points, true) then least(pts, cap_pts) else 0 end;
  total := greatest(0, sub + ship_fee - (used_pts / 100.0));
  earned := round(total * earn_rate)::int;

  -- Reserve the goods before writing the order, so a failure here leaves no
  -- order behind at all. Ordered by product id: two baskets holding the same
  -- two products take their locks in the same sequence and cannot deadlock.
  for item in
    select c.product_id, c.qty
    from public.cart_items c
    join public.products p on p.id = c.product_id and p.active
    where c.user_id = uid
    order by c.product_id
  loop
    update public.products
       set stock = stock - item.qty, sold = sold + item.qty
     where id = item.product_id and stock >= item.qty
    returning stock into taken;

    if taken is null then
      -- Rolls back every reservation already taken in this call.
      return jsonb_build_object(
        'ok', false, 'reason', 'insufficient_stock',
        'productId', item.product_id,
        'wanted', item.qty,
        'available', (select p.stock from public.products p where p.id = item.product_id)
      );
    end if;
  end loop;

  -- Order numbers are visible to the customer, so they stay short; the unique
  -- index is the authority and this just retries until it wins.
  loop
    attempt := attempt + 1;
    order_no := 'SV-' || to_char(now(), 'YYMM') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    begin
      insert into public.orders (
        user_id, order_no, subtotal, shipping, points_used, total, points_earned,
        ship_method, eta, ship_name, ship_country, ship_address, status
      ) values (
        uid, order_no, sub, ship_fee, used_pts, total, earned,
        p_ship_method, ship_eta, name_t, country_t, address_t, 'paid'
      ) returning id into new_order;
      exit;
    exception when unique_violation then
      if attempt >= 8 then raise; end if;
    end;
  end loop;

  -- The lines are read from the same join, so an order can never total one
  -- thing and itemise another.
  insert into public.order_items (order_id, product_id, brand, product_name, unit_price, qty)
  select new_order, p.id, p.brand, p.name, p.price, c.qty
  from public.cart_items c
  join public.products p on p.id = c.product_id and p.active
  where c.user_id = uid;

  delete from public.cart_items where user_id = uid;

  update public.profiles set points = pts - used_pts + earned, updated_at = now() where id = uid;

  return jsonb_build_object(
    'ok', true,
    'orderNo', order_no,
    'subtotal', sub,
    'shipping', ship_fee,
    'pointsUsed', used_pts,
    'total', total,
    'pointsEarned', earned,
    'eta', ship_eta,
    'points', pts - used_pts + earned
  );
end $$;

revoke all on function public.place_order(text, text, text, text, boolean) from public, anon;
grant execute on function public.place_order(text, text, text, text, boolean) to authenticated;
