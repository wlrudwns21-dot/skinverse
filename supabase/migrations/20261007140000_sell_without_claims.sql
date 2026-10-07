/**
 * What an unverified product may not do is make claims — not exist.
 *
 * ── what this replaces ──────────────────────────────────────────────────────
 *
 * `products_checked_when_active` said: a product cannot go on sale until its
 * ingredient list has been checked. That conflated two different things.
 *
 * The one that matters is that nothing we publish about a product's
 * composition may be unverified. Writing "니아신아마이드가 여섯 번째입니다"
 * from a product name rather than from a label is the failure this catalogue
 * has to be unable to commit, and a printed 전성분 list nobody compared with
 * the maker's own is the same failure in a different font.
 *
 * The one that does not matter is selling at all. A listing with a name, a
 * price, a photograph and no ingredient claims makes no assertion that could
 * be wrong. Refusing to sell it protected nobody; it only meant 26 products
 * the shop legitimately stocks could not be bought.
 *
 * ── the rule now ────────────────────────────────────────────────────────────
 *
 * A product that is not `ingredients_checked` must carry nothing derived from
 * an ingredient list: no 전성분, no INCI, and none of the three analysis
 * arrays. It may be sold. The moment anyone writes an ingredient into it, the
 * database refuses until a human has checked it — which is the same gate as
 * before, moved to where the claim is actually made.
 *
 * `products_priced_when_active` is untouched: a product still may not go on
 * sale for nothing.
 */

-- The six placeholder rows predate the catalogue and carry invented ingredient
-- strings for products that do not exist. They are inactive and unreferenced by
-- anything a customer sees; emptying them is what makes them honest, not just
-- what makes the constraint pass.
update public.products
set ingredients = '', inci = ''
where not ingredients_checked and (ingredients <> '' or inci <> '');

alter table public.products drop constraint if exists products_checked_when_active;

alter table public.products
  add constraint products_no_unverified_claims
  check (
    ingredients_checked
    or (ingredients = '' and inci = ''
        and fits = '[]'::jsonb and pros = '[]'::jsonb and cons = '[]'::jsonb)
  );

comment on constraint products_no_unverified_claims on public.products is
  'An unverified product may be sold, but may not carry an ingredient list, an INCI list or any analysis derived from one.';
