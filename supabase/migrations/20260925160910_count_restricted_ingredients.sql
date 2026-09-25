/*
 * How many ingredients the restriction register is about.
 *
 * Not the same as its row count, and the difference is large enough to mislead:
 * 31,128 rulings cover 6,922 ingredients, because each one is ruled on by up to
 * eleven jurisdictions and often several times within one of them. A console
 * showing 31,128 beside 21,897 ingredients invites the reading that the
 * restricted list is bigger than the register it draws from.
 *
 * A function rather than a view because `count(distinct ...)` over 31k rows is
 * cheap but not free, and this is read on every visit to the screen.
 */
create or replace function public.restricted_ingredient_count()
returns bigint language sql stable
set search_path = public, pg_temp as $$
  select count(distinct match_key) from public.restricted_ingredients
$$;

revoke all on function public.restricted_ingredient_count() from public;
grant execute on function public.restricted_ingredient_count() to anon, authenticated;
