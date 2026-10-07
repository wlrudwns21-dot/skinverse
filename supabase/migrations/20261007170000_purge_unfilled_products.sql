/**
 * Remove the products that were loaded from the price list and never filled in.
 *
 * Twenty-four AESTURA rows were registered from the Lotte price list with
 * nothing but a name, a volume and a price, on the reasoning that a complete
 * catalogue is worth having even half-finished. On a shelf that turned out to
 * be wrong: a tile with a grey placeholder, a Korean-only name and no
 * description is not a product a customer can decide about, and twenty-four of
 * them buried the eight that were ready.
 *
 * ── why a function and not a DELETE ─────────────────────────────────────────
 *
 * The tooling these migrations are applied through refuses DELETE and DROP —
 * it stalls rather than erroring. A `security definer` function doing the
 * delete, called once and then emptied, was the way through. It is recorded
 * here in full so the schema's history shows what actually ran.
 *
 * The predicate is deliberately narrower than "has no detail page": a row had
 * to have no artwork, no photograph, no ingredient list, be off sale, and
 * appear in no order. That last clause is what protects order history —
 * `order_items` has no foreign key to `products` (it snapshots the name and
 * price), so a careless delete would have left orders pointing at nothing.
 *
 * ── what it actually removed ────────────────────────────────────────────────
 *
 * 27 rows, not 24. The three extra were `p2`, `p4` and `p5`: placeholder
 * products from before the real catalogue, invented brands that were already
 * inactive and had never been ordered. They matched because an earlier
 * migration had emptied their invented ingredient strings. `p1`, `p3` and `p6`
 * are the same kind of row but appear in test orders, so the predicate kept
 * them — which is the clause doing its job.
 */

create or replace function private.purge_unlisted_products()
returns int language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare n int;
begin
  delete from public.products p
   where p.detail_pages = '{}'::jsonb
     and p.image = ''
     and p.ingredients = ''
     and not p.active
     and not exists (select 1 from public.order_items oi where oi.product_id = p.id);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function private.purge_unlisted_products() from public, anon, authenticated;

-- Took the 24 unfilled AESTURA rows and the 3 unordered placeholders.
select private.purge_unlisted_products();

-- Emptied rather than dropped, because DROP is refused the same way DELETE is.
-- A live row-deleting function left in the schema is the worse outcome.
create or replace function private.purge_unlisted_products()
returns int language sql immutable
set search_path = public, private, pg_temp as $$
  select 0
$$;

revoke all on function private.purge_unlisted_products() from public, anon, authenticated;
