-- ── operator applications ───────────────────────────────────────────────────
-- Operators can now apply for themselves instead of a master typing in their
-- address. An application is a row like any other, so the status column is what
-- separates "asked" from "allowed".
--
-- Existing rows default to 'active': they were added by a master by hand, which
-- is an approval. A new application can only ever be written as 'pending'.
alter table public.admin_users
  add column if not exists status text not null default 'active'
    check (status in ('pending', 'active', 'rejected')),
  add column if not exists applied_at timestamptz not null default now(),
  add column if not exists decided_at timestamptz,
  add column if not exists decided_by text;

-- THE load-bearing change. These two functions decide every admin policy in the
-- database, and until now they asked only whether a row existed. Letting people
-- insert their own row without this would hand admin rights to anyone who
-- filled in a form — the application IS the row, so the check has to be that
-- the row was approved, not that it is there.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and status = 'active'
  );
$$;

create or replace function private.is_master()
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'master'
      and status = 'active'
  );
$$;

-- The signed-in caller's own address, lowercased. Used by the policies below so
-- an applicant can touch their own row and nobody else's.
create or replace function private.my_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

drop policy if exists "master adds operators" on public.admin_users;
drop policy if exists "master reads operators" on public.admin_users;

-- An applicant may create exactly one kind of row: their own address, as a
-- plain admin, pending. Every other combination is a master's to write — which
-- is what stops someone applying as an active master.
create policy "apply or master adds operators" on public.admin_users
  for insert with check (
    private.is_master()
    or (
      lower(email) = private.my_email()
      and private.my_email() <> ''
      and role = 'admin'
      and status = 'pending'
    )
  );

-- Masters see everyone. An applicant sees only their own row, which is how the
-- console can tell them they are waiting rather than leaving them at a refusal.
create policy "master reads all, applicant reads own" on public.admin_users
  for select using (
    private.is_master() or lower(email) = private.my_email()
  );

-- ── what a customer tells us at signup ──────────────────────────────────────
-- A store that ships internationally needs a way to reach the buyer and a
-- place to send the parcel. The dialling code is kept apart from the number so
-- it stays a country choice rather than something typed wrong.
alter table public.profiles
  add column if not exists phone_cc text,
  add column if not exists phone text,
  add column if not exists postal_code text,
  add column if not exists gender text
    check (gender is null or gender in ('female', 'male', 'other', 'undisclosed')),
  add column if not exists birth_date date,
  -- Korea requires a personal customs clearance code on imports. Optional
  -- everywhere and never required to sign up: a customer who is only here for
  -- the analysis has no parcel to clear.
  add column if not exists customs_code text;

-- Carry the new fields through from the signup form's metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  raw_birth text := nullif(meta ->> 'birth_date', '');
  parsed_birth date;
begin
  -- The date arrives as text from a form. A malformed one must not abort the
  -- trigger, because that would fail the whole signup over a field that is not
  -- load-bearing; it is dropped instead.
  begin
    parsed_birth := raw_birth::date;
  exception when others then
    parsed_birth := null;
  end;

  insert into public.profiles (
    id, name, language, country, city, timezone,
    phone_cc, phone, address, postal_code, gender, birth_date, customs_code
  )
  values (
    new.id,
    coalesce(meta ->> 'name', ''),
    coalesce(meta ->> 'language', 'ko'),
    coalesce(meta ->> 'country', 'Japan'),
    coalesce(meta ->> 'city', 'Tokyo'),
    coalesce(nullif(meta ->> 'timezone', ''), 'Asia/Seoul'),
    nullif(meta ->> 'phone_cc', ''),
    nullif(meta ->> 'phone', ''),
    coalesce(nullif(meta ->> 'address', ''), ''),
    nullif(meta ->> 'postal_code', ''),
    nullif(meta ->> 'gender', ''),
    parsed_birth,
    nullif(meta ->> 'customs_code', '')
  );
  return new;
end;
$function$;
