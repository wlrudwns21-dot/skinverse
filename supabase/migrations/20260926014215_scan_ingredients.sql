/*
 * A label's worth of names in, one answer per name out.
 *
 * This is what a scan calls: OCR gives thirty names, and thirty separate round
 * trips over a phone connection is not a feature. One call returns, for each
 * name, what it matched, how sure that is, our own description, and 식약처's
 * restrictions for the customer's market.
 *
 * ── Why there are four outcomes and not two ─────────────────────────────────
 *
 * Measured against these 21,897 real names, with OCR-style damage:
 *
 *   a damaged reading of the right name   scores 0.500 – 1.000
 *   two genuinely different ingredients   score  0.600 – 0.636 against each other
 *   text that is not an ingredient at all scores below 0.300
 *
 * The first two ranges overlap, so similarity alone cannot separate "this name,
 * misread" from "a different ingredient". 폴리솔베이트20 and 폴리솔베이트21 both
 * score 0.636 against a reading of 폴리솔베이트2O — and in that measurement the
 * single wrong answer was the one where the top two tied. Every case with any gap
 * at all was correct.
 *
 * So the gap between first and second place decides, and where it is too small
 * the honest answer is a list of candidates rather than a confident wrong one.
 * An 'ambiguous' row deliberately carries no ingredient, no description and no
 * restrictions: attaching a child-safety warning to a guess is worse than saying
 * the label was not legible.
 */

/** Below this, a candidate is noise rather than a damaged reading. */
create or replace function private.scan_min_score() returns real
  language sql immutable as $$ select 0.45::real $$;

/**
 * The winner must lead the runner-up by this much.
 *
 * 0.05 sits under the smallest gap seen on a correct answer (0.065) and above the
 * ties that produced the wrong one (0.000).
 */
create or replace function private.scan_min_gap() returns real
  language sql immutable as $$ select 0.05::real $$;

create or replace function public.scan_ingredients(
  p_names text[],
  p_country text default '한국'
)
returns table (
  /** The name as it came off the label, so the caller can line results up. */
  input_name    text,
  /** 'exact' | 'likely' | 'ambiguous' | 'unknown' */
  status        text,
  kor_name      text,
  eng_name      text,
  role          text,
  blurb         jsonb,
  /** 식약처's definition of the material. Provenance, not customer copy. */
  origin        text,
  score         real,
  /** For 'ambiguous': the names it could be, best first. Else empty. */
  candidates    jsonb,
  /** Restrictions for p_country, as the Ministry wrote them. Never a verdict. */
  restrictions  jsonb
)
language sql stable
set search_path = public, private, pg_temp
as $$
  with asked as (
    -- `ordinality` keeps the label's order, which carries meaning: 화장품법 lists
    -- ingredients above 1% by descending quantity.
    select n.name, n.pos, public.ingredient_key(n.name) as key
    from unnest(p_names) with ordinality as n(name, pos)
    where btrim(coalesce(n.name, '')) <> ''
  ),
  -- Exact first. It is both cheaper and certain, and a name that matches exactly
  -- must never be sent down the fuzzy path where a longer near-neighbour could
  -- outrank it.
  exact as (
    select a.name, a.pos, i.*
    from asked a
    join public.ingredients i on i.match_key = a.key
  ),
  exact_best as (
    select distinct on (name) * from exact
     order by name, (cas_no is not null) desc, id
  ),
  fuzzy_pool as (
    select a.name, a.pos, i.id, i.kor_name, i.eng_name, i.role, i.blurb, i.origin,
           extensions.similarity(i.match_key, a.key) as sim,
           row_number() over (
             partition by a.name
             order by extensions.similarity(i.match_key, a.key) desc, length(i.kor_name), i.id
           ) as rk
    from asked a
    join public.ingredients i on i.match_key operator(extensions.%) a.key
    where not exists (select 1 from exact_best e where e.name = a.name)
  ),
  fuzzy as (
    select p.*,
           (select f2.sim from fuzzy_pool f2 where f2.name = p.name and f2.rk = 2) as runner_up
    from fuzzy_pool p
    where p.rk <= 5
  ),
  decided as (
    select
      a.name,
      a.pos,
      case
        when e.id is not null then 'exact'
        when f.id is null then 'unknown'
        when f.sim < private.scan_min_score() then 'unknown'
        when f.sim - coalesce(f.runner_up, 0) < private.scan_min_gap() then 'ambiguous'
        else 'likely'
      end as status,
      coalesce(e.id, f.id)              as id,
      coalesce(e.kor_name, f.kor_name)  as kor_name,
      coalesce(e.eng_name, f.eng_name)  as eng_name,
      coalesce(e.role, f.role)          as role,
      coalesce(e.blurb, f.blurb)        as blurb,
      coalesce(e.origin, f.origin)      as origin,
      case when e.id is not null then 1.0::real else f.sim end as score
    from asked a
    left join exact_best e on e.name = a.name
    left join fuzzy f on f.name = a.name and f.rk = 1
  )
  select
    d.name,
    d.status,
    -- An ambiguous or unknown row carries no ingredient on purpose. Returning the
    -- best guess here would put its name, its description and its child warning
    -- on screen beside a hedge nobody reads.
    case when d.status in ('exact', 'likely') then d.kor_name end,
    case when d.status in ('exact', 'likely') then d.eng_name end,
    case when d.status in ('exact', 'likely') then d.role end,
    case when d.status in ('exact', 'likely') then d.blurb end,
    case when d.status in ('exact', 'likely') then d.origin end,
    d.score,
    case
      when d.status = 'ambiguous' then coalesce((
        select jsonb_agg(jsonb_build_object(
                 'korName', f.kor_name, 'engName', f.eng_name,
                 'role', f.role, 'score', round(f.sim::numeric, 3)
               ) order by f.rk)
          from fuzzy f where f.name = d.name and f.sim >= private.scan_min_score()
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    case
      when d.status in ('exact', 'likely') then coalesce((
        select jsonb_agg(jsonb_build_object(
                 'country', r.country, 'category', r.category,
                 'limitText', r.limit_text, 'provision', r.provision,
                 'noticeName', r.notice_name
               ) order by r.category nulls last, r.id)
          from public.restricted_ingredients r
         where r.match_key = public.ingredient_key(d.kor_name)
           and (p_country is null or r.country = p_country)
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  from decided d
  order by d.pos
$$;

revoke all on function public.scan_ingredients(text[], text) from public;
grant execute on function public.scan_ingredients(text[], text) to anon, authenticated;

comment on function public.scan_ingredients(text[], text) is
  '라벨 전성분 목록을 한 번에 대조합니다. exact/likely는 성분을 특정하고, ambiguous는 후보만 돌려주며 성분·설명·규제를 붙이지 않습니다.';
