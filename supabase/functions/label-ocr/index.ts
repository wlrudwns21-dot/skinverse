import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsFor } from './cors.ts'

/**
 * Read the ingredient list off a photograph of a label.
 *
 * Runs here rather than in the browser for two reasons, neither of them
 * convenience: the OCR provider's key must never reach a page, and the photo
 * must never be stored. This forwards the image, takes the text, and keeps
 * nothing.
 *
 * -- What is deliberately absent ---------------------------------------------
 *
 * No storage bucket, no logging of the image, no logging of the text. A label
 * photograph is taken at arm's length in someone's bathroom and routinely
 * catches a face, a prescription, a name on a parcel. None of that is needed to
 * read an ingredient list, so none of it is written down. The only thing that
 * leaves this function is the recognised text, straight back to the caller that
 * sent the photo.
 *
 * Members only, because OCR is billed per call and an open endpoint is somebody
 * else's free OCR service.
 *
 * -- Providers ---------------------------------------------------------------
 *
 * CLOVA OCR first: it is trained on Korean, and an ingredient list is dense
 * Korean set in four-point type, which is where general-purpose engines lose
 * syllables.
 * Google Vision is the fallback for labels printed in Latin script. Whichever
 * key is present is the one used; with neither, the reply says so plainly so the
 * screen can offer the typed path instead of failing in a way that reads as
 * broken.
 *
 * -- Why every message here is an ASCII code ---------------------------------
 *
 * Korean is written by the console, not here. This file reaches the platform as
 * a transcribed payload and Korean written that way has been silently corrupted
 * before, in the error strings specifically - the strings nobody reads until
 * something has already gone wrong. The codes below are mapped to Korean in
 * src/ingredients/remote.ts. Keep new messages out.
 */

/** A generous ceiling. A phone photo is 2-5MB; 12 is a mistake, not a label. */
const MAX_BYTES = 12 * 1024 * 1024

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

interface Decoded {
  base64: string
  mime: string
  bytes: number
}

/**
 * Pull the payload out of a data URL.
 *
 * The browser sends `data:image/jpeg;base64,...`. Rejecting anything that is not
 * an image keeps this from being used to post arbitrary bytes at a paid API on
 * our account.
 */
function decode(image: unknown): Decoded | null {
  if (typeof image !== 'string') return null
  const m = /^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,([A-Za-z0-9+/=]+)$/.exec(
    image.trim(),
  )
  if (!m) return null
  const base64 = m[2]
  // 4 base64 characters carry 3 bytes; close enough to check a ceiling against.
  const bytes = Math.floor((base64.length * 3) / 4)
  return { base64, mime: m[1], bytes }
}

/** Every line CLOVA found, joined. Its `inferText` is per field, not per line. */
interface ClovaField {
  inferText?: string
  lineBreak?: boolean
}

async function readWithClova(
  invokeUrl: string,
  secret: string,
  img: Decoded,
): Promise<string> {
  const res = await fetch(invokeUrl, {
    method: 'POST',
    headers: { 'X-OCR-SECRET': secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 'V2',
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      lang: 'ko',
      images: [{
        format: img.mime.replace('image/', '').replace('jpg', 'jpeg'),
        name: 'label',
        data: img.base64,
      }],
    }),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`CLOVA HTTP ${res.status}: ${text.slice(0, 200)}`)

  const parsed = JSON.parse(text) as {
    images?: { inferResult?: string; message?: string; fields?: ClovaField[] }[]
  }
  const image = parsed.images?.[0]
  if (image?.inferResult && image.inferResult !== 'SUCCESS') {
    throw new Error(`CLOVA ${image.inferResult}: ${image.message ?? ''}`)
  }

  /*
   * Fields joined with a space, and a newline where CLOVA saw a line end.
   *
   * The line breaks matter downstream: the label parser uses them to tell a name
   * wrapped across two lines from two separate ingredients. Flattening
   * everything to spaces would throw that away and leave it guessing.
   */
  let out = ''
  for (const f of image?.fields ?? []) {
    out += (f.inferText ?? '') + (f.lineBreak ? '\n' : ' ')
  }
  return out.trim()
}

async function readWithVision(key: string, img: Decoded): Promise<string> {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: img.base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          // Korean first, then English: a Korean label carries both, and the
          // hint decides which way an ambiguous glyph is read.
          imageContext: { languageHints: ['ko', 'en'] },
        }],
      }),
    },
  )

  const text = await res.text()
  if (!res.ok) throw new Error(`Vision HTTP ${res.status}: ${text.slice(0, 200)}`)

  const parsed = JSON.parse(text) as {
    responses?: { fullTextAnnotation?: { text?: string }; error?: { message?: string } }[]
  }
  const first = parsed.responses?.[0]
  if (first?.error?.message) throw new Error(`Vision: ${first.error.message}`)
  return (first?.fullTextAnnotation?.text ?? '').trim()
}

Deno.serve(async (req) => {
  const cors = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  const clovaUrl = Deno.env.get('CLOVA_OCR_URL')?.trim()
  const clovaSecret = Deno.env.get('CLOVA_OCR_SECRET')?.trim()
  const visionKey = Deno.env.get('GOOGLE_VISION_KEY')?.trim()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  // Members only. OCR is billed per call, so an open endpoint is somebody else's
  // free OCR service running on our invoice.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'members_only' }, 401, cors)
  const { data: who } = await admin.auth.getUser(token)
  if (!who.user?.id) return json({ error: 'members_only' }, 401, cors)

  // Checked after authentication so an unconfigured provider is not a way to
  // probe whether the endpoint exists.
  const configured = (clovaUrl && clovaSecret) || visionKey
  if (!configured) {
    return json(
      {
        error: 'not_configured',
        message:
          'OCR provider is not configured. Set CLOVA_OCR_URL and CLOVA_OCR_SECRET, or GOOGLE_VISION_KEY.',
      },
      503,
      cors,
    )
  }

  let body: { image?: unknown } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json({ error: 'bad_request', message: 'Body must be JSON.' }, 400, cors)
  }

  const img = decode(body.image)
  if (!img) return json({ error: 'bad_image' }, 400, cors)
  if (img.bytes > MAX_BYTES) return json({ error: 'too_large' }, 413, cors)

  try {
    const text = clovaUrl && clovaSecret
      ? await readWithClova(clovaUrl, clovaSecret, img)
      : await readWithVision(visionKey as string, img)

    if (!text) return json({ ok: false, error: 'no_text' }, 200, cors)

    // The text goes back and nowhere else. Nothing about this request - not the
    // image, not the result, not the member - is written down.
    return json({ ok: true, text }, 200, cors)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // The provider's own words, without the image and without the recognised
    // text. Enough to diagnose a bad key or an exhausted quota; nothing that
    // reconstructs what somebody photographed.
    console.error('label ocr failed', message.slice(0, 300))
    return json({ ok: false, error: 'ocr_failed' }, 502, cors)
  }
})
