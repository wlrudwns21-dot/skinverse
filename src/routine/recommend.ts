import type { MetricKey, ProductTag, Weather } from '../data/types'
import type { SkinConditionKey } from '../data/types'
import { isPolluted, type AirBand } from './air'
import { ownershipPoints, type Ownership } from './ownership'
import { tempBand, uvBand, type TempBand, type UvBand } from './rules'
import { dewPoint, drynessBand, type DrynessBand } from './climate'

/**
 * Which products to put in front of this customer, and why.
 *
 * The old rule was one line: `138 - score` for the axis a product targets. That
 * ranks by a single number and can only ever say "94% match", which is not a
 * reason — it is a number with a percent sign after it.
 *
 * This scores the same products against everything we actually know: the six
 * axes, which one is furthest behind, which one is getting worse, the skin type
 * the vendor reported, and the weather the customer is standing in. Every
 * contribution is recorded, so the screen can say *why* a product is at the top
 * instead of asking them to trust a percentage.
 *
 * Pure and deterministic: the same inputs always produce the same ranking.
 */

// ── the inputs a product is scored against ──────────────────────────────────

/** One axis a product speaks to, and how strongly. */
export interface FitAxis {
  axis: MetricKey | 'uv'
  strength: 'primary' | 'secondary'
}

/** Just enough of a product to rank it; the caller keeps the rest. */
export interface Rankable {
  id: string
  tag: ProductTag
  /**
   * The axis it answers to. `uv` means it is scored against the UV index.
   *
   * Still here, and still single, because the modifiers below are about the
   * product's headline purpose: whether the report singled out *this* axis,
   * whether *this* axis is falling. Breadth is handled by `fits`.
   */
  metric: MetricKey | 'uv'
  /**
   * Every axis the product speaks to, from the catalogue's own `fits` column.
   *
   * This was sitting unused while the score was computed from `metric` alone,
   * and it is the difference between ranking a product and ranking the
   * shelf it is filed on. Two AESTURA hydration creams scored identically
   * for every customer, for ever, because the only thing being looked at was
   * the word "Hydration" — while the catalogue already recorded that one of
   * them also answers to sensitivity and the other does not.
   *
   * Empty is allowed and falls back to `metric` as a lone primary, so a
   * product registered without the column still ranks the way it used to.
   */
  fits?: FitAxis[]
}

export interface RecommendContext {
  metrics: Record<MetricKey, number>
  weather: Weather
  /** Today's particulates, or null when the air-quality service was silent. */
  air?: AirBand | null
  /** 0–100. Zero when there is no reading. */
  pollution?: number
  /**
   * What the customer has bought, keyed by product id.
   *
   * Absent for a guest, and for a member who has never ordered — in both cases
   * the ranking simply does not consider it.
   */
  owned?: Record<string, Ownership>
  /** The axis the report singled out, if it singled one out. */
  focus: MetricKey | null
  /** Axes that fell since the previous comparable scan. */
  falling: MetricKey[]
  condition: SkinConditionKey
}

// ── why a product scored what it did ────────────────────────────────────────

export type ReasonKind =
  /** The axis this product targets is low on its own terms. */
  | 'axisNeed'
  /** It also speaks to other axes this customer is short on. */
  | 'alsoHelps'
  /** It targets the axis the report singled out. */
  | 'focusAxis'
  /** That axis has been getting worse. */
  | 'axisFalling'
  /** The air is pulling water out of the skin. */
  | 'dryAir'
  /** The air is saturated — heavy hydration will sit on the surface. */
  | 'humidAir'
  /** Sebum output rises with skin temperature. */
  | 'heat'
  /** Cold and indoor heating stress the barrier. */
  | 'cold'
  /** The UV index is doing the damage this product answers to. */
  | 'uvLoad'
  /** The vendor classified the skin as oily or combination. */
  | 'oilySkin'
  /** The vendor classified the skin as dry. */
  | 'drySkin'
  /** Particulates are high — the skin is carrying a load it did not choose. */
  | 'polluted'
  /** They bought this recently and still have it. */
  | 'hasIt'
  /** By our reckoning they are about to run out. */
  | 'runningOut'

export interface Reason {
  kind: ReasonKind
  /** Points this contributed. Negative means it argued against the product. */
  points: number
}

export interface Recommendation {
  id: string
  /**
   * The ranking signal. Higher means "put this nearer the top".
   *
   * **Not a percentage, and not for printing.** It is dominated by how far
   * behind the customer's skin is on the axis the product answers to, which
   * is the right way to order a shelf and a terrible thing to show someone:
   * it was being printed as "매치 %", so a customer whose skin measured 85
   * across the board was told that 24 of our 25 products were a 15% match.
   * Good skin made the shop say "none of this is for you".
   *
   * Use {@link Recommendation.match} for display. `rank` fills it in.
   */
  score: number
  /**
   * 0–100, and the number the shop prints.
   *
   * It answers the question a shopper is actually asking — "how well does
   * this suit me compared with everything else here?" — by placing `score`
   * on the range this customer's own catalogue spans. So it says nothing
   * about how bad anyone's skin is, which is not a shopper's question and
   * was never what the old number meant either, however it was labelled.
   */
  match: number
  /** Biggest contribution first, so the screen can show the top one or two. */
  reasons: Reason[]
}

// ── weights ─────────────────────────────────────────────────────────────────

/**
 * Every weight in one table, so the ranking can be argued with.
 *
 * The axis need dominates on purpose: what the skin measured is a stronger
 * signal than today's weather, and a customer whose pores score 38 should be
 * shown a pore product in January as well as August. The modifiers reorder
 * products of similar need; they do not override a real deficit.
 */
export const WEIGHTS = {
  /** The weakest axis, as named by the report. */
  focusAxis: 12,
  /** An axis that has declined since the last comparable scan. */
  axisFalling: 8,
  /** Dry or very dry air, for products that hold water in. */
  dryAir: 10,
  /** Humid air, against heavy hydration — it will not absorb. */
  humidAir: -10,
  /** Humid or hot air, for pore products: sebum output is up. */
  sebum: 8,
  /** Cold, for soothing products: barrier stress. */
  cold: 8,
  /** High UV, for brightening: UV is what drives pigmentation. */
  uvPigment: 6,
  /** The vendor called the skin oily or combination. */
  oilySkin: 8,
  /** The vendor called the skin dry. */
  drySkin: 8,
  /**
   * Bad air, for cleansing and antioxidant products.
   *
   * PM2.5 settles into the follicular opening carrying oxidants with it, so
   * the two answers are getting it off at the end of the day and giving the
   * skin something to neutralise it with. Weighted below the axis need on
   * purpose: a dusty week does not change what the skin measured.
   */
  polluted: 9,
  /**
   * What they already own, and what they are about to run out of.
   *
   * Small on purpose, and the smallest weight in the table. This is inference
   * on top of a guess — we do not know how much anyone actually uses — so it
   * is allowed to break a tie between two similar products and nothing more.
   * Burying something the skin measurably needs because of an estimate about a
   * bottle would be the recommender overreaching.
   */
  ownership: 7,
} as const

/**
 * How much of a secondary axis's need counts, and how much breadth can earn.
 *
 * A product that also helps with something else is worth more, and the honest
 * amount is "a bit". Two guards keep it there.
 *
 * The weight is well under half, because a secondary claim is the maker's
 * "and it also…", not what the product was formulated around.
 *
 * The cap is the one that matters, and it exists because of how this data is
 * produced: `fits` is typed in per product, and without a ceiling the ranking
 * would reward whoever wrote the longest list. A sunscreen with four axes
 * recorded would beat an identical sunscreen with three, which is a fact
 * about data entry and not about either product. Breadth is also averaged
 * rather than summed, so listing the same need twice in different words
 * cannot buy anything either.
 */
const SECONDARY_WEIGHT = 0.35
const BREADTH_CAP = 14

/** Where the printed match percentage starts and stops. */
const MATCH_FLOOR = 58
const MATCH_CEIL = 96
/** What everything scores when nothing separates it — see `toMatch`. */
const MATCH_FLAT = 76

const isDryAir = (d: DrynessBand) => d === 'drying' || d === 'harsh' || d === 'severe'
const isHot = (t: TempBand) => t === 'warm' || t === 'hot'
const isCold = (t: TempBand) => t === 'cold' || t === 'cool'
const isHighUv = (uv: UvBand) => uv === 'high' || uv === 'veryHigh' || uv === 'extreme'

/**
 * How much a sun product is needed, from the WHO index band.
 *
 * Never zero: sunscreen at UV 1 is still the single highest-value step in any
 * routine, and burying it in winter would be bad advice dressed up as
 * personalisation.
 */
const UV_NEED: Record<UvBand, number> = {
  low: 55,
  moderate: 68,
  high: 80,
  veryHigh: 88,
  extreme: 94,
}

// ── scoring ─────────────────────────────────────────────────────────────────

export function scoreProduct(product: Rankable, context: RecommendContext): Recommendation {
  const dryness = drynessBand(context.weather)
  const uv = uvBand(context.weather.uv)
  const temp = tempBand(context.weather.t)
  /** Sweat is not evaporating, so anything heavy will sit on the surface. */
  const occlusive = dewPoint(context.weather.t, context.weather.h) >= 24

  const reasons: Reason[] = []
  let total = 0

  /**
   * Record a contribution and apply it in one step.
   *
   * Deliberately the only way to change the score: keeping a running total and
   * a separate list of reasons lets the two drift apart, and a score that does
   * not match the reasons printed beside it is worse than no reasons at all.
   */
  const add = (kind: ReasonKind, points: number) => {
    if (points === 0) return
    total += points
    reasons.push({ kind, points })
  }

  /**
   * How much help one axis is asking for.
   *
   * A score of 40 is a need of 60. Linear on purpose — the scale is already
   * the vendor's own judgement of severity, so re-curving it would be us
   * second-guessing a model we cannot see.
   */
  const need = (axis: MetricKey | 'uv') =>
    axis === 'uv' ? UV_NEED[uv] : 100 - context.metrics[axis]

  // Fall back to the headline axis for a product registered before `fits`.
  const fits: FitAxis[] =
    product.fits && product.fits.length > 0
      ? product.fits
      : [{ axis: product.metric, strength: 'primary' }]

  const primary = fits.filter((f) => f.strength === 'primary')
  const secondary = fits.filter((f) => f.strength !== 'primary')

  /*
   * Base: how badly the things this product is *for* are doing.
   *
   * The mean rather than the sum. A balm that is primary on both elasticity
   * and wrinkles is one product doing one job well, not two products — summing
   * would put it on a different scale from every single-axis item and it would
   * win every list by arithmetic.
   */
  const base = primary.length
    ? primary.reduce((sum, f) => sum + need(f.axis), 0) / primary.length
    : need(product.metric)
  add(primary.some((f) => f.axis === 'uv') ? 'uvLoad' : 'axisNeed', Math.round(base))

  // And a bounded nod to what else it covers.
  if (secondary.length) {
    const mean = secondary.reduce((sum, f) => sum + need(f.axis), 0) / secondary.length
    add('alsoHelps', Math.min(BREADTH_CAP, Math.round(mean * SECONDARY_WEIGHT)))
  }

  /*
   * The report's focus and the fall both name a single axis, so they are
   * asked about the product's headline purpose rather than its whole list —
   * a sunscreen that happens to list pigmentation as a secondary is not the
   * product the report meant when it singled pigmentation out.
   */
  if (product.metric !== 'uv') {
    if (context.focus === product.metric) add('focusAxis', WEIGHTS.focusAxis)
    if (context.falling.includes(product.metric)) add('axisFalling', WEIGHTS.axisFalling)
  }

  // Weather. Humidity decides whether a texture will absorb at all, which is
  // why it can argue against an otherwise well-matched hydration product.
  if (product.tag === 'Hydration') {
    if (isDryAir(dryness)) add('dryAir', WEIGHTS.dryAir)
    else if (occlusive || dryness === 'humid') add('humidAir', WEIGHTS.humidAir)
  }

  // Sebum tracks temperature; what damp air changes is whether sweat can
  // evaporate. Both raise the case for a pore product, for different reasons.
  if (product.tag === 'Pore' && (occlusive || isHot(temp))) {
    add(isHot(temp) ? 'heat' : 'humidAir', WEIGHTS.sebum)
  }

  if (product.tag === 'Soothing' && isCold(temp)) add('cold', WEIGHTS.cold)

  if (product.tag === 'Brightening' && isHighUv(uv)) add('uvLoad', WEIGHTS.uvPigment)

  /*
   * Particulates.
   *
   * Only when we actually have a reading — `air` is null when the service did
   * not answer, and "we do not know" must not be scored as "the air is clean".
   *
   * Pore products answer the mechanical half (what settles in the follicle)
   * and brightening products the chemical half (oxidative stress, which is
   * the documented route from PM2.5 to pigmentation). Scaled by how bad it
   * actually is, so a marginal day nudges rather than reorders.
   */
  if (context.air && isPolluted(context.air)) {
    if (product.tag === 'Pore' || product.tag === 'Brightening') {
      add('polluted', Math.round((WEIGHTS.polluted * (context.pollution ?? 0)) / 100))
    }
  }

  // The skin type the vendor reported, folded into our three conditions.
  if (context.condition === 'oily') {
    if (product.tag === 'Pore') add('oilySkin', WEIGHTS.oilySkin)
    else if (product.tag === 'Hydration') add('oilySkin', -WEIGHTS.oilySkin)
  } else if (context.condition === 'dehydrated' && product.tag === 'Hydration') {
    add('drySkin', WEIGHTS.drySkin)
  }

  /*
   * What is already on their shelf.
   *
   * Last, because it argues about the purchase rather than about the skin, and
   * it should only ever be adjusting an order the rest of the scoring has
   * already decided.
   */
  const ownership = context.owned?.[product.id]
  if (ownership) {
    const points = ownershipPoints(ownership, WEIGHTS.ownership)
    if (points !== 0) add(points > 0 ? 'runningOut' : 'hasIt', points)
  }

  reasons.sort((a, b) => Math.abs(b.points) - Math.abs(a.points))

  return {
    id: product.id,
    score: Math.round(total),
    // Only `rank` can work this out, because it depends on the rest of the
    // catalogue. Scoring one product on its own leaves it at the flat value
    // rather than inventing a comparison there is nothing to make.
    match: MATCH_FLAT,
    reasons,
  }
}

/**
 * Turn ranking scores into the percentages the shop prints.
 *
 * Relative, and deliberately so. "How well does this suit me?" only has an
 * answer next to the alternatives — a customer comparing two serums wants to
 * know which one is more for them, and neither "your hydration is 48" nor
 * "this product is objectively 64% good" is that answer.
 *
 * It is also the only way the number survives healthy skin. Anchored to a
 * fixed scale, a customer measuring 85 everywhere needs little enough that
 * every product lands at the bottom of it, and we are back to a shop telling
 * someone with good skin that nothing suits them.
 *
 * When nothing separates the catalogue — every product scoring the same,
 * which is what a perfectly flat set of readings produces — there is no
 * ranking to express and everything gets the same middling number. Spreading
 * a tie across the full range would be inventing a recommendation.
 */
function toMatch(scores: number[]): number[] {
  const hi = Math.max(...scores)
  const lo = Math.min(...scores)
  if (hi - lo < 1) return scores.map(() => MATCH_FLAT)
  return scores.map((s) =>
    Math.round(MATCH_FLOOR + ((MATCH_CEIL - MATCH_FLOOR) * (s - lo)) / (hi - lo)),
  )
}

/**
 * Rank a catalogue. Ties break by product id so the order never flickers
 * between renders for no reason the customer can see.
 */
export function rank<T extends Rankable>(
  products: T[],
  context: RecommendContext,
): Recommendation[] {
  const scored = products.map((product) => scoreProduct(product, context))
  const matches = toMatch(scored.map((r) => r.score))
  // Monotonic in `score`, so sorting by one and printing the other can never
  // produce a list whose percentages run out of order.
  return scored
    .map((r, i) => ({ ...r, match: matches[i] }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

/**
 * Which axes have fallen since the last comparable scan.
 *
 * Kept here rather than in the report because the recommender is the only
 * thing that needs it, and it needs the raw list rather than a headline.
 */
export function fallingAxes(
  now: Record<MetricKey, number>,
  before: Record<MetricKey, number> | null,
  threshold: number,
): MetricKey[] {
  if (!before) return []
  return (Object.keys(now) as MetricKey[]).filter((axis) => before[axis] - now[axis] >= threshold)
}
