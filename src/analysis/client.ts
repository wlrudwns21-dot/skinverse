import { supabase } from '../lib/supabase'
import type { MetricKey, SkinConditionKey, Weather } from '../data/types'
import type { AnalysisVisuals, SkinTypeReading } from './perfectcorp'

/**
 * Calls the `analyze-skin` edge function, which is the only thing holding the
 * vendor's paid API key. The browser never talks to the vendor directly.
 */

export interface AnalysisResult {
  overall: number
  metrics: Record<MetricKey, number>
  condition: SkinConditionKey
  /** The vendor's AI-derived skin age, when they report one. */
  skinAge: number | null
  /** Their oiliness reading — classifies the skin, never drawn as an axis. */
  oiliness: number | null
  /** Their own skin-type labels, per zone. */
  skinType: SkinTypeReading | null
  /**
   * Every concern they measured and the overlay that illustrates it.
   *
   * Short-lived signed URLs of the customer's own face. Shown, never stored —
   * they expire within hours and keeping a copy of someone's face is not
   * something this app does.
   */
  visuals: AnalysisVisuals | null
  /** Whether the server wrote this scan to the member's history. */
  saved: boolean
}

export type AnalysisOutcome =
  | { kind: 'ok'; result: AnalysisResult }
  /** The vendor is not wired up yet — fall back to the demo result. */
  | { kind: 'notConfigured' }
  /** Daily allowance spent. `message` is already customer-facing. */
  | { kind: 'quota'; message: string }
  /**
   * Something about the photo itself. `key` indexes `photoError`, so the app
   * says it in the customer's language rather than showing the server's Korean.
   */
  | { kind: 'photo'; key: PhotoErrorKey }
  | { kind: 'failed'; message: string }

/** Keys of `photoError` in ../i18n/auth. */
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

const PHOTO_KEYS = new Set<string>([
  'format', 'tooLarge', 'tooSmall', 'landscape', 'faceTooSmall',
  'faceOutOfBound', 'tooDark', 'resolutionHigh', 'noFace', 'pose', 'generic',
] satisfies PhotoErrorKey[])

const FUNCTION_NAME = 'analyze-skin'

export async function analyseSkin(photo: File, weather: Weather): Promise<AnalysisOutcome> {
  if (!supabase) return { kind: 'notConfigured' }

  const body = new FormData()
  body.append('image', photo)
  // Saved with the scan so the history can tell a routine that stopped working
  // apart from a month that simply got drier.
  body.append('weather', JSON.stringify(weather))

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })

  if (error) {
    // invoke() surfaces non-2xx as an error whose response carries our JSON
    // body; read it so the customer sees the real reason rather than "failed".
    const payload = await readErrorBody(error)
    if (payload?.error === 'vendor_not_configured') return { kind: 'notConfigured' }
    if (payload?.error === 'quota_exceeded') {
      return { kind: 'quota', message: payload.message ?? '' }
    }
    // A key this build does not know about would index `photoError` to
    // undefined and show the customer an empty banner, so fall back.
    if (payload?.photo) {
      return { kind: 'photo', key: PHOTO_KEYS.has(payload.photo) ? payload.photo : 'generic' }
    }
    // The server's own message is Korean; the app has the translation, so this
    // only goes to the console for whoever is reading the logs.
    if (payload?.message) console.warn('[analysis]', payload.message)
    return { kind: 'failed', message: payload?.message ?? '' }
  }

  const result = data as AnalysisResult | null
  if (!result || typeof result.overall !== 'number' || !result.metrics) {
    return { kind: 'failed', message: '' }
  }
  return { kind: 'ok', result }
}

interface ErrorBody {
  error?: string
  message?: string
  photo?: PhotoErrorKey
}

async function readErrorBody(error: unknown): Promise<ErrorBody | null> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      return (await context.json()) as ErrorBody
    } catch {
      return null
    }
  }
  return null
}
