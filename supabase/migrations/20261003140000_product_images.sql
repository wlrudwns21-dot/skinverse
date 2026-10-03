/**
 * Where a product's photographs live.
 *
 * Two columns, because the two kinds of image a product has are not the same
 * kind of thing.
 *
 * `image` is one path to the main shot — the square-ish bottle photograph that
 * goes in the shelf tile and at the top of the detail page. It is a path under
 * `public/`, not a URL and not a stored blob: the files ship with the build, so
 * they are versioned with the code that crops them and cost nothing to serve.
 * The default is the empty string rather than null so the frontend has one
 * falsy case to test instead of two; an unphotographed product paints its
 * gradient placeholder, which is also what a broken path falls back to.
 *
 * `detail_pages` is a map of locale to path, because the brand's long-form
 * detail artwork is typeset per language — the Korean page and the Thai page
 * are different images, not one image with different captions. A jsonb object
 * keyed by locale lets a product carry four, or one, or none, without a column
 * per language and without a second table for what is a single lookup.
 *
 * Neither column is nullable and neither gates `active`: a product with no
 * photograph is a product we can still describe and still sell, unlike a
 * product with no verified ingredient list.
 */

alter table public.products
  add column if not exists image text not null default '',
  add column if not exists detail_pages jsonb not null default '{}'::jsonb;

comment on column public.products.image is
  'Path under public/ to the main product shot, e.g. /products/<id>/main.webp. Empty when unphotographed.';
comment on column public.products.detail_pages is
  'Locale → path under public/ for the brand''s long-form detail artwork, e.g. {"ko":"/products/<id>/detail-ko.webp"}.';
