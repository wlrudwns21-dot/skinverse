-- The shipping fee has to exist somewhere the server can read it. It lived in
-- src/data/commerce.ts, which means the browser was the only thing that knew
-- what postage costs — and a total is only as trustworthy as its cheapest part.
create table if not exists public.shipping_methods (
  id          text primary key,
  label       text not null,
  fee         numeric not null check (fee >= 0),
  eta         text not null,
  active      boolean not null default true,
  sort        integer not null default 0,
  updated_at  timestamptz not null default now()
);

insert into public.shipping_methods (id, label, fee, eta, sort) values
  ('dhl', 'DHL Express',   12, 'Sep 17 – Sep 19', 1),
  ('ems', 'K-Packet/EMS',   8, 'Sep 21 – Sep 28', 2)
on conflict (id) do nothing;

alter table public.shipping_methods enable row level security;

drop policy if exists "anyone reads shipping methods" on public.shipping_methods;
create policy "anyone reads shipping methods" on public.shipping_methods
  for select to anon, authenticated using (active or private.is_admin());

drop policy if exists "master writes shipping methods" on public.shipping_methods;
create policy "master writes shipping methods" on public.shipping_methods
  for all to authenticated using (private.is_master()) with check (private.is_master());

-- Which day the streak was last advanced on, so clearing a fifth mission after
-- the fourth already completed the day cannot advance it twice.
alter table public.profiles add column if not exists streak_day date;
