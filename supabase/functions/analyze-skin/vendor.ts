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
  ) {
    super(message)
    this.name = 'VendorError'
  }
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
