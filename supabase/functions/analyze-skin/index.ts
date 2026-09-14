import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  analyseWithPerfectCorp,
  TIER,
  VendorError,
  type SkinAnalysis,
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

/** Daily call ceilings. Members get more because they are known and billable. */
const MEMBER_DAILY_LIMIT = Number(Deno.env.get('ANALYSIS_MEMBER_DAILY_LIMIT') ?? '20')
const GUEST_DAILY_LIMIT = Number(Deno.env.get('ANALYSIS_GUEST_DAILY_LIMIT') ?? '1')

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

/**
 * Identify the caller for quota purposes without storing anything identifying.
 * A signed-in member is their user id; everyone else is a salted hash of their
 * IP, which answers "same caller?" without keeping the address itself.
 */
async function subjectFor(req: Request, userId: string | null): Promise<string> {
  if (userId) return `user:${userId}`

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  const salt = Deno.env.get('ANALYSIS_IP_SALT') ?? 'skinverse'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip))
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `ip:${hex.slice(0, 32)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'server_misconfigured' }, 500)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Who is asking? An invalid or absent token is fine — that is a guest, and
  // guests get the smaller quota rather than a rejection.
  let userId: string | null = null
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (token) {
    const { data } = await admin.auth.getUser(token)
    userId = data.user?.id ?? null
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
  const subject = await subjectFor(req, userId)
  const limit = userId ? MEMBER_DAILY_LIMIT : GUEST_DAILY_LIMIT

  const { data: allowed, error: quotaError } = await admin
    .schema('private')
    .rpc('claim_analysis_call', { p_subject: subject, p_limit: limit })

  if (quotaError) {
    console.error('quota check failed', quotaError.message)
    return json({ error: 'quota_unavailable' }, 503)
  }
  if (allowed !== true) {
    return json(
      {
        error: 'quota_exceeded',
        message: userId
          ? '오늘 분석 횟수를 모두 사용했습니다.'
          : '비회원은 하루 1회 체험할 수 있습니다. 회원가입하면 제한 없이 이용하실 수 있어요.',
        limit,
      },
      429,
    )
  }

  // Hand back the slot claimed above. Perfect Corp consumes units only when a
  // task succeeds, so anything that fails before then cost the operator nothing
  // and must not cost the caller a daily call either — most of all a guest,
  // whose single daily trial would otherwise be spent on a photo nobody read.
  const refund = async () => {
    const { error } = await admin
      .schema('private')
      .rpc('release_analysis_call', { p_subject: subject })
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

  let analysis: SkinAnalysis
  try {
    analysis = await analyseWithPerfectCorp(image, mimeType, apiKey)
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

  // Persist for members only; a guest's trial result is never written down.
  if (userId) {
    // Everything the analysis produced, not just what today's screen draws —
    // a scan cannot be retaken retroactively, so anything dropped here is gone.
    const { error } = await admin.from('scans').insert({
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
    if (error) console.error('could not save scan', error.message)
  }

  return json({
    overall: analysis.overall,
    metrics: analysis.metrics,
    condition: analysis.condition,
    skinAge: analysis.skinAge,
    oiliness: analysis.oiliness,
    skinType: analysis.skinType,
    saved: userId !== null,
  })
})
