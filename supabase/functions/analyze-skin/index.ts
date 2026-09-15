import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  analyseWithPerfectCorp,
  TIER,
  VendorError,
  type AnalysisResult,
} from './vendor.ts'

/**
 * Skin analysis, server side.
 *
 * The vendor's key buys analyses with the operator's money, so it can never sit
 * in the browser. This function is the only thing that holds it: the app sends
 * a photo, this checks who is asking and whether they are within quota, calls
 * the vendor, and returns scores.
 *
 * The photo is processed and dropped. Nothing writes it to storage or logs —
 * a face photo is sensitive personal data in every market this store ships to,
 * and the analysis does not need it kept.
 */

/** The vendor's limit is "< 10MB"; sending more is a guaranteed rejection. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** The only formats they accept. Anything else fails at their end. */
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

/**
 * How many analyses one member may run in a day.
 *
 * There is no guest ceiling because there is no guest path: every call is
 * billed against a prepaid balance, so an unauthenticated caller would be
 * spending the operator's money anonymously.
 *
 * The number lives in `store_settings` so the app can show the customer what
 * they have left — a limit only the server knows is a limit the screen has to
 * guess at, and a wrong guess is a refusal that arrives by surprise. The
 * environment variable still wins when set, as an operator override that does
 * not need a database write.
 */
const LIMIT_OVERRIDE = Number(Deno.env.get('ANALYSIS_MEMBER_DAILY_LIMIT') ?? '')
const DEFAULT_DAILY_LIMIT = 1

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  // Listed generously on purpose. A header the browser intends to send that the
  // preflight does not permit kills the request in the browser, before the
  // handler runs — which looks identical to the function failing, except
  // nothing server-side records it. `authorization` must be named explicitly:
  // the `*` wildcard deliberately does not cover it.
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version, ' +
    'x-region, accept-profile, content-profile, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

/** Local conditions at the time of the scan, as the app reports them. */
interface Weather {
  t: number
  h: number
  uv: number
}

/**
 * Read the weather the app sent alongside the photo.
 *
 * Stored with the scan because it is what makes the history readable later: a
 * hydration score that falls 12 points means one thing in unchanged weather and
 * something quite different when the humidity fell 30% in the same period.
 *
 * It comes from the client, so it is checked rather than trusted — a bad value
 * is dropped, not saved, and never blocks the analysis.
 */
function readWeather(field: FormDataEntryValue | null): Weather | null {
  if (typeof field !== 'string') return null
  try {
    const parsed = JSON.parse(field) as Partial<Weather>
    const sane = (n: unknown, min: number, max: number) =>
      typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
    // Ranges wide enough for anywhere anyone lives, narrow enough to reject junk.
    if (!sane(parsed.t, -60, 60) || !sane(parsed.h, 0, 100) || !sane(parsed.uv, 0, 20)) return null
    return { t: parsed.t as number, h: parsed.h as number, uv: parsed.uv as number }
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'server_misconfigured' }, 500)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // ── who is asking ────────────────────────────────────────────────────────
  // Members only, enforced here rather than only in the app. The app hides the
  // button from guests, but a hidden button is a suggestion: this endpoint is
  // public, every call spends the operator's prepaid units, and a result that
  // cannot be attached to an account is worth nothing to the person who ran it.
  let userId: string | null = null
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (token) {
    const { data } = await admin.auth.getUser(token)
    userId = data.user?.id ?? null
  }
  if (!userId) {
    return json(
      {
        error: 'members_only',
        message: '회원만 AI 피부 분석을 이용할 수 있습니다. 가입 후 다시 시도해주세요.',
      },
      401,
    )
  }

  // ── image ────────────────────────────────────────────────────────────────
  // Before the quota, not after: a photo we can already tell they would refuse
  // should not cost the caller one of their daily calls, nor a round trip.
  let image: Uint8Array
  let mimeType = 'image/jpeg'
  let weather: Weather | null = null
  try {
    const form = await req.formData()
    weather = readWeather(form.get('weather'))
    const file = form.get('image')
    if (!(file instanceof File)) return json({ error: 'image_required' }, 400)
    if (file.size >= MAX_IMAGE_BYTES) {
      return json({ error: 'image_too_large', photo: 'tooLarge' }, 413)
    }
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return json({ error: 'not_an_image', photo: 'format' }, 415)
    }
    mimeType = file.type
    image = new Uint8Array(await file.arrayBuffer())
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  // ── quota ────────────────────────────────────────────────────────────────
  const subject = `user:${userId}`

  let dailyLimit = DEFAULT_DAILY_LIMIT
  if (Number.isFinite(LIMIT_OVERRIDE) && LIMIT_OVERRIDE > 0) {
    dailyLimit = LIMIT_OVERRIDE
  } else {
    const { data: settings } = await admin
      .from('store_settings')
      .select('analysis_daily_limit')
      .maybeSingle()
    const configured = settings?.analysis_daily_limit
    if (typeof configured === 'number' && configured > 0) dailyLimit = configured
  }

  // Called on `public`, not `private`: PostgREST only serves schemas on its
  // exposed list, and whether `private` is on it is a dashboard setting rather
  // than something the schema can guarantee. The public wrappers are SECURITY
  // DEFINER and granted to service_role alone, so this is no more reachable
  // from a browser than it was before.
  const { data: allowed, error: quotaError } = await admin.rpc('claim_analysis_call', {
    p_subject: subject,
    p_limit: dailyLimit,
  })

  if (quotaError) {
    console.error('quota check failed', quotaError.message)
    return json({ error: 'quota_unavailable' }, 503)
  }
  if (allowed !== true) {
    return json(
      {
        error: 'quota_exceeded',
        message: '오늘 분석 횟수를 모두 사용했습니다. 내일 다시 이용해주세요.',
        limit: dailyLimit,
      },
      429,
    )
  }

  // Hand back the slot claimed above. Perfect Corp consumes units only when a
  // task succeeds, so anything that fails before then cost the operator nothing
  // and must not cost the member a daily call either — a photo nobody read
  // should never come out of someone's allowance.
  const refund = async () => {
    const { error } = await admin.rpc('release_analysis_call', { p_subject: subject })
    if (error) console.error('could not release the quota slot', error.message)
  }

  // ── vendor ───────────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('PERFECTCORP_API_KEY')
  if (!apiKey) {
    await refund()
    return json(
      { error: 'vendor_not_configured', message: '피부 분석 서비스가 아직 연결되지 않았습니다.' },
      501,
    )
  }

  let result: AnalysisResult
  try {
    result = await analyseWithPerfectCorp(image, mimeType, apiKey)
  } catch (err) {
    if (err instanceof VendorError) {
      console.error('vendor failed:', err.message)
      if (!err.billed) await refund()
      return json(
        { error: 'vendor_failed', message: err.userMessage, photo: err.photoKey ?? undefined },
        err.status,
      )
    }
    console.error('unexpected failure', err)
    // We do not know whether that cost anything, so the slot stays spent.
    return json({ error: 'analysis_failed', message: '분석에 실패했습니다. 잠시 후 다시 시도해주세요.' }, 500)
  }

  const analysis = result.analysis

  // Everything the analysis produced, not just what today's screen draws — a
  // scan cannot be retaken retroactively, so anything dropped here is gone.
  const { error: saveError } = await admin.from('scans').insert({
    user_id: userId,
    skin_condition: analysis.condition,
    overall: analysis.overall,
    metrics: analysis.metrics,
    skin_age: analysis.skinAge,
    oiliness: analysis.oiliness,
    skin_type: analysis.skinType?.whole ?? null,
    skin_type_t_zone: analysis.skinType?.tZone ?? null,
    skin_type_u_zone: analysis.skinType?.uZone ?? null,
    tier: TIER,
    weather,
  })
  if (saveError) console.error('could not save scan', saveError.message)

  return json({
    overall: analysis.overall,
    metrics: analysis.metrics,
    condition: analysis.condition,
    skinAge: analysis.skinAge,
    oiliness: analysis.oiliness,
    skinType: analysis.skinType,
    // Every concern they measured, and the overlays that illustrate them.
    // Passed straight through to the screen and deliberately not stored: these
    // are short-lived signed URLs of the customer's face, and keeping a copy of
    // someone's face is exactly what this function promises not to do.
    visuals: result.visuals,
    saved: saveError === null,
  })
})
