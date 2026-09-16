/*
 * Deleting an account must not destroy the records the law requires us to keep.
 *
 * Every table pointed at auth.users with ON DELETE CASCADE, orders included.
 * So removing an account would have taken its order history with it — and
 * 전자상거래법 requires contract, payment and supply records to be kept for
 * five years, and consumer complaint records for three. A cascade would have
 * been a legal breach that is also irreversible, and it would have contradicted
 * the retention table in our own privacy policy.
 *
 * The fix is not to keep the person. It is to keep the record and drop the
 * link: `user_id` becomes NULL, so the row survives with nothing pointing back
 * at a member who no longer exists.
 *
 * `orders` already carries ship_name / ship_country / ship_address, which is
 * the record the law actually asks for — the order is self-contained without
 * the account behind it.
 *
 * Everything else — scans, routines, missions, redemptions, cart, routine logs
 * — has no retention duty and stays CASCADE, because deleting it is the whole
 * point of the request.
 */

alter table public.orders alter column user_id drop not null;
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

alter table public.support_threads alter column user_id drop not null;
alter table public.support_threads drop constraint if exists support_threads_user_id_fkey;
alter table public.support_threads
  add constraint support_threads_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

comment on column public.orders.user_id is
  'Null once the member has been deleted. The order itself is retained for five years under 전자상거래법; ship_name/ship_country/ship_address are that record.';
comment on column public.support_threads.user_id is
  'Null once the member has been deleted. The thread is retained for three years as a consumer complaint record.';
