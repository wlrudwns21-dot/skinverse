-- Two operator roles.
--
--   master — everything, plus the operator list itself and the money rules
--   admin  — day-to-day fulfilment: orders, stock, members, CS
--
-- The list moves from the hidden `private` schema into `public` so a master can
-- manage it from the console. That is safe because the table's RLS denies every
-- operation to anyone who is not a master, and the helpers below are SECURITY
-- DEFINER — they run as the owner, bypass RLS, and so cannot recurse into the
-- very policies they are evaluating.
--
-- is_admin() is REPLACED rather than dropped: nine existing policies depend on
-- it, and replacing keeps them pointing at the new definition.

create table public.admin_users (
  email text primary key,
  role text not null default 'admin' check (role in ('master', 'admin')),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Carry over whoever was already authorised; the first operator becomes master.
insert into public.admin_users (email, role, note, created_at)
select email, 'master', note, created_at from private.admin_emails
on conflict (email) do nothing;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create function private.is_master()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'master'
  );
$$;

drop table private.admin_emails;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_master() to authenticated;

-- Only a master may even see that the operator list exists.
alter table public.admin_users enable row level security;

create policy "master reads operators"   on public.admin_users for select using (private.is_master());
create policy "master adds operators"    on public.admin_users for insert with check (private.is_master());
create policy "master edits operators"   on public.admin_users for update using (private.is_master()) with check (private.is_master());
create policy "master removes operators" on public.admin_users for delete using (private.is_master());

-- A master must not be able to strip the last master and lock everyone out.
create function public.guard_last_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  select count(*) into remaining
  from public.admin_users
  where role = 'master' and email <> old.email;

  if remaining = 0 then
    raise exception '마지막 마스터 관리자는 삭제하거나 권한을 낮출 수 없습니다';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.guard_last_master() from public, anon, authenticated;

create trigger admin_users_guard_last_master_delete
  before delete on public.admin_users
  for each row execute function public.guard_last_master();

create trigger admin_users_guard_last_master_demote
  before update of role on public.admin_users
  for each row when (old.role = 'master' and new.role <> 'master')
  execute function public.guard_last_master();

-- Expose the caller's own role so the console knows which menu to draw.
create function public.my_admin_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select role from public.admin_users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke execute on function public.my_admin_role() from anon, public;
grant execute on function public.my_admin_role() to authenticated;

-- The operator the owner nominated. Signing up with this address makes it master.
-- REDACTED for the same reason as the seed in the previous migration.
insert into public.admin_users (email, role, note)
values ('master@example.com', 'master', '마스터 운영자')
on conflict (email) do update set role = 'master';
