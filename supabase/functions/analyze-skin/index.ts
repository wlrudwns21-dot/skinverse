import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  analyseWithPerfectCorp,
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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

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

  // ── image ────────────────────────────────────────────────────────────────
  let image: Uint8Array
  let mimeType = 'image/jpeg'
  try {
    const form = await req.formData()
    const file = form.get('image')
    if (!(file instanceof File)) return json({ error: 'image_required' }, 400)
    if (file.size > MAX_IMAGE_BYTES) return json({ error: 'image_too_large' }, 413)
    if (!file.type.startsWith('image/')) return json({ error: 'not_an_image' }, 415)
    mimeType = file.type
    image = new Uint8Array(await file.arrayBuffer())
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  // ── vendor ───────────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('PERFECTCORP_API_KEY')
  const apiSecret = Deno.env.get('PERFECTCORP_API_SECRET')
  if (!apiKey || !apiSecret) {
    return json(
      { error: 'vendor_not_configured', message: '피부 분석 서비스가 아직 연결되지 않았습니다.' },
      501,
    )
  }

  let analysis: SkinAnalysis
  try {
    analysis = await analyseWithPerfectCorp(image, mimeType, apiKey, apiSecret)
  } catch (err) {
    if (err instanceof VendorError) {
      console.error('vendor failed:', err.message)
      return json({ error: 'vendor_failed', message: err.userMessage }, err.status)
    }
    console.error('unexpected failure', err)
    return json({ error: 'analysis_failed', message: '분석에 실패했습니다. 잠시 후 다시 시도해주세요.' }, 500)
  }

  // Persist for members only; a guest's trial result is never written down.
  if (userId) {
    const { error } = await admin.from('scans').insert({
      user_id: userId,
      skin_condition: analysis.condition,
      overall: analysis.overall,
      metrics: analysis.metrics,
      skin_age: analysis.skinAge,
    })
    if (error) console.error('could not save scan', error.message)
  }

  return json({
    overall: analysis.overall,
    metrics: analysis.metrics,
    condition: analysis.condition,
    skinAge: analysis.skinAge,
    saved: userId !== null,
  })
})
