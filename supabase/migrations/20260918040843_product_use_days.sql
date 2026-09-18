/*
 * Roughly how long one unit lasts.
 *
 * The recommender needs it to tell two very different customers apart: the one
 * who bought this serum last week and already has it, and the one who bought it
 * in March and has been out for a fortnight. Without it, both get the same
 * advice — and one of them is being sold something they are looking at on
 * their own shelf.
 *
 * A guess, and openly so. Real consumption varies by how much someone uses and
 * how often, and nothing here pretends otherwise: it is a default an operator
 * can correct per product, and the recommender treats it as a soft signal
 * rather than a fact.
 */
alter table public.products
  add column if not exists use_days int not null default 60
    check (use_days between 1 and 730);

comment on column public.products.use_days is
  '한 개를 다 쓰는 데 걸리는 대략적인 일수. 재구매 시점 추정에만 쓰이며, 정확할 필요는 없습니다.';

/*
 * Seeded by product type, from ordinary usage.
 *
 * A toner goes fastest — it is used with a cotton pad, twice a day, in far
 * larger quantity than anything else. Sunscreen should go fast and usually does
 * not, so 60 days here is closer to what people do than to what they should do.
 * Ampoules and sleep masks are used sparingly and last longest.
 */
update public.products set use_days = case
  when kind ilike '%toner%'   then 45
  when kind ilike '%spf%'     then 60
  when kind ilike '%serum%'   then 75
  when kind ilike '%cream%'   then 75
  when kind ilike '%ampoule%' then 90
  when kind ilike '%mask%'    then 90
  else 60
end;
