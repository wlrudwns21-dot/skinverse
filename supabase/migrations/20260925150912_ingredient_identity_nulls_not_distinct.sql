/*
 * Make the identity index one that `on conflict` can actually use.
 *
 * The previous index was on `(kor_name, coalesce(cas_no, ''))`, which does keep
 * duplicates out but is an expression index — and `on conflict (kor_name,
 * cas_no)` only matches an index on those bare columns. The sync would have
 * failed on its first upsert.
 *
 * `nulls not distinct` gets the same effect honestly: two rows with the same
 * name and no CAS number collide, instead of Postgres' default of treating
 * every null as its own value and letting the register's blanks in twice over.
 */
drop index if exists public.ingredients_identity_idx;

create unique index if not exists ingredients_identity_idx
  on public.ingredients (kor_name, cas_no) nulls not distinct;

comment on index public.ingredients_identity_idx is
  '식약처 기준의 원료 동일성: 국문명 + CAS번호. CAS번호가 없는 항목끼리도 같은 이름이면 중복으로 봅니다.';
