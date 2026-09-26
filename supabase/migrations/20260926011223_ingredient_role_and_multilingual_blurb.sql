/*
 * What an ingredient is for, and what to tell a customer about it.
 *
 * The register's own 기원 및 정의 text is factual and useless at the same time:
 * "이 원료는 다음의 구조를 갖는 헤테로고리 방향족 아마이드이다" is a true
 * sentence about 나이아신아마이드 that answers no question a shopper has. It
 * stays in `origin` as provenance. What goes in front of a customer is written
 * by us, and these two columns are where it lives.
 *
 * `role` is the coarse answer — what the ingredient is doing in the formula.
 * `blurb` is the sentence a customer reads.
 */
alter table public.ingredients
  add column if not exists role text;

comment on column public.ingredients.role is
  '배합 목적 분류 (보습, 에몰리언트, 보존, 자외선차단 등). 고객 화면에서 성분을 묶어 보여주는 데 씁니다.';

/*
 * `blurb` becomes one object per language rather than one Korean string.
 *
 * The storefront speaks ko, en, zh and th. A single text column would have
 * meant either a fifth table or four more columns later, and the copy is
 * written once per ingredient either way — so the shape that holds four
 * languages costs nothing now and saves the migration that would otherwise
 * arrive the first time somebody browses in English.
 *
 * Empty for a language simply means unwritten; the reader falls back rather
 * than showing a blank, and a machine translation is not put in its place.
 */
alter table public.ingredients
  alter column blurb drop default,
  alter column blurb type jsonb using
    case
      when blurb is null or btrim(blurb) = '' then null
      else jsonb_build_object('ko', blurb)
    end;

comment on column public.ingredients.blurb is
  '고객용 설명, 언어별. {"ko": "...", "en": "..."} 형태. 식약처 데이터가 아니라 우리가 직접 쓴 것이며, 재동기화로 지워지지 않습니다.';

/*
 * Guard the shape, because this column is written by hand.
 *
 * A stray `{"ko": ["a","b"]}`, a key that is not a language, or an empty string
 * would reach the storefront as a blank where a sentence should be, and nothing
 * upstream would notice. Cheap to reject here, expensive to find later.
 *
 * Written as one expression rather than a subquery over jsonb_each, because a
 * check constraint may not contain a subquery. `blurb - <keys>` deletes the
 * four known languages; anything still standing is a key that should not exist.
 */
alter table public.ingredients
  drop constraint if exists ingredients_blurb_shape;
alter table public.ingredients
  add constraint ingredients_blurb_shape check (
    blurb is null or (
      jsonb_typeof(blurb) = 'object'
      and blurb <> '{}'::jsonb
      and blurb - array['ko', 'en', 'zh', 'th'] = '{}'::jsonb
      and coalesce(jsonb_typeof(blurb -> 'ko'), 'string') = 'string'
      and coalesce(jsonb_typeof(blurb -> 'en'), 'string') = 'string'
      and coalesce(jsonb_typeof(blurb -> 'zh'), 'string') = 'string'
      and coalesce(jsonb_typeof(blurb -> 'th'), 'string') = 'string'
      and coalesce(btrim(blurb ->> 'ko'), 'x') <> ''
      and coalesce(btrim(blurb ->> 'en'), 'x') <> ''
      and coalesce(btrim(blurb ->> 'zh'), 'x') <> ''
      and coalesce(btrim(blurb ->> 'th'), 'x') <> ''
    )
  );

/** How many ingredients carry our own copy, for the console's coverage panel. */
create or replace function public.ingredient_blurb_count()
returns bigint language sql stable
set search_path = public, pg_temp as $$
  select count(*) from public.ingredients where blurb is not null
$$;

revoke all on function public.ingredient_blurb_count() from public;
grant execute on function public.ingredient_blurb_count() to anon, authenticated;

create index if not exists ingredients_role_idx on public.ingredients (role)
  where role is not null;
