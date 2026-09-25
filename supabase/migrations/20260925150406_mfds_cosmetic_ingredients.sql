/*
 * The 식약처 register of cosmetic ingredients.
 *
 * Mirrored from the Ministry's open API rather than queried live, for three
 * reasons: matching a label's worth of ingredients would be twenty round trips
 * a scan against a 10,000-call daily budget; the register changes a few times
 * a year, not a few times a minute; and a government API being down must not
 * take a product page with it.
 *
 * What this is NOT is a dictionary of benefits. The API carries names, a CAS
 * number and an origin — identity, not efficacy. Its value here is as the
 * canonical name list to match OCR output and manufacturers' ingredient lists
 * against, which is the part that cannot be written by hand.
 */
create table if not exists public.ingredients (
  id           bigserial primary key,
  /* The standard Korean name. The only field the register always fills. */
  kor_name     text not null,
  eng_name     text,
  cas_no       text,
  /* 기원 — where the material comes from. Frequently blank. */
  origin       text,
  /* 이명: other names the same material is sold under, as the API returns it. */
  synonym      text,

  /*
   * What matching actually compares.
   *
   * Labels are printed by different manufacturers from the same register and
   * still disagree: "1,2-헥산다이올" against "1,2 헥산다이올", "정제수" against
   * "정제 수". OCR then adds its own noise. Stripping everything that is not a
   * letter or a digit leaves the part that is actually the same, and it is
   * stored rather than computed per query so the index can be used.
   */
  match_key    text not null,

  /** Our own copy, written for customers. The register has no such field. */
  blurb        text,

  source       text not null default 'mfds',
  synced_at    timestamptz not null default now()
);

/*
 * The register contains genuine duplicates — the same Korean name appearing
 * with a different CAS number or origin — so the unique key is the pair, and
 * the match still finds every candidate for a name.
 */
create unique index if not exists ingredients_identity_idx
  on public.ingredients (kor_name, coalesce(cas_no, ''));

create index if not exists ingredients_match_idx on public.ingredients (match_key);
create index if not exists ingredients_eng_idx
  on public.ingredients (lower(eng_name)) where eng_name is not null;

comment on table public.ingredients is
  '식약처 화장품 원료성분정보(공공데이터포털 15111774)의 사본. 이용허락범위 제한 없음.';
comment on column public.ingredients.match_key is
  '표기 차이와 OCR 오차를 흡수하기 위해 문자·숫자만 남긴 대조용 키.';
comment on column public.ingredients.blurb is
  '고객에게 보여줄 설명. 식약처 데이터가 아니라 우리가 직접 작성한 것입니다.';

/*
 * Everything that is not a letter or a digit, gone.
 *
 * Hangul, Latin and digits survive; spaces, commas, hyphens, brackets and dots
 * do not. `1,2-헥산다이올` and `1,2 헥산다이올` both become `12헥산다이올`.
 */
create or replace function public.ingredient_key(p_name text)
returns text language sql immutable set search_path = pg_catalog, public as $$
  select lower(regexp_replace(coalesce(p_name, ''), '[^[:alnum:]가-힣]', '', 'g'))
$$;

create or replace function private.set_ingredient_key()
returns trigger language plpgsql set search_path = public, private, pg_temp as $$
begin
  new.match_key := public.ingredient_key(new.kor_name);
  return new;
end $$;

drop trigger if exists ingredients_key on public.ingredients;
create trigger ingredients_key
  before insert or update of kor_name on public.ingredients
  for each row execute function private.set_ingredient_key();

alter table public.ingredients enable row level security;

-- Public data, published by the government under an unrestricted licence, and
-- the storefront has to render it.
drop policy if exists "anyone reads ingredients" on public.ingredients;
create policy "anyone reads ingredients" on public.ingredients
  for select to anon, authenticated using (true);

-- Written by the sync function (service_role) and corrected by operators. A
-- customer editing the register would be editing what every other customer is
-- told about what is in their cosmetics.
drop policy if exists "admin writes ingredients" on public.ingredients;
create policy "admin writes ingredients" on public.ingredients
  for all to authenticated using (private.is_admin()) with check (private.is_admin());


/*
 * Find an ingredient by whatever a label or an OCR pass called it.
 *
 * Exact match on the normalised key first. Nothing clever beyond that yet:
 * fuzzy matching against a register this size needs a trigram index and a
 * threshold argued from real OCR output, and guessing at it now would mean
 * silently telling a customer their moisturiser contains something it does not.
 */
create or replace function public.find_ingredient(p_name text)
returns setof public.ingredients language sql stable
set search_path = public, pg_temp as $$
  select * from public.ingredients
   where match_key = public.ingredient_key(p_name)
   order by (cas_no is not null) desc, id
$$;

revoke all on function public.find_ingredient(text) from public;
grant execute on function public.find_ingredient(text) to anon, authenticated;
