/**
 * The weather, turned into what it actually does to skin.
 *
 * Relative humidity is the wrong variable to reason from, and using it directly
 * produces advice that is confidently wrong. 20% RH at 35°C in Dubai and 20% RH
 * at 0°C in Seoul are the same number and nothing like the same condition: warm
 * air holds far more water, so the same percentage leaves a far larger deficit
 * against skin. A routine built on RH alone tells the desert and the Korean
 * winter to do the same thing.
 *
 * What drives water out of skin is the vapour pressure deficit — the gap
 * between the saturated layer at the skin surface (about 32°C) and the air
 * around it. That is a physical quantity, it behaves correctly at both ends of
 * the temperature range, and it is what this module computes.
 *
 * Formulae are the standard meteorological ones (Bolton 1980, Magnus-Tetens);
 * the thresholds are documented where they are used.
 */

import { airBand, pollutionLoad, type AirBand } from './air'
import type { Weather } from '../data/types'

/** Facial skin surface temperature, and the layer just above it taken as saturated. */
const SKIN_TEMP_C = 32

/** Saturation vapour pressure in hPa. Bolton 1980. */
export function saturationVapourPressure(tempC: number): number {
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5))
}

/** Actual vapour pressure in hPa. */
export function vapourPressure(tempC: number, rhPct: number): number {
  return (saturationVapourPressure(tempC) * clamp(rhPct, 0, 100)) / 100
}

/** Absolute humidity in g/m³ — how much water the air is actually carrying. */
export function absoluteHumidity(tempC: number, rhPct: number): number {
  return (vapourPressure(tempC, rhPct) * 216.7) / (273.15 + tempC)
}

/**
 * Dew point in °C. Magnus-Tetens.
 *
 * This is the honest measure of whether sweat will evaporate. Above roughly
 * 24°C it stops doing so freely, which is when skin feels occluded and sweat
 * sits on the surface — the meteorological "sticky" threshold.
 */
export function dewPoint(tempC: number, rhPct: number): number {
  const rh = clamp(rhPct, 0.1, 100)
  const gamma = Math.log(rh / 100) + (17.67 * tempC) / (243.5 + tempC)
  return (243.5 * gamma) / (17.67 - gamma)
}

/**
 * Vapour pressure deficit between skin and air, in hPa.
 *
 * Zero would mean the air is already as wet as the skin surface and nothing
 * evaporates; the maximum in habitable conditions is about 47, which is bone-dry
 * air at any temperature.
 */
export function vapourPressureDeficit(weather: Weather): number {
  return Math.max(0, saturationVapourPressure(SKIN_TEMP_C) - vapourPressure(weather.t, weather.h))
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// ── the bands the rest of the app reasons in ────────────────────────────────

/** Piecewise-linear interpolation between anchor points, x ascending. */
function interpolate(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1]
  const last = points[points.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return last[1]
}

/**
 * How much water the air is carrying, scored 0–100 for dryness.
 *
 * Anchored on the absolute-humidity quartiles from the eczema epidemiology
 * (roughly 2.6 / 5.4 / 8.9 g/m³), so the scale is tied to where skin problems
 * are actually observed rather than to a number that felt about right.
 */
const AH_POINTS: [number, number][] = [
  [1.0, 100],
  [2.62, 70],
  [5.41, 35],
  [8.89, 0],
]

/**
 * How hard the air pulls, scored 0–100.
 *
 * The deficit against saturated skin is the evaporative driving force, and it
 * is what catches hot dry air that absolute humidity alone would call damp.
 */
const VPD_POINTS: [number, number][] = [
  [15, 0],
  [25, 35],
  [35, 70],
  [45, 100],
]

/**
 * The dryness load, 0–100.
 *
 * Two axes, because each one alone is wrong somewhere. Absolute humidity is the
 * epidemiological anchor but reads a 41°C desert afternoon as unremarkable — the
 * air there genuinely carries more water (about 10.8 g/m³) than a comfortable
 * 22°C room (9.7). The deficit catches that, because heat widens the gap against
 * skin whatever the air holds.
 *
 * One result is worth stating plainly, because it is counterintuitive and it
 * matters for a Korean brand: a Seoul winter day is by far the most desiccating
 * condition here — around 1.7 g/m³ against the desert's 10.8. Cold air holds
 * almost nothing. What makes a desert feel dry is heat, wind and sun, and only
 * the first of those is modelled: this reads outdoor conditions, and knows
 * nothing about wind speed or the air conditioning indoors.
 */
export function drynessLoad(weather: Weather): number {
  const ah = interpolate(absoluteHumidity(weather.t, weather.h), AH_POINTS)
  const vpd = interpolate(vapourPressureDeficit(weather), VPD_POINTS)
  return clamp(0.6 * ah + 0.4 * vpd, 0, 100)
}

/**
 * Dryness bands, cut on the load above rather than on relative humidity.
 *
 * The point of the whole module: 20% RH means one thing at 41°C and something
 * else entirely at -2°C, and banding the percentage directly gives both the
 * same routine.
 */
export type DrynessBand = 'humid' | 'mild' | 'drying' | 'harsh' | 'severe'

export const DRYNESS_THRESHOLDS: { band: DrynessBand; below: number }[] = [
  { band: 'humid', below: 15 },
  { band: 'mild', below: 35 },
  { band: 'drying', below: 55 },
  { band: 'harsh', below: 75 },
  { band: 'severe', below: Infinity },
]

/**
 * How much sebum and sweat the day will produce.
 *
 * Deliberately built from temperature and dew point, never from relative
 * humidity. With temperature held constant, humidity does not change sebum
 * output — so a model that raises "oily" because the air is damp counts
 * humidity twice and gets the mechanism wrong. What humidity changes is whether
 * sweat can evaporate, which is dew point, and that is occlusion, not sebum.
 */
export type SebumBand = 'low' | 'mild' | 'moderate' | 'high' | 'veryHigh'

/** Sebum output rises with skin temperature, then plateaus — thermoregulation caps it. */
const OIL_POINTS: [number, number][] = [
  [10, 0],
  [25, 35],
  [30, 55],
  [35, 68],
  [40, 70],
]

/** Above a dew point of ~24°C sweat stops evaporating freely and sits on the skin. */
const SWEAT_POINTS: [number, number][] = [
  [14, 0],
  [18, 8],
  [21, 18],
  [24, 26],
  [27, 30],
]

/** 0–100: how much sebum and sweat load the day imposes. */
export function sebumLoad(weather: Weather): number {
  return clamp(
    interpolate(weather.t, OIL_POINTS) + interpolate(dewPoint(weather.t, weather.h), SWEAT_POINTS),
    0,
    100,
  )
}

export const SEBUM_THRESHOLDS: { band: SebumBand; below: number }[] = [
  { band: 'low', below: 25 },
  { band: 'mild', below: 45 },
  { band: 'moderate', below: 62 },
  { band: 'high', below: 80 },
  { band: 'veryHigh', below: Infinity },
]

/**
 * Cold barrier stress.
 *
 * Below about 15°C the stratum corneum's surface pH shifts alkaline and
 * stinging sensitivity rises, and it strengthens the colder it gets. Separate
 * from dryness on purpose: a cold humid day still stresses the barrier.
 */
export function coldStress(weather: Weather): number {
  return clamp((100 * (15 - weather.t)) / 25, 0, 100)
}

function classify<T extends string>(value: number, table: { band: T; below: number }[]): T {
  for (const row of table) if (value < row.below) return row.band
  return table[table.length - 1].band
}

export const drynessBand = (weather: Weather): DrynessBand =>
  classify(drynessLoad(weather), DRYNESS_THRESHOLDS)

export const sebumBand = (weather: Weather): SebumBand =>
  classify(sebumLoad(weather), SEBUM_THRESHOLDS)

/** Everything the routine and the recommender need, computed once. */
export interface ClimateRead {
  dryness: DrynessBand
  sebum: SebumBand
  vpd: number
  dewPoint: number
  absoluteHumidity: number
  coldStress: number
  /** Sweat will not evaporate freely — heavy textures will sit on the surface. */
  occlusive: boolean
  /**
   * What the air is carrying, when the air-quality service answered.
   *
   * Null rather than a clean-air default: "we do not know" and "the air is
   * clean" lead to different advice, and only one of them is honest when the
   * service is down.
   */
  air: AirBand | null
  /** 0–100, for weighting. Zero when there is no reading.  */
  pollution: number
}

export function readClimate(weather: Weather): ClimateRead {
  const td = dewPoint(weather.t, weather.h)
  return {
    dryness: drynessBand(weather),
    sebum: sebumBand(weather),
    vpd: vapourPressureDeficit(weather),
    dewPoint: td,
    absoluteHumidity: absoluteHumidity(weather.t, weather.h),
    coldStress: coldStress(weather),
    occlusive: td >= 24,
    air: weather.air ? airBand(weather.air) : null,
    pollution: weather.air ? pollutionLoad(weather.air) : 0,
  }
}
