-- Perfect Corp returns an AI-derived skin age alongside the scores. It is not a
-- 0-100 axis, so it gets its own column rather than being mixed into `metrics`
-- where the six-axis loop would try to render it as one.
alter table public.scans
  add column skin_age integer check (skin_age is null or skin_age between 1 and 120);

comment on column public.scans.skin_age is
  'Vendor-reported skin age. Null for demo results and for vendors that do not report one.';
