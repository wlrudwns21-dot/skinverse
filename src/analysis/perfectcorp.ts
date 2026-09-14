/**
 * Maps Perfect Corp's `score_info.json` onto the six axes this app scores.
 *
 * Kept pure — no fetch, no unzip, no Deno APIs — so the edge function and the
 * test suite share one implementation. All the domain risk lives here; getting
 * the ZIP open is mechanical by comparison.
 *
 * Their scale runs the same way as ours: "a higher score indicates healthier
 * and more aesthetically pleasing skin condition". No inversion.
 */

export type SkinConditionKey = 'dehydrated' | 'oily' | 'balanced'

export interface SkinMetrics {
  hydration: number
  elasticity: number
  pores: number
  pigmentation: number
  wrinkles: number
  sensitivity: number
}

export interface SkinAnalysis {
  overall: number
  metrics: SkinMetrics
  condition: SkinConditionKey
  /** Their AI-derived skin age, when returned. */
  skinAge: number | null
  raw?: unknown
}

/**
 * Which of their two numbers to believe.
 *
 * `raw_score` is the measurement. `ui_score` is the same measurement adjusted
 * upward — their docs say plainly that it exists "to produce more favorable
 * results, acknowledging that consumers generally prefer positive evaluations".
 *
 * We use `raw`, because these scores do not merely decorate a screen: the
 * weakest axis picks the treatment step and drives which products are
 * recommended. Flattering a customer into the wrong serum is a worse outcome
 * than showing them an honest 48. Flip this one constant to change that call.
 */
export const SCORE_SOURCE: 'raw' | 'ui' = 'raw'

/** A leaf in their JSON: either a score node, or a map of subcategory nodes. */
interface ScoreNode {
  raw_score?: number
  ui_score?: number
  output_mask_name?: string
}
type Category = ScoreNode | Record<string, ScoreNode>

export interface ScoreInfo {
  all?: { score?: number }
  skin_age?: number
  [category: string]: unknown
}

function isScoreNode(value: unknown): value is ScoreNode {
  return typeof value === 'object' && value !== null && 'raw_score' in (value as object)
}

/**
 * Read one category. Some are flat, some nest their result under a subcategory
 * — `hd_pore`, `hd_wrinkle`, `hd_texture` and `hd_acne` all report per-region
 * and carry the summary under `whole`.
 */
function scoreOf(info: ScoreInfo, key: string, subcategory = 'whole'): number | null {
  const category = info[key] as Category | undefined
  if (!category) return null

  const node = isScoreNode(category)
    ? category
    : (category as Record<string, ScoreNode>)[subcategory]
  if (!node) return null

  const value = SCORE_SOURCE === 'ui' ? node.ui_score : node.raw_score
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value) : null
}

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * Both tiers measure the same things under different names, so each axis lists
 * the HD key first and falls back to the SD one. That way a single mapper
 * handles whichever tier the account is on, and a mixed response still works.
 */
const AXIS_KEYS: Record<keyof SkinMetrics, string[]> = {
  hydration: ['hd_moisture', 'moisture'],
  elasticity: ['hd_firmness', 'firmness'],
  pores: ['hd_pore', 'pore'],
  pigmentation: ['hd_age_spot', 'age_spot'],
  wrinkles: ['hd_wrinkle', 'wrinkle'],
  // Redness is the closest thing they measure to reactivity.
  sensitivity: ['hd_redness', 'redness'],
}

/** Used only to classify the skin type, never shown as an axis. */
const OILINESS_KEYS = ['hd_oiliness', 'oiliness']

/**
 * Their explicit classification, when present. The docs list the vocabulary
 * (Normal, Oily, Dry, Combination, Redness, and the "& Redness" combinations)
 * but not the JSON shape of the value, and the published samples omit the field
 * entirely — so this reads defensively and lets the caller fall back.
 */
function conditionFromSkinType(info: ScoreInfo): SkinConditionKey | null {
  const raw = (info.hd_skin_type ?? info.skin_type) as unknown
  if (!raw) return null

  const candidate =
    typeof raw === 'string'
      ? raw
      : typeof raw === 'object' && raw !== null
        ? findLabel(raw as Record<string, unknown>)
        : null
  if (!candidate) return null

  const label = candidate.toLowerCase()
  if (label.includes('dry')) return 'dehydrated'
  if (label.includes('oily') || label.includes('combination')) return 'oily'
  if (label.includes('normal')) return 'balanced'
  return null
}

/** Dig one level for a string value — covers `{ whole: "Oily" }` and friends. */
function findLabel(node: Record<string, unknown>): string | null {
  for (const key of ['whole', 't_zone', 'u_zone']) {
    const value = node[key]
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value !== null) {
      for (const inner of Object.values(value as Record<string, unknown>)) {
        if (typeof inner === 'string') return inner
      }
    }
  }
  return null
}

/**
 * Fallback classification from the numbers.
 *
 * Remember the direction: a *low* oiliness score means oily skin, because a
 * high score is the healthy end of their scale.
 */
function conditionFromScores(
  measured: Partial<Record<keyof SkinMetrics, number>>,
  oiliness: number | null,
): SkinConditionKey {
  const hydration = measured.hydration ?? null
  // An axis we never received says nothing, so it must not tip the diagnosis.
  if (oiliness !== null && oiliness < 55 && (hydration === null || hydration >= 55)) return 'oily'
  if (hydration !== null && hydration < 55) return 'dehydrated'
  if (oiliness !== null && oiliness < 55) return 'oily'
  return 'balanced'
}

/** Thrown when the payload carries no recognisable scores at all. */
export class UnreadableAnalysis extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnreadableAnalysis'
  }
}

export function mapScoreInfo(info: ScoreInfo): SkinAnalysis {
  const metrics = {} as SkinMetrics
  /** Only the axes actually present — the defaults below must not be diagnosed on. */
  const measured: Partial<Record<keyof SkinMetrics, number>> = {}
  const missing: string[] = []

  for (const [axis, keys] of Object.entries(AXIS_KEYS) as [keyof SkinMetrics, string[]][]) {
    const value = keys.map((k) => scoreOf(info, k)).find((v) => v !== null) ?? null
    if (value === null) missing.push(axis)
    else measured[axis] = value
    // A missing axis becomes a neutral 50 rather than a 0, which would read as
    // a catastrophic result and steer every recommendation toward it.
    metrics[axis] = value ?? 50
  }

  // Nothing recognisable came back. Returning a tidy set of 50s would present
  // fabricated neutral scores as a measurement; the caller must fall back to the
  // clearly-labelled demo instead.
  if (missing.length === Object.keys(AXIS_KEYS).length) {
    throw new UnreadableAnalysis('score_info.json carried no recognised categories')
  }

  if (missing.length) {
    console.warn('[perfectcorp] 응답에 없는 항목, 기본값 사용:', missing.join(', '))
  }

  const oiliness = OILINESS_KEYS.map((k) => scoreOf(info, k)).find((v) => v !== null) ?? null

  const reported = info.all?.score
  const overall =
    typeof reported === 'number' && Number.isFinite(reported)
      ? clamp(reported)
      : clamp(Object.values(metrics).reduce((a, b) => a + b, 0) / 6)

  const skinAge =
    typeof info.skin_age === 'number' && Number.isFinite(info.skin_age)
      ? Math.round(info.skin_age)
      : null

  return {
    overall,
    metrics,
    condition: conditionFromSkinType(info) ?? conditionFromScores(measured, oiliness),
    skinAge,
    raw: info,
  }
}
