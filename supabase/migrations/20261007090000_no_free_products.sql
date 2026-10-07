/**
 * A product on sale has to cost something.
 *
 * `price_krw` defaults to 0 and `price` is derived from it, so a row that was
 * registered before anyone knew its price carries ₩0 — and ₩0 settles to the
 * one-cent floor in `private.settle_price`, not to a refusal. Nothing stopped
 * such a row from being switched on, and the first person to notice would have
 * been whoever bought a toner for a penny.
 *
 * It is written as a CHECK rather than as a rule in the admin screen for the
 * same reason `products_checked_when_active` is: a price of zero is not a
 * thing an operator should be able to publish by clicking the wrong row at the
 * end of a long day, and the storefront is not the only thing that writes here.
 *
 * Inactive rows are untouched. Registering a product before its price is known
 * is normal — that is how the catalogue gets loaded.
 */

alter table public.products
  add constraint products_priced_when_active
  check (not active or price_krw > 0);
