import { supabase } from '../lib/supabase'
import type { MetricKey, SkinConditionKey } from '../data/types'

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
  /** Whether the server wrote this scan to the member's history. */
  saved: boolean
}

export type AnalysisOutcome =
  | { kind: 'ok'; result: AnalysisResult }
  /** The vendor is not wired up yet — fall back to the demo result. */
  | { kind: 'notConfigured' }
  /** Daily allowance spent. `message` is already customer-facing. */
  | { kind: 'quota'; message: string }
  | { kind: 'failed'; message: string }

const FUNCTION_NAME = 'analyze-skin'

export async function analyseSkin(photo: File): Promise<AnalysisOutcome> {
  if (!supabase) return { kind: 'notConfigured' }

  const body = new FormData()
  body.append('image', photo)

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })

  if (error) {
    // invoke() surfaces non-2xx as an error whose response carries our JSON
    // body; read it so the customer sees the real reason rather than "failed".
    const payload = await readErrorBody(error)
    if (payload?.error === 'vendor_not_configured') return { kind: 'notConfigured' }
    if (payload?.error === 'quota_exceeded') {
      return { kind: 'quota', message: payload.message ?? '' }
    }
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
