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

/**
 * One axis across the whole history, for charting a single measurement.
 *
 * The per-axis scores are already fetched with every scan and were being
 * thrown away at the chart: overall is the only number that got drawn, which
 * answers "am I better?" but never "is the thing I am actually working on
 * better?". A customer following the routine's advice on hydration wants the
 * hydration line, not the average that hides it.
 *
 * Scans written before the history was widened carry no per-axis metrics, so
 * they are dropped from an axis series rather than plotted as zero.
 */
export function axisSeries(points: TrendPoint[], axis: MetricKey): TrendPoint[] {
  return points.filter((p) => p.metrics !== null && Number.isFinite(p.metrics[axis]))
}

/**
 * The whole record in one line: how far the skin has come since the first scan.
 *
 * The findings above compare the latest scan with the one before it, which is
 * the right question the day after a scan and the wrong one a season later —
 * six scans each moving two points look like six non-events and add up to
 * twelve. This is the other half: the distance travelled, over how many scans
 * and how many days.
 *
 * Null with fewer than two scans. There is no journey from a single point, and
 * inventing one would be the app claiming credit on day one.
 */
export interface Cumulative {
  scans: number
  /** Whole days between the first scan and the latest. */
  days: number
  first: number
  latest: number
  /** Signed, latest minus first. */
  delta: number
  /**
   * Null when the total movement is still inside the noise floor — the same
   * `MOVE_THRESHOLD` the per-scan findings use, so the summary cannot claim
   * progress the individual comparisons already refused to claim.
   */
  direction: Direction | null
}

export function cumulative(points: TrendPoint[]): Cumulative | null {
  if (points.length < 2) return null

  const first = points[0]
  const latest = points[points.length - 1]
  const delta = latest.overall - first.overall
  const days = Math.max(
    0,
    Math.round((Date.parse(latest.at) - Date.parse(first.at)) / 86_400_000),
  )

  return {
    scans: points.length,
    days,
    first: first.overall,
    latest: latest.overall,
    delta,
    direction: Math.abs(delta) >= MOVE_THRESHOLD ? move(delta) : null,
  }
}

/**
 * One axis's whole trajectory, for the per-item view on the report.
 *
 * `cumulative` answers "is my skin better?" for the overall score. This answers
 * it for the thing the customer is actually working on, which is usually a
 * single axis — and it is a different question. Hydration can climb eleven
 * points while the overall sits still, because the other five axes did not
 * move; a report that only shows the average tells that customer their effort
 * did nothing.
 *
 * `best` and `worst` are the range actually reached, so a customer can see
 * whether today is a peak, a dip, or unremarkable.
 */
export interface AxisChange {
  axis: MetricKey
  /** Readings that carried this axis. Two is the minimum for any of this to mean anything. */
  readings: number
  first: number
  latest: number
  /** Latest minus first. */
  delta: number
  /** Null inside the noise floor, matching every other finding in this file. */
  direction: Direction | null
  /** Latest minus the reading before it, and its direction. */
  step: number
  stepDirection: Direction | null
  best: number
  worst: number
  /** Every reading oldest first, for a sparkline. */
  series: number[]
}

export function axisChange(points: TrendPoint[], axis: MetricKey): AxisChange | null {
  const usable = axisSeries(points, axis)
  if (usable.length < 2) return null

  const series = usable.map((p) => p.metrics![axis])
  const first = series[0]
  const latest = series[series.length - 1]
  const previous = series[series.length - 2]
  const delta = latest - first
  const step = latest - previous

  return {
    axis,
    readings: series.length,
    first,
    latest,
    delta,
    direction: Math.abs(delta) >= MOVE_THRESHOLD ? move(delta) : null,
    step,
    stepDirection: Math.abs(step) >= MOVE_THRESHOLD ? move(step) : null,
    best: Math.max(...series),
    worst: Math.min(...series),
    series,
  }
}

/** Every axis that has enough history to say anything about, worst movement first. */
export function axisChanges(points: TrendPoint[]): AxisChange[] {
  return AXES.map((axis) => axisChange(points, axis))
    .filter((change): change is AxisChange => change !== null)
    .sort((a, b) => a.delta - b.delta)
}
