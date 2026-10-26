/**
 * Let the database move the artwork, so a person does not have to.
 *
 * Until now the only way to get a new product's pictures into the bucket was
 * for the owner to open `media-sync` in a browser and sit through it. That
 * turned out to be worse than it sounds. The gateway in front of edge
 * functions rewrites the Content-Type of every GET to a bare `text/plain`
 * whatever the function sets — proven against five variants, while the same
 * header on a POST passes through untouched — so the browser prints the
 * markup instead of drawing it. The password field is not missing, it is
 * being shown as text. The meta refresh that advances a batch never fires.
 * Every round has to be opened by hand, and the last run took eleven of them.
 *
 * None of that can be fixed inside the function. What can be fixed is who
 * drives it. This container cannot reach supabase.co at all, but the database
 * can, over pg_net — so the sync becomes a SQL statement and the browser page
 * goes back to being a fallback nobody needs.
 *
 * ── why there is a second secret ────────────────────────────────────────────
 *
 * The function authenticates with `MEDIA_SYNC_TOKEN`, which lives in Edge
 * Function Secrets. Only the dashboard can read that back — SQL cannot — so
 * the database has nothing to send. Putting the owner's value in a table
 * instead would mean the owner handing it over, and that value has already
 * leaked twice by travelling in an address bar.
 *
 * So the database gets its own, generated here and never leaving: not in a
 * migration, not in a chat, not in a URL. `media_sync_token_ok` answers yes
 * or no about a token and never returns the secret, so reading the function
 * that calls it tells an attacker nothing. It is granted to service_role
 * alone, which is the key the edge function already holds to write to the
 * bucket.
 *
 * Even in the worst case the secret buys very little: media-sync can only
 * copy this repository's own public images into this one bucket, with every
 * path re-checked against a fixed pattern. There is no other verb.
 */

create table if not exists private.sync_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

/**
 * Generated, not written down.
 *
 * Two UUIDs with the hyphens taken out: 64 hex characters, letters and digits
 * only, from the server's own randomness. `where not exists` rather than
 * `on conflict do nothing` so that re-running this file never touches a
 * secret that is already in use.
 */
insert into private.sync_secrets (name, value)
select 'media_sync', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where not exists (select 1 from private.sync_secrets where name = 'media_sync');

/** Is this the database's own sync secret? Yes or no, and nothing else. */
create or replace function public.media_sync_token_ok(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
      from private.sync_secrets
     where name = 'media_sync'
       and length(p_token) >= 32
       and value = p_token
  )
$$;

/**
 * Functions are granted to PUBLIC by default, which would put this on the
 * Data API for anyone holding the publishable key. It is a guessing oracle,
 * so it goes to the one role that needs it and nobody else.
 */
revoke all on function public.media_sync_token_ok(text) from public;
revoke all on function public.media_sync_token_ok(text) from anon;
revoke all on function public.media_sync_token_ok(text) from authenticated;
grant execute on function public.media_sync_token_ok(text) to service_role;

/**
 * Run one batch, starting at `p_from`, and return the pg_net request id.
 *
 * Asynchronous: this hands the request to pg_net's worker and returns at
 * once. The answer lands in `net._http_response` under the id this returns,
 * as JSON with `moved`, `total`, `resume` and `done` — `resume` is what the
 * next call passes as `p_from`.
 *
 * The timeout is three minutes rather than pg_net's five-second default. A
 * batch is a hundred files fetched from GitHub and written to the bucket, and
 * at five seconds every call would be recorded as a timeout while the uploads
 * carried on regardless, which is the most confusing possible outcome.
 */
create or replace function public.media_sync_step(p_from int default 0)
returns bigint
language sql
volatile
security definer
set search_path = public, private, pg_temp
as $$
  select net.http_get(
    'https://pfovxylewqthuhecfgvx.supabase.co/functions/v1/media-sync?format=json&from='
      || greatest(coalesce(p_from, 0), 0)::text,
    headers := jsonb_build_object(
      'x-sync-token', (select value from private.sync_secrets where name = 'media_sync')
    ),
    timeout_milliseconds := 180000
  )
$$;

revoke all on function public.media_sync_step(int) from public;
revoke all on function public.media_sync_step(int) from anon;
revoke all on function public.media_sync_step(int) from authenticated;

comment on function public.media_sync_step(int) is
  'Copy one batch of product artwork from the repository into the bucket. Returns a pg_net request id — read the answer from net._http_response.';
