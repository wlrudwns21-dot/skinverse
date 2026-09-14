import type { MetricKey, Weather } from '../data/types'
import type { ScanRecord } from '../store/state'

/**
 * What the numbers actually say.
 *
 * A scan produces eight readings and a history of them. On its own that is a
 * row of bars, which tells a customer what they already suspected. The value is
 * in the comparisons: which axis is furthest behind the others, what moved
 * since last time, and — the one nobody else can do — whether it moved because
 * of the routine or because the weather changed underneath it.
 *
 * Every function here is pure and returns structured findings, never sentences.
 * The wording lives in src/i18n/insights.ts so all four languages stay in step,
 * and so the rules can be reviewed without reading through copy.
 */

// ── thresholds ──────────────────────────────────────────────────────────────

/**
 * How far below the others an axis must sit before it is worth singling out.
 *
 * Six axes on a 100-point scale drift a few points apart by measurement noise
 * alone. Eight points is roughly where the gap stops being noise and starts
 * being a finding the customer can act on.
 */
export const WEAK_AXIS_GAP = 8

/** Below this an axis is a problem regardless of what the others are doing. */
export const LOW_SCORE = 50

/** At or above this an axis is genuinely good news and worth saying so. */
export const STRONG_SCORE = 75

/**
 * The smallest score change treated as real movement.
 *
 * Perfect Corp does not publish a repeatability figure, and lighting, angle and
 * time of day all move these numbers. Treating anything smaller than 5 points
 * as a trend would have customers chasing noise — and would make the app look
 * like it is inventing progress.
 */
export const MOVE_THRESHOLD = 5

/** A humidity swing large enough to explain a hydration change by itself. */
export const HUMIDITY_SWING = 15

/** Zones differing by more than this read as genuinely combination skin. */
export const ZONE_GAP = 1

/** How long a scan stays current enough to compare against. */
export const STALE_AFTER_DAYS = 90

export const AXES: MetricKey[] = [
  'hydration',
  'elasticity',
  'pores',
  'pigmentation',
  'wrinkles',
  'sensitivity',
]

// ── findings ────────────────────────────────────────────────────────────────

export type Direction = 'up' | 'down'

export type Insight =
  /** The axis furthest behind the rest. What the routine's treatment step targets. */
  | { kind: 'weakest'; axis: MetricKey; score: number; gap: number }
  /** Everything is within a few points — no single axis to chase. */
  | { kind: 'even'; spread: number; lowest: number }
  /** An axis worth being pleased about. */
  | { kind: 'strongest'; axis: MetricKey; score: number }
  /** Overall score against the previous scan. */
  | { kind: 'overallMove'; direction: Direction; delta: number; days: number }
  /** The axis that moved most since the previous scan. */
  | { kind: 'axisMove'; axis: MetricKey; direction: Direction; delta: number }
  /**
   * A hydration move that tracks a humidity move. The single most useful thing
   * this app can say, and it is only possible because the weather is stored
   * with each scan.
   */
  | { kind: 'weatherDriven'; axis: MetricKey; direction: Direction; delta: number; humidityDelta: number }
  /** Skin age, and which way it is going. */
  | { kind: 'skinAge'; age: number; direction: Direction | null; delta: number }
  /** T-zone and U-zone disagree — the textbook combination-skin finding. */
  | { kind: 'zoneContrast'; tZone: string; uZone: string }
  /** The vendor's own classification, in their words. */
  | { kind: 'vendorType'; label: string }
  /** Oiliness is drifting. Not an axis on screen, but a real measurement. */
  | { kind: 'oilinessMove'; direction: Direction; delta: number }
  /** Not enough history to compare against yet. */
  | { kind: 'firstScan' }

export interface Report {
  insights: Insight[]
  /** The axis the routine and product recommendations should target. */
  focus: MetricKey
  /** Scans used to build this, newest first. */
  sampleSize: number
}

// ── helpers ─────────────────────────────────────────────────────────────────

const daysBetween = (later: string, earlier: string) =>
  Math.max(0, Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000))

/** Lowest-scoring axis. Ties break by the order in AXES, so it is deterministic. */
export function weakestAxis(metrics: Record<MetricKey, number>): MetricKey {
  return AXES.reduce((low, axis) => (metrics[axis] < metrics[low] ? axis : low), AXES[0])
}

function strongestAxis(metrics: Record<MetricKey, number>): MetricKey {
  return AXES.reduce((high, axis) => (metrics[axis] > metrics[high] ? axis : high), AXES[0])
}

/**
 * The most recent earlier scan worth comparing against.
 *
 * A scan from eight months ago is not a comparison, it is a different person's
 * skin — season, routine and age have all moved. Past STALE_AFTER_DAYS we would
 * rather say nothing than present it as "since last time".
 */
function comparable(history: ScanRecord[], now: string): ScanRecord | null {
  for (const scan of history) {
    if (!scan.metrics) continue
    if (daysBetween(now, scan.createdAt) > STALE_AFTER_DAYS) return null
    return scan
  }
  return null
}

const move = (delta: number): Direction => (delta > 0 ? 'up' : 'down')

// ── the report ──────────────────────────────────────────────────────────────

export interface ReportInput {
  metrics: Record<MetricKey, number>
  overall: number
  skinAge: number | null
  oiliness: number | null
  skinType: { whole: string | null; tZone: string | null; uZone: string | null } | null
  weather: Weather | null
  /** When this scan was taken. Defaults to now. */
  at?: string
  /** Earlier scans, newest first. The current scan must not be included. */
  previous: ScanRecord[]
}

export function buildReport(input: ReportInput): Report {
  const { metrics, overall, skinAge, oiliness, skinType, weather, previous } = input
  const at = input.at ?? new Date().toISOString()

  const insights: Insight[] = []

  // ── where the skin stands right now ───────────────────────────────────────
  const weakest = weakestAxis(metrics)
  const strongest = strongestAxis(metrics)
  const low = metrics[weakest]
  const high = metrics[strongest]
  const spread = high - low

  // Naming a "weakest" axis when all six sit within a few points of each other
  // invents a priority out of noise, so that case gets its own finding.
  const secondLowest = Math.min(...AXES.filter((a) => a !== weakest).map((a) => metrics[a]))
  const gap = secondLowest - low

  if (gap >= WEAK_AXIS_GAP || low < LOW_SCORE) {
    insights.push({ kind: 'weakest', axis: weakest, score: low, gap })
  } else {
    insights.push({ kind: 'even', spread, lowest: low })
  }

  if (high >= STRONG_SCORE) {
    insights.push({ kind: 'strongest', axis: strongest, score: high })
  }

  if (skinType?.whole) insights.push({ kind: 'vendorType', label: skinType.whole })

  // A T-zone and U-zone that disagree is the clearest reading in the whole
  // response: it means one routine over the whole face is the wrong answer.
  if (skinType?.tZone && skinType.uZone && skinType.tZone !== skinType.uZone) {
    insights.push({ kind: 'zoneContrast', tZone: skinType.tZone, uZone: skinType.uZone })
  }

  // ── what changed ──────────────────────────────────────────────────────────
  const last = comparable(previous, at)

  if (!last) {
    insights.push({ kind: 'firstScan' })
    if (skinAge !== null) insights.push({ kind: 'skinAge', age: skinAge, direction: null, delta: 0 })
    return { insights, focus: weakest, sampleSize: previous.length + 1 }
  }

  const days = daysBetween(at, last.createdAt)
  const overallDelta = overall - last.overall
  if (Math.abs(overallDelta) >= MOVE_THRESHOLD) {
    insights.push({
      kind: 'overallMove',
      direction: move(overallDelta),
      delta: Math.abs(overallDelta),
      days,
    })
  }

  // The axis that moved most, in either direction. `last.metrics` is non-null
  // because `comparable` only returns scans that carry per-axis scores.
  const before = last.metrics as Record<MetricKey, number>
  let biggest: MetricKey | null = null
  let biggestDelta = 0
  for (const axis of AXES) {
    const delta = metrics[axis] - before[axis]
    if (Math.abs(delta) > Math.abs(biggestDelta)) {
      biggest = axis
      biggestDelta = delta
    }
  }

  // Is the weather a better explanation than the routine?
  //
  // Hydration tracks ambient humidity closely enough that a score which fell
  // while the air dried out has not told us anything about the customer's
  // habits. Saying "your hydration dropped" there is not just unhelpful, it is
  // wrong — so when the two move together this finding replaces the plain one.
  const humidityDelta =
    weather && last.weather ? weather.h - last.weather.h : null
  const hydrationDelta = metrics.hydration - before.hydration
  const weatherExplains =
    humidityDelta !== null &&
    Math.abs(humidityDelta) >= HUMIDITY_SWING &&
    Math.abs(hydrationDelta) >= MOVE_THRESHOLD &&
    Math.sign(humidityDelta) === Math.sign(hydrationDelta)

  if (weatherExplains) {
    insights.push({
      kind: 'weatherDriven',
      axis: 'hydration',
      direction: move(hydrationDelta),
      delta: Math.abs(hydrationDelta),
      humidityDelta: Math.round(humidityDelta),
    })
  }

  if (biggest && Math.abs(biggestDelta) >= MOVE_THRESHOLD) {
    // Do not report the same hydration change twice under two explanations.
    if (!(weatherExplains && biggest === 'hydration')) {
      insights.push({
        kind: 'axisMove',
        axis: biggest,
        direction: move(biggestDelta),
        delta: Math.abs(biggestDelta),
      })
    }
  }

  if (skinAge !== null) {
    const previousAge = last.skinAge
    const delta = previousAge === null ? 0 : skinAge - previousAge
    insights.push({
      kind: 'skinAge',
      age: skinAge,
      // A falling skin age is the good direction, so `up` here means the score
      // improved — not that the number went up. The copy says which.
      direction: previousAge === null || delta === 0 ? null : move(-delta),
      delta: Math.abs(delta),
    })
  }

  if (oiliness !== null && last.oiliness !== null) {
    const delta = oiliness - last.oiliness
    if (Math.abs(delta) >= MOVE_THRESHOLD) {
      insights.push({ kind: 'oilinessMove', direction: move(delta), delta: Math.abs(delta) })
    }
  }

  return { insights, focus: weakest, sampleSize: previous.length + 1 }
}

// ── trend series, for charting ──────────────────────────────────────────────

export interface TrendPoint {
  at: string
  overall: number
  metrics: Record<MetricKey, number> | null
  humidity: number | null
}

/**
 * The history as a chronological series, oldest first, for a chart.
 *
 * Humidity rides along on each point so the chart can show why a line moved
 * rather than leaving the customer to guess.
 */
export function trendSeries(history: ScanRecord[]): TrendPoint[] {
  return [...history]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((scan) => ({
      at: scan.createdAt,
      overall: scan.overall,
      metrics: scan.metrics,
      humidity: scan.weather?.h ?? null,
    }))
}
