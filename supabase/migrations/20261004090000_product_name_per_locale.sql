/**
 * The product name, in the language the customer reads.
 *
 * `name` has always been one string, which meant a Korean customer in a
 * Korean-first shop read "Regederm365 Skin Tightening Capsule Serum" while the
 * box in their hand says 리제덤365 모공탄력 캡슐세럼. The maker publishes a
 * name per market, and those names are not translations of each other — the
 * Chinese name of the sunscreen is 屏障水润物理防晒霜, not a transliteration.
 *
 * ── why a new column and not a rewrite of `name` ────────────────────────────
 *
 * `name` is what `place_order` copies into `order_items.product_name`, and an
 * order is a financial record: it is read later by an operator, by a refund,
 * by customs on an outbound parcel, and by whoever reconciles PayPal. Those
 * readers are not the shopper and do not share the shopper's language, so the
 * invoice stays in one stable language. `name` keeps that job and holds the
 * maker's English name.
 *
 * `name_l` is for the screen only. A locale missing from it falls back to
 * `name`, which is why Thai is absent for every product here — the maker's own
 * Thai page prints the English name, so storing a copy of it would be storing
 * the same fact twice.
 */

alter table public.products
  add column if not exists name_l jsonb not null default '{}'::jsonb;

comment on column public.products.name_l is
  'Product name by locale, for display only. Missing locale falls back to products.name, which is what orders record.';
