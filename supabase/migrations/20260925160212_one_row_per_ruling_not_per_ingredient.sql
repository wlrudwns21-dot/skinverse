/*
 * A ruling is not identified by the ingredient and the country.
 *
 * The identity key was (name, country, category, CAS), and it was wrong. The
 * register carries several rulings for one ingredient in one market, separated
 * only by their limit: 옥시퀴놀린 in the EU appears twice under 한도/금지 with
 * two different LIMIT_COND values, because the permitted concentration depends
 * on the kind of product it goes into ("두발용 0.3%" against prohibited
 * elsewhere). Brazil, Argentina, ASEAN and China all do the same, and so does
 * 하이드로젠퍼옥사이드 in Taiwan.
 *
 * Under the old key those collapsed into one row and the survivor was whichever
 * arrived last — 253 real rulings discarded out of 31,191, while the row count
 * still looked about right. Losing the stricter of two limits is the dangerous
 * direction, and there was nothing to say which one had been kept.
 *
 * So identity is the ruling itself: every field that distinguishes one from
 * another, hashed. Computed by the database rather than by whatever is inserting,
 * because a fingerprint a client can get wrong is not a key.
 *
 * Deliberately over the columns we store and not over `raw`: hashing the whole
 * API record would make every ruling look new the day the Ministry adds a field,
 * duplicating the entire table instead of updating it.
 */
alter table public.restricted_ingredients
  add column if not exists fingerprint text
    generated always as (
      md5(
        coalesce(kor_name, '')    || chr(31) ||
        coalesce(country, '')     || chr(31) ||
        coalesce(category, '')    || chr(31) ||
        coalesce(cas_no, '')      || chr(31) ||
        coalesce(limit_text, '')  || chr(31) ||
        coalesce(notice_name, '') || chr(31) ||
        coalesce(provision, '')
      )
    ) stored;

comment on column public.restricted_ingredients.fingerprint is
  '한 건의 규제를 구분하는 해시. 같은 성분·같은 국가라도 한도가 다르면 다른 규제이므로 한도까지 포함합니다.';

drop index if exists public.restricted_identity_idx;
create unique index if not exists restricted_identity_idx
  on public.restricted_ingredients (fingerprint);

comment on index public.restricted_identity_idx is
  '동일성 기준은 규제 한 건 전체입니다. 성분+국가만으로 묶으면 제품군별 한도가 사라집니다.';

/*
 * Clear the table before the re-sync.
 *
 * Not a truncate-and-hope: the rows currently there were written under the
 * broken key, so an unknown 253 of them are the wrong one of two limits. There
 * is no way to tell which from the inside, and a re-sync on top of them would
 * leave the bad rows in place alongside the good. The register is 63 calls
 * against a 10,000-a-day budget, so re-reading it is cheaper than reasoning
 * about which rows to trust.
 */
truncate public.restricted_ingredients;
