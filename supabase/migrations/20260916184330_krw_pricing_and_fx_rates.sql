/*
 * Price the shop in won, and show it to each customer in their own money.
 *
 * The business buys and sells in KRW, so that is what an operator should be
 * typing. Everything downstream — begin_checkout, the points maths, what
 * PayPal is told to charge — is in USD and works today, so this does not move
 * the settlement currency. It makes KRW the price that is *authored* and
 * leaves USD as the price that is *charged*, derived from it.
 *
 *   products.price_krw   what the operator sets. The real price.
 *   products.price       USD, recomputed from price_krw whenever either that
 *                        or the USD rate changes. Untouched by hand.
 *
 * Display in a third currency (CNY, THB) happens in the browser from these
 * rates. The customer is still charged in USD and the checkout says so —
 * quoting a price in baht and billing in dollars without saying it is how
 * people end up feeling cheated by a rounding difference.
 */

-- ── the rates ───────────────────────────────────────────────────────────────
--
-- Stored as "one unit of this currency is worth N won" rather than as a rate
-- against the dollar, because won is the thing every price starts as. KRW
-- itself sits in the table at 1 so nothing has to special-case it.
create table if not exists public.fx_rates (
  code          text primary key,
  label         text not null,
  symbol        text not null,
  krw_per_unit  numeric not null check (krw_per_unit > 0),
  /* How many decimal places this currency is normally written to. Won has
     none; a price of ₩39,200 must not render as ₩39,200.00. */
  decimals      int not null default 2 check (decimals between 0 and 4),
  sort          int not null default 0,
  active        boolean not null default true,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default 'system'
);

comment on column public.fx_rates.krw_per_unit is
  '이 통화 1단위가 몇 원인가. 예: USD 1400 = 1달러가 1,400원.';

/*
 * Seeds, and they are guesses.
 *
 * USD is set to 1400 because that is the number that leaves every existing
 * product at exactly the dollar price it already had — this migration must not
 * silently reprice the shop. It is not today's rate and the operator has to
 * set a real one; the admin screen shows when each rate was last touched for
 * that reason.
 */
insert into public.fx_rates (code, label, symbol, krw_per_unit, decimals, sort) values
  ('KRW', '대한민국 원', '₩',    1, 0, 1),
  ('USD', '미국 달러',   '$', 1400, 2, 2),
  ('CNY', '중국 위안',   '¥',  195, 2, 3),
  ('THB', '태국 바트',   '฿',   40, 2, 4)
on conflict (code) do nothing;

alter table public.fx_rates enable row level security;

-- Everyone reads: the storefront cannot convert a price without them.
drop policy if exists "anyone reads rates" on public.fx_rates;
create policy "anyone reads rates" on public.fx_rates
  for select to anon, authenticated using (active or private.is_admin());

drop policy if exists "admin writes rates" on public.fx_rates;
create policy "admin writes rates" on public.fx_rates
  for all to authenticated using (private.is_admin()) with check (private.is_admin());


-- ── the won price ───────────────────────────────────────────────────────────
alter table public.products
  add column if not exists price_krw numeric not null default 0 check (price_krw >= 0);

comment on column public.products.price_krw is
  '판매가(원). 이것이 원본이고, price(USD)는 여기서 환율로 계산됩니다.';

-- Nothing changes price today: 28 USD × 1400 = 39,200 KRW ÷ 1400 = 28 USD.
update public.products set price_krw = round(price * 1400) where price_krw = 0;

-- A live product with no price is a free product. The checkout would happily
-- sell it for nothing.
alter table public.products drop constraint if exists products_priced_when_active;
alter table public.products add constraint products_priced_when_active
  check (not active or price_krw > 0);


-- ── the cost, which customers must not see ──────────────────────────────────
/*
 * A separate table, not two more columns on `products`.
 *
 * `products` is readable by anon — that is how the shop renders — and row
 * level security cannot hide a column. Cost price and margin are the two
 * numbers a competitor would most like to have, so they live somewhere with no
 * public read policy at all rather than one column-grant mistake away from
 * being served to every visitor.
 */
create table if not exists public.product_costs (
  product_id  text primary key references public.products(id) on delete cascade,
  cost_krw    numeric not null default 0 check (cost_krw >= 0),
  /* Percent added to cost to reach the sale price. 40 means ×1.4. */
  margin_pct  numeric not null default 0 check (margin_pct > -100),
  note        text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'system'
);

alter table public.product_costs enable row level security;

drop policy if exists "admin reads costs" on public.product_costs;
create policy "admin reads costs" on public.product_costs
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

revoke all on public.product_costs from anon;


-- ── keeping the charged price in step with the authored one ─────────────────
/*
 * `products.price` is what PayPal is told to charge, so it may never disagree
 * with the won price an operator set. It is recomputed rather than stored
 * twice: from price_krw and the USD rate, and from nothing else.
 *
 * Both inputs can move, so both have to trigger it — a new won price on one
 * product, or a new USD rate across every product at once.
 */
create or replace function private.usd_rate()
returns numeric language sql stable set search_path = public, private, pg_temp as $$
  select krw_per_unit from public.fx_rates where code = 'USD'
$$;

create or replace function private.settle_price(p_krw numeric)
returns numeric language sql immutable set search_path = public, private, pg_temp as $$
  -- Two decimals, because that is all PayPal accepts for USD. Never below one
  -- cent for a product that costs anything: a ₩1 item must not become free.
  select case when coalesce(p_krw, 0) <= 0 then 0
              else greatest(0.01, round(p_krw / private.usd_rate(), 2)) end
$$;

create or replace function private.sync_product_price()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp as $$
begin
  new.price := private.settle_price(new.price_krw);
  return new;
end $$;

drop trigger if exists products_sync_price on public.products;
create trigger products_sync_price
  before insert or update of price_krw on public.products
  for each row execute function private.sync_product_price();

/** Re-derive every product's charged price. Run after the USD rate moves. */
create or replace function public.resync_product_prices()
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare n int;
begin
  if not private.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'not_an_operator');
  end if;

  update public.products
     set price = private.settle_price(price_krw), updated_at = now()
   where price is distinct from private.settle_price(price_krw);
  get diagnostics n = row_count;

  insert into public.audit_log (actor, action, subject, detail)
  values (private.actor(), 'catalog.reprice', 'products',
          jsonb_build_object('rowsChanged', n, 'usdRate', private.usd_rate()));

  return jsonb_build_object('ok', true, 'rowsChanged', n, 'usdRate', private.usd_rate());
end $$;

revoke all on function public.resync_product_prices() from public, anon;
grant execute on function public.resync_product_prices() to authenticated;

-- The USD rate moving reprices the whole shop, so it is worth one line in the
-- log saying who moved it and to what.
create or replace function public.audit_fx_change()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp as $$
begin
  if tg_op = 'UPDATE' and new.krw_per_unit is not distinct from old.krw_per_unit then
    return new;
  end if;
  insert into public.audit_log (actor, action, subject, detail)
  values (private.actor(), 'fx.change', new.code,
          jsonb_build_object(
            'from', case when tg_op = 'UPDATE' then old.krw_per_unit else null end,
            'to', new.krw_per_unit,
            'repricesShop', new.code = 'USD'));
  return new;
end $$;

revoke all on function public.audit_fx_change() from public, anon, authenticated;

drop trigger if exists fx_rates_audit on public.fx_rates;
create trigger fx_rates_audit
  after insert or update on public.fx_rates
  for each row execute function public.audit_fx_change();
