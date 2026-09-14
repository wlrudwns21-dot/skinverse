import {
  mapScoreInfo,
  toScoreInfo,
  UnreadableAnalysis,
  type OutputEntry,
  type SkinAnalysis,
} from './mapper.ts'

export type { SkinAnalysis }

/**
 * The Perfect Corp (YouCam) adapter.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE ONLY FILE THAT KNOWS WHICH VENDOR WE USE.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Their AI Skin Analysis is asynchronous and takes four round trips: register
 * the file, PUT the bytes to the URL they hand back, start a task, then poll it.
 * All four are implemented below, against their published OpenAPI description.
 *
 * We ask for `format: "json"` rather than the default ZIP. The archive's bulk is
 * one PNG detection mask per concern, drawn over the customer's own photo — this
 * product shows scores, not overlays, so downloading and unzipping megabytes of
 * images to reach one small JSON file would be work done to throw away.
 */

const API_BASE = 'https://yce-api-01.makeupar.com'

/**
 * Which tier the account is on. Their two vocabularies cannot be mixed in one
 * request — doing so is an outright `InvalidParameters` error — so this picks
 * the whole list, and it is an environment variable because switching tier is a
 * billing decision, not a code change.
 */
const TIER = Deno.env.get('PERFECTCORP_TIER')?.toLowerCase() === 'hd' ? 'hd' : 'sd'

/**
 * What we ask them to measure: the six axes this app scores, plus oiliness and
 * skin type, which classify the skin without appearing as axes themselves.
 *
 * Eight concerns sits in their 5–8 band — 12 units on SD, 16 on HD. Seven would
 * cost exactly the same, which makes `skin_type` free: their own explicit
 * classification is better than anything we could infer from the numbers.
 */
const SD_ACTIONS = [
  'moisture',
  'firmness',
  'pore',
  'age_spot',
  'wrinkle',
  'redness',
  'oiliness',
  'skin_type',
]
const ACTIONS = TIER === 'hd' ? SD_ACTIONS.map((action) => `hd_${action}`) : SD_ACTIONS

/**
 * How long to wait for the engine.
 *
 * Their guide suggests polling every 10 seconds, which suits a batch job. A
 * customer is watching a progress bar, so this starts tight and backs off, and
 * gives up well inside the function's own time limit rather than holding the
 * request open until something else kills it.
 */
const POLL_DELAYS_MS = [800, 1200, 1600, 2000, 2500]
const POLL_BUDGET_MS = 50_000

/** Anything the customer can do nothing about reads the same way. */
const RETRY_MESSAGE = '분석에 실패했습니다. 잠시 후 다시 시도해주세요.'
/** Our account, not their photo — never phrase these as the customer's fault. */
const SERVICE_MESSAGE = '피부 분석 서비스를 일시적으로 이용할 수 없습니다.'

/** Keys of `photoError` in src/i18n/auth.ts. */
export type PhotoErrorKey =
  | 'format'
  | 'tooLarge'
  | 'tooSmall'
  | 'landscape'
  | 'faceTooSmall'
  | 'faceOutOfBound'
  | 'tooDark'
  | 'resolutionHigh'
  | 'noFace'
  | 'pose'
  | 'generic'

export class VendorError extends Error {
  constructor(
    message: string,
    /** What the customer is told; never leaks vendor internals. */
    readonly userMessage: string,
    readonly status = 502,
    /**
     * Which `photoError` string the app should show, when the failure is
     * something about the photo the customer can actually fix. Sending the key
     * rather than the text keeps all four languages in the app, where they are.
     */
    readonly photoKey: PhotoErrorKey | null = null,
    /**
     * Whether the vendor charged us. They consume units only on a successful
     * task, so a rejected photo or a failed engine run costs nothing — and the
     * caller should get their daily allowance back.
     */
    readonly billed = false,
  ) {
    super(message)
    this.name = 'VendorError'
  }
}

/**
 * Their rejection codes, mapped to advice the customer can act on.
 *
 * Two lists feed this: the image-quality codes in their File Specs table, and
 * the engine codes in the OpenAPI enum. Anything absent here is a fault on our
 * side or theirs, not the photo's, and must not be reported as the customer's
 * mistake.
 */
const PHOTO_ERRORS: Record<string, PhotoErrorKey> = {
  // File Specs & Errors
  error_below_min_image_size: 'tooSmall',
  error_exceed_max_image_size: 'resolutionHigh',
  error_src_face_too_small: 'faceTooSmall',
  error_src_face_out_of_bound: 'faceOutOfBound',
  error_lighting_dark: 'tooDark',
  // EngineErrorCode
  exceed_max_filesize: 'tooLarge',
  error_decode_image: 'format',
  error_no_face: 'noFace',
  error_face_parsing: 'noFace',
  error_pose: 'pose',
  // Their moderation fired. Saying so would accuse the customer of something
  // over what is usually a bad crop, so this stays deliberately vague.
  error_nsfw_content_detected: 'generic',
}

/** Turn a vendor error code into something the customer can act on. */
export function photoRejection(code: string): VendorError {
  return new VendorError(
    `vendor rejected the photo: ${code}`,
    // The app replaces this using the key below; it is the fallback for a
    // client too old to recognise it.
    '이 사진으로는 분석이 어려워요. 다른 사진으로 시도해주세요.',
    422,
    PHOTO_ERRORS[code] ?? 'generic',
  )
}

interface Envelope<T> {
  status?: number
  data?: T
  error?: string
  error_code?: string
}

/** One authenticated JSON call to their API, with their errors translated. */
async function call<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch (err) {
    throw new VendorError(`network error calling ${path}: ${err}`, RETRY_MESSAGE)
  }

  const body = (await res.json().catch(() => null)) as Envelope<T> | null

  if (!res.ok) {
    // Out of units. The customer did nothing wrong and retrying will not help;
    // whoever runs the store needs to top up, so this is loud in the logs.
    if (body?.error_code === 'CreditInsufficiency') {
      throw new VendorError(
        'PERFECT CORP ACCOUNT IS OUT OF UNITS — top up to restore skin analysis',
        SERVICE_MESSAGE,
        503,
      )
    }
    if (res.status === 401) {
      throw new VendorError(
        'Perfect Corp rejected our API key — check the PERFECTCORP_API_KEY secret',
        SERVICE_MESSAGE,
        503,
      )
    }
    if (res.status === 429) {
      throw new VendorError('Perfect Corp rate-limited us', RETRY_MESSAGE, 503)
    }
    throw new VendorError(
      `${path} failed: ${res.status} ${body?.error ?? ''} ${body?.error_code ?? ''}`.trim(),
      RETRY_MESSAGE,
    )
  }

  if (!body?.data) throw new VendorError(`${path} returned no data`, RETRY_MESSAGE)
  return body.data
}

interface FileTicket {
  file_id?: string
  requests?: { method?: string; url?: string; headers?: Record<string, string> }[]
}

/**
 * `Content-Length` comes back in their signed headers, but fetch computes it
 * from the body and refuses to let it be set by hand. Passing it through throws.
 */
function sendableHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'content-length'),
  )
}

/**
 * Register the photo and put the bytes where they asked for them.
 *
 * Their docs warn about this twice, so it is worth repeating: registering a file
 * does *not* upload it. Skip the PUT and the later calls fail with a 404 or an
 * `unknown_internal_error` that says nothing about the real cause.
 */
async function upload(image: Uint8Array, mimeType: string, apiKey: string): Promise<string> {
  // Their own name for the file, not the customer's: the original filename can
  // carry a real name or a date and none of it is needed for the analysis.
  const fileName = mimeType.includes('png') ? 'selfie.png' : 'selfie.jpg'

  const data = await call<{ files?: FileTicket[] }>('/s2s/v2.0/file', apiKey, {
    method: 'POST',
    body: JSON.stringify({
      files: [{ content_type: mimeType, file_name: fileName, file_size: image.byteLength }],
    }),
  })

  const ticket = data.files?.[0]
  const target = ticket?.requests?.[0]
  if (!ticket?.file_id || !target?.url) {
    throw new VendorError('file API returned no upload target', RETRY_MESSAGE)
  }

  let put: Response
  try {
    put = await fetch(target.url, {
      method: target.method ?? 'PUT',
      headers: sendableHeaders(target.headers ?? { 'Content-Type': mimeType }),
      body: image,
    })
  } catch (err) {
    throw new VendorError(`could not upload the photo: ${err}`, RETRY_MESSAGE)
  }
  if (!put.ok) {
    throw new VendorError(`photo upload rejected: ${put.status}`, RETRY_MESSAGE)
  }

  return ticket.file_id
}

interface TaskStatus {
  task_status?: 'running' | 'success' | 'error'
  error?: string
  error_message?: string
  results?: { output?: OutputEntry[]; url?: string }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Wait for the engine, then read what it produced. */
async function awaitResult(taskId: string, apiKey: string): Promise<SkinAnalysis> {
  const deadline = Date.now() + POLL_BUDGET_MS

  for (let attempt = 0; ; attempt++) {
    await sleep(POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)])

    const status = await call<TaskStatus>(
      `/s2s/v2.1/task/skin-analysis/${encodeURIComponent(taskId)}`,
      apiKey,
    )

    if (status.task_status === 'error') {
      // No units are consumed on a failed task, so this costs the operator
      // nothing — and the caller should not be charged a daily call either.
      const code = status.error ?? 'unknown'
      if (code in PHOTO_ERRORS) throw photoRejection(code)
      throw new VendorError(
        `engine failed: ${code} ${status.error_message ?? ''}`.trim(),
        RETRY_MESSAGE,
      )
    }

    if (status.task_status === 'success') {
      const output = status.results?.output
      if (!output?.length) {
        throw new VendorError(
          status.results?.url
            ? 'task returned an archive despite format=json'
            : 'task succeeded with no output',
          RETRY_MESSAGE,
          502,
          null,
          // It succeeded, so we were charged even though we cannot read it.
          true,
        )
      }
      try {
        return mapScoreInfo(toScoreInfo(output))
      } catch (err) {
        if (err instanceof UnreadableAnalysis) {
          // Scores we cannot recognise must not become a fabricated neutral
          // result — better to fail than to invent a measurement.
          throw new VendorError(err.message, '분석 결과를 해석하지 못했습니다.', 502, null, true)
        }
        throw err
      }
    }

    if (Date.now() >= deadline) {
      // The task keeps running on their side and stays readable for 24 hours,
      // but nobody is going to wait that long in front of a progress bar.
      throw new VendorError(`task ${taskId} still running after ${POLL_BUDGET_MS}ms`, RETRY_MESSAGE)
    }
  }
}

/**
 * Run an analysis end to end.
 *
 * @param image     raw bytes of the customer's photo
 * @param mimeType  e.g. "image/jpeg"
 * @param apiKey    PERFECTCORP_API_KEY
 */
export async function analyseWithPerfectCorp(
  image: Uint8Array,
  mimeType: string,
  apiKey: string,
): Promise<SkinAnalysis> {
  const fileId = await upload(image, mimeType, apiKey)

  const task = await call<{ task_id?: string }>('/s2s/v2.1/task/skin-analysis', apiKey, {
    method: 'POST',
    body: JSON.stringify({ src_file_id: fileId, dst_actions: ACTIONS, format: 'json' }),
  })
  if (!task.task_id) throw new VendorError('task API returned no task_id', RETRY_MESSAGE)

  return awaitResult(task.task_id, apiKey)
}
