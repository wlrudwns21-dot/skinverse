import type { MetricKey, Weather } from '../data/types'

/**
 * The weather-to-routine rules, in one place.
 *
 * Previously these thresholds were three inline comparisons scattered through
 * the store — and temperature, though displayed, changed nothing. Everything
 * that decides what a customer is told now lives here, with its reasoning, so
 * the criteria can be reviewed and adjusted without hunting through render code.
 *
 * The plan is a pure function of (weather, scan result). No dates, no
 * randomness: the same inputs always produce the same routine, which is what
 * makes it reviewable.
 */

// ── bands ───────────────────────────────────────────────────────────────────

export type HumidityBand = 'veryDry' | 'dry' | 'comfortable' | 'humid' | 'veryHumid'
export type UvBand = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme'
export type TempBand = 'cold' | 'cool' | 'mild' | 'warm' | 'hot'

/**
 * Relative humidity, in %.
 *
 * The comfortable band (45–65%) is the range indoor-air guidance generally
 * targets; below it transepidermal water loss climbs and the barrier needs
 * occlusion, above it sebum sits on the skin and heavy creams stop absorbing.
 * The outer bands mark where the advice changes in kind, not just degree.
 */
export const HUMIDITY_THRESHOLDS: { band: HumidityBand; below: number }[] = [
  { band: 'veryDry', below: 30 },
  { band: 'dry', below: 45 },
  { band: 'comfortable', below: 65 },
  { band: 'humid', below: 80 },
  { band: 'veryHumid', below: Infinity },
]

/**
 * WHO / WMO Global Solar UV Index — the published international scale, used
 * verbatim so the thresholds are defensible rather than invented:
 * 0–2 low · 3–5 moderate · 6–7 high · 8–10 very high · 11+ extreme.
 */
export const UV_THRESHOLDS: { band: UvBand; below: number }[] = [
  { band: 'low', below: 3 },
  { band: 'moderate', below: 6 },
  { band: 'high', below: 8 },
  { band: 'veryHigh', below: 11 },
  { band: 'extreme', below: Infinity },
]

/**
 * Air temperature, in °C.
 *
 * Sebum output rises roughly with skin temperature, so warm and hot days move
 * the routine toward lighter textures and a firmer evening cleanse. Cold days
 * do the opposite, and bring the indoor-heating dryness that humidity alone
 * does not capture.
 */
export const TEMP_THRESHOLDS: { band: TempBand; below: number }[] = [
  { band: 'cold', below: 10 },
  { band: 'cool', below: 18 },
  { band: 'mild', below: 25 },
  { band: 'warm', below: 30 },
  { band: 'hot', below: Infinity },
]

function classify<T extends string>(value: number, table: { band: T; below: number }[]): T {
  for (const row of table) if (value < row.below) return row.band
  return table[table.length - 1].band
}

export const humidityBand = (h: number) => classify(h, HUMIDITY_THRESHOLDS)
export const uvBand = (uv: number) => classify(uv, UV_THRESHOLDS)
export const tempBand = (t: number) => classify(t, TEMP_THRESHOLDS)

// ── step variants ───────────────────────────────────────────────────────────

export type AmCleanse = 'gentle' | 'gel'
export type AmToner = 'layered' | 'standard' | 'mist'
export type AmMoisturiser = 'richOil' | 'rich' | 'standard' | 'gel'
export type AmSpf = 'spf50' | 'reapply3h' | 'reapply2h'
export type PmCleanse = 'single' | 'double'
export type PmNight = 'maskHumidifier' | 'creamOil' | 'barrier'

export interface RoutinePlan {
  humidity: HumidityBand
  uv: UvBand
  temp: TempBand
  /** The scan axis that scored lowest — what the treatment step targets. */
  weakest: MetricKey
  am: {
    cleanse: AmCleanse
    toner: AmToner
    moisturiser: AmMoisturiser
    spf: AmSpf
  }
  pm: {
    cleanse: PmCleanse
    night: PmNight
  }
}

/** Does the air, as opposed to the skin, need the routine to hold water in? */
const isDryAir = (h: HumidityBand) => h === 'veryDry' || h === 'dry'
const isHumidAir = (h: HumidityBand) => h === 'humid' || h === 'veryHumid'

/**
 * Below this hydration score the routine goes richer whatever the weather.
 *
 * 60 sits between the "fair" and "good" bands the results screen already draws,
 * so the routine changing at the same point the bar changes colour is one
 * threshold the customer can see rather than two they cannot.
 */
export const DEHYDRATED_BELOW = 60

/**
 * @param metrics the scan's per-axis scores — the live ones when a real scan
 *                produced them, so the routine reflects the face in front of
 *                the camera rather than a canned profile.
 */
export function buildPlan(
  weather: Weather,
  metrics: Record<MetricKey, number>,
  weakest: MetricKey,
): RoutinePlan {
  const humidity = humidityBand(weather.h)
  const uv = uvBand(weather.uv)
  const temp = tempBand(weather.t)

  const cold = temp === 'cold' || temp === 'cool'
  const warm = temp === 'warm' || temp === 'hot'
  const dehydrated = metrics.hydration < DEHYDRATED_BELOW

  return {
    humidity,
    uv,
    temp,
    weakest,

    am: {
      // Cold, dry mornings are the wrong time for a foaming cleanse; warm humid
      // ones need the overnight sebum off before anything else will sit right.
      cleanse: cold && isDryAir(humidity) ? 'gentle' : 'gel',

      // Layering thin hydration beats one thick application when the air is
      // pulling water out; when it is already saturated, a mist is enough.
      toner: isDryAir(humidity) ? 'layered' : isHumidAir(humidity) ? 'mist' : 'standard',

      // Humidity picks the texture, the scan picks the strength — and in that
      // order. Dehydrated skin still wants a gel when the air is already
      // saturated: a ceramide cream at 78% humidity sits on the surface instead
      // of absorbing, which is the opposite of helpful.
      moisturiser: isHumidAir(humidity)
        ? 'gel'
        : humidity === 'veryDry' || (cold && dehydrated)
          ? 'richOil'
          : humidity === 'dry' || dehydrated
            ? 'rich'
            : 'standard',

      // Straight off the WHO index: daily protection regardless, with
      // reapplication tightening as the index climbs.
      spf: uv === 'extreme' ? 'reapply2h' : uv === 'veryHigh' || uv === 'high' ? 'reapply3h' : 'spf50',
    },

    pm: {
      // Sunscreen and a day's sebum need two steps to come off; a cold, dry,
      // low-UV day does not.
      cleanse: warm || isHumidAir(humidity) || uv !== 'low' ? 'double' : 'single',

      // Same ordering as the morning: humid air rules out the oil top-up no
      // matter what the scan said.
      night: isHumidAir(humidity)
        ? 'barrier'
        : humidity === 'veryDry' || (cold && dehydrated)
          ? 'maskHumidifier'
          : isDryAir(humidity) || dehydrated
            ? 'creamOil'
            : 'barrier',
    },
  }
}
