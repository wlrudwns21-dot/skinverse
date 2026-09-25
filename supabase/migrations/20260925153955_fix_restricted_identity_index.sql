/*
 * The same mistake as `ingredients_identity_idx`, made again one table later.
 *
 * `restricted_identity_idx` was created over `(kor_name, category,
 * coalesce(cas_no, ''))`. That coalesce makes it an expression index, and
 * `on conflict (kor_name, category, cas_no)` only matches an index on the bare
 * columns — so the sync would have failed on its first upsert, exactly as the
 * ingredient table's would have.
 *
 * `nulls not distinct` does the whole job on its own: it is what makes two
 * entries with the same name and no CAS number collide, and it covers a null
 * `category` at the same time, which the coalesce never did.
 */
drop index if exists public.restricted_identity_idx;

create unique index if not exists restricted_identity_idx
  on public.restricted_ingredients (kor_name, category, cas_no) nulls not distinct;

comment on index public.restricted_identity_idx is
  '동일성 기준: 국문명 + 구분 + CAS번호. 같은 원료가 여러 구분(사용금지/제한)에 오를 수 있어 구분까지 키에 넣습니다.';
