/*
 * Align the table with the register's actual fields, now that they are known.
 *
 * `other_text` was a guess at a field that does not exist — the real records
 * split what it was meant to hold into LIMIT_COND (the concentration and
 * conditions) and PROVIS_ATRCL (the article being cited), which now have
 * columns of their own. Nothing was ever written to it, so it goes rather than
 * sitting there as a column no reader can interpret.
 *
 * `synonym` is added because it is load-bearing, not decorative: the whole
 * point of this table is to answer "is the thing on this label restricted", and
 * a label may print a synonym rather than the standard name. Keeping it only
 * inside `raw` would mean the answer existed but could not be indexed.
 */
alter table public.restricted_ingredients
  drop column if exists other_text,
  add column if not exists synonym text;

comment on column public.restricted_ingredients.synonym is
  '이명 (INGR_SYNONYM). 라벨이 표준명 대신 이명을 쓰는 경우를 찾기 위해 보관합니다.';
