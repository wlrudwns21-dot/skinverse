/*
 * The guard was checking current_user, which a SECURITY DEFINER function
 * always reports as its own owner — so the trigger saw "postgres" no matter
 * who was really on the other end and waved everything through.
 *
 * The `role` GUC is the honest answer: SECURITY DEFINER does not touch it, and
 * PostgREST sets it per request (`set local role authenticated`). For a
 * direct connection it is unset, which means a superuser at a psql prompt, and
 * session_user names them.
 */
create or replace function private.guard_payment_status()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare
  frozen constant text[] := array['partly_refunded', 'refunded', 'reversed', 'payment_failed'];
  actor text := coalesce(nullif(current_setting('role', true), 'none'), session_user);
begin
  if new.status is not distinct from old.status then return new; end if;

  -- The webhook reaches the database as service_role; everything else here is
  -- an administrator on a direct connection.
  if actor in ('postgres', 'supabase_admin', 'service_role') then return new; end if;

  if new.status = any (frozen) then
    raise exception '결제 상태(%)는 결제사 웹훅으로만 기록됩니다.', new.status
      using errcode = 'check_violation';
  end if;

  if old.status = any (frozen) then
    raise exception '환불·분쟁 처리된 주문(%)의 상태는 되돌릴 수 없습니다.', old.status
      using errcode = 'check_violation';
  end if;

  return new;
end $$;
