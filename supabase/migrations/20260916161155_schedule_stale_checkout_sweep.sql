/*
 * Run the sweeper.
 *
 * A function nobody calls is not a cleanup, and the failure it prevents is
 * silent: stock quietly held by orders that will never be paid, and the
 * customers behind them unable to check out again. So it goes on a schedule
 * rather than waiting for someone to notice.
 *
 * Every five minutes, voiding anything pending for over thirty. The sweep is
 * cheap — a partial index covers exactly the pending rows — and doing nothing
 * is the normal outcome.
 */
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule('expire-stale-checkouts')
where exists (select 1 from cron.job where jobname = 'expire-stale-checkouts');

select cron.schedule(
  'expire-stale-checkouts',
  '*/5 * * * *',
  $$ select public.expire_stale_checkouts(30) $$
);
