/*
 * Similarity search over the register, for names OCR read imperfectly.
 *
 * Exact matching on the normalised key already absorbs the difference between
 * how two manufacturers print the same ingredient. It does nothing for a camera:
 * OCR drops a syllable, reads 하 as 히, splits a word. Those names are right in
 * front of the customer on the bottle and would come back as "인식하지 못함".
 *
 * Trigram similarity closes that gap. The threshold is not set here — it is
 * chosen from measurements against these 21,897 real names, because a number
 * picked by feel is how a scan ends up telling somebody their moisturiser
 * contains something it does not.
 */
create extension if not exists pg_trgm with schema extensions;

/*
 * Indexed on the normalised key, not the raw name.
 *
 * The key is what exact matching compares, so searching the same text keeps the
 * two paths consistent: a name cannot fail the exact match on punctuation and
 * then be scored against a differently punctuated string.
 */
create index if not exists ingredients_key_trgm_idx
  on public.ingredients using gin (match_key extensions.gin_trgm_ops);

create index if not exists restricted_key_trgm_idx
  on public.restricted_ingredients using gin (match_key extensions.gin_trgm_ops);

comment on index public.ingredients_key_trgm_idx is
  'OCR 오차를 흡수하기 위한 유사도 검색용 인덱스. 대조용 키를 대상으로 합니다.';
