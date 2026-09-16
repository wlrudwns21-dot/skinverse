-- Keep everything the analysis produced, not just what today's screen draws.
--
-- A scan is a measurement of a person's face at a moment in time. Discarding
-- the parts we do not currently render means that when we want to show a trend
-- next month, the history is already missing — and a scan cannot be retaken
-- retroactively. These columns are all nullable so every existing row stays
-- valid.

-- Their oiliness reading. Used to classify, never drawn as an axis, but it is
-- a real measurement and a rising trend is worth telling someone about.
alter table public.scans add column if not exists oiliness integer;

-- Their own skin-type vocabulary, verbatim, per zone. The whole-face label is
-- folded into our three conditions for the UI; these keep what they actually
-- said, including the T-zone/U-zone split our single condition cannot express.
alter table public.scans add column if not exists skin_type text;
alter table public.scans add column if not exists skin_type_t_zone text;
alter table public.scans add column if not exists skin_type_u_zone text;

-- Which tier produced these numbers. SD and HD are different engines, so a
-- score that moves the week an account switches tier has not necessarily moved.
alter table public.scans add column if not exists tier text;

-- The weather the face was measured in: {"t":number,"h":number,"uv":number}.
--
-- This is what makes the history interpretable. Hydration falling 12 points
-- means one thing in the same weather and quite another when humidity fell 30%
-- at the same time — without this column the two are indistinguishable, and
-- the customer gets told their routine is failing when it is simply January.
alter table public.scans add column if not exists weather jsonb;

comment on column public.scans.weather is
  'Local conditions at the time of the scan: t (°C), h (% RH), uv (index).';

-- The reports read a member''s own scans in date order; nothing else does.
create index if not exists scans_user_created_idx
  on public.scans (user_id, created_at desc);
