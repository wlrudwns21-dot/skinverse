/**
 * What a product is for, as the shop can actually say it.
 *
 * Until now a product carried one `metric` — the single scan axis it answered
 * to — and one `why` paragraph. That is enough to recommend with and not
 * enough to be read. A customer deciding between two creams wants to know
 * when in the day it goes on, which of their readings it speaks to, and what
 * about it might not suit them.
 *
 * ── the rule this encodes ───────────────────────────────────────────────────
 *
 * Every claim here has to come off the product's own ingredient list. The
 * catalogue is being loaded from a supplier sheet where some products have a
 * verified INCI list and some have none at all, and the difference between
 * those two cases is the difference between analysis and invention.
 *
 * So `ingredients_checked` is not a note to ourselves — it gates `active`. A
 * product whose ingredients nobody has verified cannot go on sale, and no
 * amount of being in a hurry can route around it, because the database
 * refuses the row.
 */

alter table public.products
  -- The supplier's own product line, e.g. 아토베리어365. Products are browsed
  -- by line long before they are browsed by scan axis.
  add column if not exists line text not null default '',

  -- When in the day this belongs. 'both' is the honest default for anything
  -- that genuinely works either side of the day, not a shrug.
  add column if not exists slot text not null default 'both',

  -- Where in the sequence: cleanse, toner, serum, cream, spf, mask, body.
  -- Free text rather than an enum because a supplier will ship a step we have
  -- not thought of, and a failed insert is worse than an unfamiliar word.
  add column if not exists step text not null default '',

  -- The full English INCI list, kept verbatim. The Korean list already lives
  -- in `ingredients`; this is what a customer reading in another language
  -- searches against, and what a later ingredient scan matches on.
  add column if not exists inci text not null default '',

  -- Whether someone has checked this product's ingredient list against the
  -- maker's own published one. See the constraint below.
  add column if not exists ingredients_checked boolean not null default false,

  -- [{ axis, strength, note: {ko,en,zh,th} }] — which scan readings this
  -- product speaks to, how strongly, and why, in the customer's language.
  add column if not exists fits jsonb not null default '[]'::jsonb,

  -- [{ko,en,zh,th}] each. What the list has going for it, and what to watch
  -- for. Both are required of a verified product: a product with no cons is a
  -- product nobody has actually read.
  add column if not exists pros jsonb not null default '[]'::jsonb,
  add column if not exists cons jsonb not null default '[]'::jsonb;

alter table public.products drop constraint if exists products_slot_known;
alter table public.products add constraint products_slot_known
  check (slot in ('am', 'pm', 'both'));

/**
 * Nothing goes on sale on unverified ingredients.
 *
 * The existing sample rows predate this and have no verified list, so they are
 * taken off sale here rather than grandfathered: they are placeholder brands
 * that a real catalogue is about to replace, and leaving them active would
 * mean the first thing the constraint does is lie.
 */
update public.products set active = false where not ingredients_checked;

alter table public.products drop constraint if exists products_checked_when_active;
alter table public.products add constraint products_checked_when_active
  check (not active or ingredients_checked);

comment on column public.products.ingredients_checked is
  'Someone compared this ingredient list against the maker''s published one. '
  'Gates `active`: an unverified product cannot be sold, because every line of '
  'its analysis is derived from the list.';
comment on column public.products.fits is
  'Which scan axes this answers to, as [{axis, strength, note}]. Supersedes the '
  'single `metric` column for display; `metric` still drives the match score.';
comment on column public.products.cons is
  'What to watch for. Required alongside `pros` for a verified product — a '
  'product with no cons is one nobody has read.';
