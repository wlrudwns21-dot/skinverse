import { unzipSync } from 'npm:fflate@0.8.2'
import { mapScoreInfo, UnreadableAnalysis, type ScoreInfo, type SkinAnalysis } from './mapper.ts'

export type { SkinAnalysis }

/**
 * The Perfect Corp (YouCam) adapter.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE ONLY FILE THAT KNOWS WHICH VENDOR WE USE.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Their AI Skin Analysis returns a ZIP: `skinanalysisResult/score_info.json`
 * plus one PNG mask per concern. We want the JSON; the masks are overlays for
 * drawing detections on the original photo, which this product does not do.
 *
 * `readScoreZip` below is complete — the response format is documented and
 * their published samples are covered by tests in
 * src/analysis/perfectcorp.test.ts.
 *
 * `analyseWithPerfectCorp` is NOT complete: the call choreography (auth, file
 * upload, task submission, polling) comes from their Developer Guide, which
 * could not be read from this environment. Guessing it would produce code that
 * deploys and then fails in production.
 */

export class VendorError extends Error {
  constructor(
    message: string,
    /** What the customer is told; never leaks vendor internals. */
    readonly userMessage: string,
    readonly status = 502,
    /**
     * Which `photoError` string the app should show, when the failure is
     * something about the photo the customer can actually fix. Translating on
     * the client keeps all four languages in one place instead of here.
     */
    readonly photoKey: PhotoErrorKey | null = null,
  ) {
    super(message)
    this.name = 'VendorError'
  }
}

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
  | 'generic'

/**
 * Their documented rejection codes, mapped to advice the customer can act on.
 *
 * Anything not listed here is a fault on our side or theirs, not the photo's,
 * so it stays a generic failure rather than blaming the customer's selfie.
 */
const PHOTO_ERRORS: Record<string, PhotoErrorKey> = {
  error_below_min_image_size: 'tooSmall',
  error_exceed_max_image_size: 'resolutionHigh',
  error_src_face_too_small: 'faceTooSmall',
  error_src_face_out_of_bound: 'faceOutOfBound',
  error_lighting_dark: 'tooDark',
}

/** Turn a vendor error code into a VendorError the customer can act on. */
export function photoRejection(code: string): VendorError {
  const key = PHOTO_ERRORS[code]
  return new VendorError(
    `vendor rejected the photo: ${code}`,
    // The app replaces this with its own translation; it is the fallback for a
    // client too old to know the key.
    '이 사진으로는 분석이 어려워요. 다른 사진으로 시도해주세요.',
    422,
    key ?? 'generic',
  )
}

/**
 * Pull the scores out of the result ZIP.
 *
 * Only `score_info.json` is decompressed. The PNG masks are the bulk of the
 * archive and nothing here needs them, so the filter keeps both memory and time
 * off them entirely.
 */
export function readScoreZip(zip: Uint8Array): SkinAnalysis {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(zip, { filter: (file) => file.name.endsWith('score_info.json') })
  } catch (err) {
    throw new VendorError(
      `could not open result archive: ${err}`,
      '분석 결과를 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
    )
  }

  // Documented path is skinanalysisResult/score_info.json, but match on the
  // filename so a changed folder name does not break the read.
  const entry = Object.entries(files).find(([name]) => name.endsWith('score_info.json'))?.[1]
  if (!entry) {
    throw new VendorError(
      'score_info.json missing from result archive',
      '분석 결과를 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
    )
  }

  let parsed: ScoreInfo
  try {
    parsed = JSON.parse(new TextDecoder().decode(entry)) as ScoreInfo
  } catch (err) {
    throw new VendorError(
      `score_info.json is not valid JSON: ${err}`,
      '분석 결과를 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
    )
  }

  try {
    return mapScoreInfo(parsed)
  } catch (err) {
    if (err instanceof UnreadableAnalysis) {
      // Scores we cannot recognise must not become a fabricated neutral result.
      throw new VendorError(err.message, '분석 결과를 해석하지 못했습니다.', 502)
    }
    throw err
  }
}

/**
 * Run an analysis end to end.
 *
 * @param image     raw bytes of the customer's photo
 * @param mimeType  e.g. "image/jpeg"
 * @param apiKey    PERFECTCORP_API_KEY
 * @param apiSecret PERFECTCORP_API_SECRET
 */
export async function analyseWithPerfectCorp(
  _image: Uint8Array,
  _mimeType: string,
  _apiKey: string,
  _apiSecret: string,
): Promise<SkinAnalysis> {
  // TODO — the four steps below come from their Developer Guide.
  //
  //   1. Authenticate with apiKey/apiSecret and hold the token they issue.
  //   2. File Management: register the upload, PUT the bytes, keep the file id.
  //   3. Task Management: start an AI Skin Analysis task (V2.1) against that
  //      file id, then poll until it reports success or failure.
  //   4. Download the result ZIP and hand the bytes to readScoreZip():
  //
  //        return readScoreZip(new Uint8Array(await res.arrayBuffer()))
  //
  // Everything after step 4 is already done and tested. Throw VendorError with
  // a customer-safe message on any failure along the way.
  throw new VendorError(
    'Perfect Corp call choreography not implemented',
    '피부 분석 서비스가 아직 연결되지 않았습니다.',
    501,
  )
}
