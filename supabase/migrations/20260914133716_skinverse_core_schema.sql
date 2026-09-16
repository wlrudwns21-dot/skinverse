-- Skinverse core schema.
-- Every table is per-user and guarded by RLS so a signed-in member can only
-- ever read or write their own rows. The anon/publishable key is safe in the
-- browser precisely because these policies do the gating server-side.

-- ── profiles ──────────────────────────────────────────────────────────────
-- One row per auth user, created automatically by the signup trigger below.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  country text not null default 'Japan',
  address text not null default '',
  points integer not null default 0 check (points >= 0),
  streak integer not null default 0 check (streak >= 0),
  language text not null default 'ko' check (language in ('en','ko','zh','th')),
  city text not null default 'Tokyo',
  skin_condition text not null default 'dehydrated',
  routine_reminders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── scans ─────────────────────────────────────────────────────────────────
-- AI analysis history. Guests never reach this table; their single daily trial
-- lives in the browser only.
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skin_condition text not null,
  overall integer not null check (overall between 0 and 100),
  metrics jsonb not null,
  created_at timestamptz not null default now()
);
create index scans_user_created_idx on public.scans (user_id, created_at desc);

-- ── cart ──────────────────────────────────────────────────────────────────
-- Members get a cart that follows them across devices; guest carts stay local.
create table public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  qty integer not null check (qty > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ── orders ────────────────────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_no text not null unique,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping numeric(10,2) not null check (shipping >= 0),
  points_used integer not null default 0 check (points_used >= 0),
  total numeric(10,2) not null check (total >= 0),
  points_earned integer not null default 0 check (points_earned >= 0),
  ship_method text not null check (ship_method in ('dhl','ems')),
  eta text not null,
  ship_name text not null,
  ship_country text not null,
  ship_address text not null,
  status text not null default 'paid'
    check (status in ('paid','preparing','shipped','delivered','cancelled')),
  tracking text not null default '',
  created_at timestamptz not null default now()
);
create index orders_user_created_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  brand text not null,
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  qty integer not null check (qty > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ── saved routines ────────────────────────────────────────────────────────
-- "루틴 만들기" — a member snapshots the weather-tuned routine they are on.
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  city text not null,
  skin_condition text not null,
  temp integer not null,
  humidity integer not null,
  uv integer not null,
  advice text not null,
  am_steps jsonb not null,
  pm_steps jsonb not null,
  created_at timestamptz not null default now()
);
create index routines_user_created_idx on public.routines (user_id, created_at desc);

-- ── missions ──────────────────────────────────────────────────────────────
-- One claim per mission per calendar day, enforced by the unique constraint so
-- a replayed request cannot mint points twice.
create table public.mission_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null,
  claimed_on date not null default current_date,
  points integer not null check (points >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, claimed_on)
);
create index mission_claims_user_day_idx on public.mission_claims (user_id, claimed_on desc);

-- ── redemptions ───────────────────────────────────────────────────────────
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null,
  cost integer not null check (cost >= 0),
  created_at timestamptz not null default now()
);
create index redemptions_user_created_idx on public.redemptions (user_id, created_at desc);

-- ── row level security ────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.scans          enable row level security;
alter table public.cart_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.routines       enable row level security;
alter table public.mission_claims enable row level security;
alter table public.redemptions    enable row level security;

create policy "own profile read"   on public.profiles for select using ((select auth.uid()) = id);
create policy "own profile write"  on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own scans read"     on public.scans for select using ((select auth.uid()) = user_id);
create policy "own scans insert"   on public.scans for insert with check ((select auth.uid()) = user_id);

create policy "own cart read"      on public.cart_items for select using ((select auth.uid()) = user_id);
create policy "own cart insert"    on public.cart_items for insert with check ((select auth.uid()) = user_id);
create policy "own cart update"    on public.cart_items for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own cart delete"    on public.cart_items for delete using ((select auth.uid()) = user_id);

create policy "own orders read"    on public.orders for select using ((select auth.uid()) = user_id);
create policy "own orders insert"  on public.orders for insert with check ((select auth.uid()) = user_id);

-- Order lines inherit their parent order's ownership.
create policy "own order items read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "own order items insert" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

create policy "own routines read"   on public.routines for select using ((select auth.uid()) = user_id);
create policy "own routines insert" on public.routines for insert with check ((select auth.uid()) = user_id);
create policy "own routines delete" on public.routines for delete using ((select auth.uid()) = user_id);

create policy "own claims read"     on public.mission_claims for select using ((select auth.uid()) = user_id);
create policy "own claims insert"   on public.mission_claims for insert with check ((select auth.uid()) = user_id);

create policy "own redemptions read"   on public.redemptions for select using ((select auth.uid()) = user_id);
create policy "own redemptions insert" on public.redemptions for insert with check ((select auth.uid()) = user_id);

-- ── signup trigger ────────────────────────────────────────────────────────
-- Creates the profile row the moment an account is created, carrying over the
-- name/language the signup form collected in user metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, language, country, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'language', 'ko'),
    coalesce(new.raw_user_meta_data->>'country', 'Japan'),
    coalesce(new.raw_user_meta_data->>'city', 'Tokyo')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at ────────────────────────────────────────────────────────────
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
