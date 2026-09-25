/*
 * 화장품 사용제한 원료 — 식약처, 공공데이터포털 15111772.
 *
 * The other half of reading a label, and the half that carries weight. The
 * ingredient register says a name exists; this says the Ministry has placed a
 * limit on it, or forbidden it outright.
 *
 * What this lets us state is a fact: "이 제품에는 배합한도가 정해진 원료가 3개
 * 있습니다", or "사용금지 원료가 포함되어 있습니다". What it does not let us
 * state is an opinion — that a product is 순하다, or safe for a child. A limit
 * exists per ingredient and per concentration, and a label lists neither
 * concentration nor the product's use; a verdict built from this data would be
 * a medical claim wearing a citation. The schema is deliberately shaped to
 * report and not to judge: there is no 'safe' column, and no score.
 */
create table if not exists public.restricted_ingredients (
  id           bigserial primary key,

  kor_name     text not null,
  eng_name     text,
  cas_no       text,

  /*
   * 구분 — which list this entry is on.
   *
   * Kept as the register's own words rather than mapped to an enum of ours.
   * '사용할 수 없는 원료' and '사용상의 제한이 필요한 원료' are legally distinct
   * categories, and a mapping we invented would be the place a legal
   * distinction quietly got lost.
   */
  category     text,

  /** 사용한도 — the permitted concentration, as text, because it is text. */
  limit_text   text,

  /** 기타 제한 및 요건: "영유아용 제품에는 사용금지" lives in here. */
  other_text   text,

  /*
   * The whole record as the API returned it.
   *
   * This dataset's exact field names could not be checked from the build
   * environment, so the columns above are a best reading and this is the
   * receipt. Nothing is lost to a wrong guess: the raw record is kept, and the
   * columns can be re-derived from it without another 10,000-call sync.
   */
  raw          jsonb not null default '{}'::jsonb,

  match_key    text not null,
  synced_at    timestamptz not null default now()
);

create unique index if not exists restricted_identity_idx
  on public.restricted_ingredients (kor_name, category, coalesce(cas_no, ''))
  nulls not distinct;

create index if not exists restricted_match_idx
  on public.restricted_ingredients (match_key);

comment on table public.restricted_ingredients is
  '식약처 화장품 사용제한 원료정보(공공데이터포털 15111772)의 사본. 사실 조회용이며, 제품의 안전성·순함을 판정하는 데 쓰지 않습니다.';
comment on column public.restricted_ingredients.category is
  '식약처의 원문 구분값. 자체 분류로 바꾸지 않습니다 — 법적 구분이 사라지기 때문입니다.';
comment on column public.restricted_ingredients.raw is
  'API 원본 레코드. 컬럼 매핑이 틀렸을 때 재동기화 없이 다시 뽑기 위한 것입니다.';

drop trigger if exists restricted_key on public.restricted_ingredients;
create trigger restricted_key
  before insert or update of kor_name on public.restricted_ingredients
  for each row execute function private.set_ingredient_key();

alter table public.restricted_ingredients enable row level security;

drop policy if exists "anyone reads restricted" on public.restricted_ingredients;
create policy "anyone reads restricted" on public.restricted_ingredients
  for select to anon, authenticated using (true);

drop policy if exists "admin writes restricted" on public.restricted_ingredients;
create policy "admin writes restricted" on public.restricted_ingredients
  for all to authenticated using (private.is_admin()) with check (private.is_admin());


/*
 * Every restriction recorded against a name, however it was spelled.
 *
 * Returns rows, not a verdict. A caller wanting to show a customer something
 * gets the Ministry's own category and limit text to show them; it does not get
 * a boolean it could mistake for a safety rating.
 */
create or replace function public.ingredient_restrictions(p_name text)
returns setof public.restricted_ingredients language sql stable
set search_path = public, pg_temp as $$
  select * from public.restricted_ingredients
   where match_key = public.ingredient_key(p_name)
   order by category nulls last, id
$$;

revoke all on function public.ingredient_restrictions(text) from public;
grant execute on function public.ingredient_restrictions(text) to anon, authenticated;
