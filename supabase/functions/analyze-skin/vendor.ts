/**
 * The skin-analysis vendor adapter.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONLY FILE THAT KNOWS WHICH VENDOR WE USE.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Everything else — the quota, the auth check, the normalisation, the UI —
 * works against `SkinAnalysis` below. Swapping Perfect Corp for another
 * provider, or running both side by side, means editing this file and nothing
 * else.
 *
 * `analyseWithPerfectCorp` is deliberately left unimplemented rather than
 * guessed at. Perfect Corp's API reference is behind their developer portal,
 * and writing plausible-looking calls against an unverified contract produces
 * code that compiles, deploys, and fails in production. Fill it in from their
 * docs; the shape it must return is fixed below.
 */

/** The six axes the app scores, 0–100, higher is better. */
export interface SkinMetrics {
  hydration: number
  elasticity: number
  pores: number
  pigmentation: number
  wrinkles: number
  sensitivity: number
}

export interface SkinAnalysis {
  /** 0–100 overall score. */
  overall: number
  metrics: SkinMetrics
  /** Which canned advice profile best fits — drives the routine and copy. */
  condition: 'dehydrated' | 'oily' | 'balanced'
  /** Whatever the vendor returned, kept verbatim for debugging and for later
   *  re-derivation if we change how we map their concerns onto our six axes. */
  raw?: unknown
}

export class VendorError extends Error {
  constructor(
    message: string,
    /** What the caller should be told; never leaks vendor internals. */
    readonly userMessage: string,
    readonly status = 502,
  ) {
    super(message)
    this.name = 'VendorError'
  }
}

/**
 * Turn the image into scores.
 *
 * @param image     raw bytes of the customer's photo
 * @param mimeType  e.g. "image/jpeg"
 * @param apiKey    from the PERFECTCORP_API_KEY secret
 * @param apiSecret from the PERFECTCORP_API_SECRET secret
 */
export async function analyseWithPerfectCorp(
  _image: Uint8Array,
  _mimeType: string,
  _apiKey: string,
  _apiSecret: string,
): Promise<SkinAnalysis> {
  // TODO — implement against Perfect Corp's published API reference.
  //
  // What this function must do, whatever their exact endpoints turn out to be:
  //   1. authenticate with apiKey/apiSecret and obtain whatever token they issue
  //   2. hand them the image (upload, then reference it, or send it inline)
  //   3. wait for the analysis to finish — polling if the call is asynchronous
  //   4. map their concern scores onto the six axes in SkinMetrics
  //   5. throw VendorError with a user-safe message on any failure
  //
  // Note on step 4: their scale may run the other way round (higher = worse).
  // `invertIfNeeded` below exists for exactly that; check their docs before
  // assuming, because getting it backwards silently tells every customer the
  // opposite of the truth.
  throw new VendorError(
    'Perfect Corp adapter not implemented',
    '피부 분석 서비스가 아직 연결되지 않았습니다.',
    501,
  )
}

// ── helpers for whoever fills the adapter in ────────────────────────────────

/** Vendors that score severity (higher = worse) need flipping to our scale. */
export const invertIfNeeded = (score: number, higherIsWorse: boolean) =>
  clamp(higherIsWorse ? 100 - score : score)

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * Pick the advice profile from the scores, so the routine and copy stay
 * consistent with whatever the vendor measured.
 */
export function deriveCondition(m: SkinMetrics): SkinAnalysis['condition'] {
  if (m.pores < 50 && m.hydration >= 55) return 'oily'
  if (m.hydration < 55) return 'dehydrated'
  return 'balanced'
}

/** Unweighted mean; replace if some axes should matter more than others. */
export function deriveOverall(m: SkinMetrics): number {
  const values = Object.values(m)
  return clamp(values.reduce((a, b) => a + b, 0) / values.length)
}
