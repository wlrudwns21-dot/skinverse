/**
 * Which origins may call this from a browser.
 *
 * Same policy as analyze-skin and paypal, duplicated rather than shared because
 * edge functions deploy as separate bundles and cannot import across folders.
 * If you change one, change all three.
 */
const CONFIGURED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') ??
  Deno.env.get('ALLOWED_ORIGIN') ??
  ''
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
const VERCEL_ORIGIN = /^https:\/\/[a-z0-9][a-z0-9-]*\.vercel\.app$/

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null
  if (CONFIGURED_ORIGINS.length > 0) {
    return CONFIGURED_ORIGINS.includes(origin) ? origin : null
  }
  return DEV_ORIGIN.test(origin) || VERCEL_ORIGIN.test(origin) ? origin : null
}

export function corsFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version, ' +
      'x-region, accept-profile, content-profile, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  const origin = allowedOrigin(req.headers.get('Origin'))
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  return headers
}
