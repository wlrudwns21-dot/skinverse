/**
 * Where the product photography and the makers' detail artwork are served
 * from.
 *
 * ── why this is not just a path ─────────────────────────────────────────────
 *
 * The media used to live in `public/`, which meant it lived in git. Forty of
 * the repository's forty-one megabytes were 526 WebP tiles, growing by two to
 * three megabytes with every product registered. Vercel fetches the whole
 * repository from GitHub on each deploy, and a production deploy has already
 * failed on a GitHub secondary rate limit. Static media at that size does not
 * belong in source control.
 *
 * So the paths stay exactly as they are — `/products/<id>/main.webp` in the
 * database, `/products/<id>/detail/<lang>/<n>.webp` computed from the tile
 * table — and only the thing in front of them moves.
 *
 * ── the empty default is the point ──────────────────────────────────────────
 *
 * With `VITE_MEDIA_BASE` unset this returns the path unchanged, which is a
 * request to the site's own origin: the behaviour the app has always had. So
 * a checkout with no env var, a local `vite dev`, and a preview build all keep
 * working from `public/` with nothing configured.
 *
 * Set it to the bucket's public prefix and every image comes from Supabase
 * Storage instead. That makes the move a one-variable change that can be
 * rolled back the same way, rather than a rewrite of every reference.
 */

/** Trailing slashes stripped so `base + path` never doubles the separator. */
const BASE = (import.meta.env.VITE_MEDIA_BASE ?? '').trim().replace(/\/+$/, '')

/**
 * A URL for a media path.
 *
 * `path` is always rooted — `/products/...` — because that is what the
 * database stores and what the tile table builds. An unrooted path would
 * silently resolve against the current route, so it is rejected rather than
 * guessed at.
 */
export function media(path: string): string {
  if (!path) return ''
  if (/^(https?:)?\/\//.test(path)) return path
  if (!path.startsWith('/')) return path
  return BASE ? BASE + path : path
}

/** Whether media is being served from somewhere other than this origin. */
export const mediaIsRemote = BASE !== ''

/** The configured base, for the operator screen to show what is in effect. */
export const mediaBase = BASE
