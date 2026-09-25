/*
 * 15111772 is a comparison of national rules, not a Korean list.
 *
 * Built from a guess at its shape, this table had no country. The real records
 * carry COUNTRY_NAME, and the same ingredient appears once per jurisdiction —
 * '2,4,5-트라이메틸아닐린' is 금지 under 아세안 and again under 중국, as two
 * separate facts about two separate markets. That is most of why the dataset has
 * 31,191 rows against the ingredient register's 21,897.
 *
 * Without `country` in the identity, an upsert would have folded every country's
 * ruling for one ingredient into a single row and kept whichever arrived last,
 * silently discarding the rest. The count would have looked plausible, which is
 * the worst kind of wrong.
 *
 * Keeping the country also turns this from a compliance footnote into something
 * the business actually needs: the store ships to several markets, and "is this
 * ingredient allowed where we are sending it" is a different question per
 * destination.
 */
alter table public.restricted_ingredients
  add column if not exists country      text,
  /** The name as that country's own notice writes it. Often an English list. */
  add column if not exists notice_name  text,
  /** The article of the regulation being cited. */
  add column if not exists provision    text;

comment on column public.restricted_ingredients.country is
  '규제 주체 국가·지역 (COUNTRY_NAME). 같은 성분이 국가마다 다르게 규제되므로 동일성 키에 포함됩니다.';
comment on column public.restricted_ingredients.category is
  '규제 구분 (REGULATE_TYPE): 금지 / 제한 등. 식약처 원문 그대로 둡니다.';
comment on column public.restricted_ingredients.limit_text is
  '배합 한도 및 조건 (LIMIT_COND).';
comment on column public.restricted_ingredients.notice_name is
  '해당 국가 고시에 적힌 성분명 (NOTICE_INGR_NAME). 우리 표기와 다를 수 있습니다.';

/*
 * One ruling = one (ingredient, country, kind, CAS).
 *
 * `nulls not distinct` again, because CAS_NO and the category are both
 * frequently blank and Postgres would otherwise treat every blank as unique,
 * letting the same ruling in as many times as it is re-synced.
 */
drop index if exists public.restricted_identity_idx;
create unique index if not exists restricted_identity_idx
  on public.restricted_ingredients (kor_name, country, category, cas_no)
  nulls not distinct;

comment on index public.restricted_identity_idx is
  '동일성 기준: 성분명 + 국가 + 규제구분 + CAS번호.';

create index if not exists restricted_country_idx
  on public.restricted_ingredients (country);


/*
 * Restrictions for a name, narrowed to one market when asked.
 *
 * `p_country` null means every jurisdiction on file, which is what an operator
 * comparing markets wants. A storefront answering "can we ship this there"
 * passes the destination, because showing a customer in Seoul a Chinese
 * prohibition as though it applied to them would be simply false.
 *
 * Still rows, still no verdict: a limit is per concentration and per product
 * type, and a label states neither.
 */
create or replace function public.ingredient_restrictions(
  p_name text,
  p_country text default null
)
returns setof public.restricted_ingredients language sql stable
set search_path = public, pg_temp as $$
  select * from public.restricted_ingredients
   where match_key = public.ingredient_key(p_name)
     and (p_country is null or country = p_country)
   order by country nulls last, category nulls last, id
$$;

revoke all on function public.ingredient_restrictions(text, text) from public;
grant execute on function public.ingredient_restrictions(text, text) to anon, authenticated;

-- The one-argument form the console already calls; dropped so the new default
-- argument is not ambiguous against it.
drop function if exists public.ingredient_restrictions(text);
