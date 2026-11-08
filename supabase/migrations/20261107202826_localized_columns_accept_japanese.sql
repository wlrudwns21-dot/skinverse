-- Let the ingredient columns hold Japanese.
--
-- Two check constraints spell out which language keys a localized JSON column
-- may carry. They are written as subtraction down to an empty object, so an
-- unlisted key is a violation rather than something that silently rides along
-- -- which is the behaviour we want: a typo'd locale key would otherwise sit
-- in the column forever, read by nothing.
--
-- The cost of that strictness is this migration. Adding Japanese to the shop
-- meant the first Japanese ingredient list was rejected by the database, not
-- by any application code, which is the right place for it to have been
-- caught. Both constraints are relaxed here by exactly one key.
--
-- `ingredients_source` is the maker's text as printed on the carton, so it has
-- a Korean and an English key. `ingredients_l` is the parsed list, and it only
-- holds locales that need their INCI names rewritten -- Korean and English
-- read the source directly -- which is why its list is the shorter one.
--
-- Rewritten in full rather than altered: a check constraint cannot be extended
-- in place, so dropping and recreating is the only form this takes.

alter table public.products
  drop constraint if exists products_ingredients_source_shape;

alter table public.products
  add constraint products_ingredients_source_shape check (
    jsonb_typeof(ingredients_source) = 'object'
    and ingredients_source - 'ko' - 'en' - 'zh' - 'ja' - 'th' = '{}'::jsonb
  );

alter table public.products
  drop constraint if exists products_ingredients_l_shape;

alter table public.products
  add constraint products_ingredients_l_shape check (
    jsonb_typeof(ingredients_l) = 'object'
    and ingredients_l - 'zh' - 'ja' - 'th' = '{}'::jsonb
  );
