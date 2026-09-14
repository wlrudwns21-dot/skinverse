import type { MetricKey, Weather } from '../data/types'
import {
  absoluteHumidity,
  coldStress,
  dewPoint,
  drynessBand,
  drynessLoad,
  sebumBand,
  sebumLoad,
  vapourPressureDeficit,
  type DrynessBand,
  type SebumBand,
} from './climate'

/**
 * The weather-to-routine rules, in one place.
 *
 * Everything that decides what a customer is told lives here, with its
 * reasoning, so the criteria can be reviewed and adjusted without hunting
 * through render code.
 *
 * The plan is a pure function of (weather, scan result). No dates, no
 * randomness: the same inputs always produce the same routine, which is what
 * makes it reviewable — and what lets the app show its working.
 *
 * Humidity is read through src/routine/climate.ts rather than directly. The
 * percentage on a weather widget is not what dries skin out; the deficit
 * against the skin's own surface is, and 20% at 41°C is a different day from
 * 20% at -2°C in a way the percentage cannot express.
 */

// ── bands ───────────────────────────────────────────────────────────────────

export type UvBand = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme'
export type TempBand = 'cold' | 'cool' | 'mild' | 'warm' | 'hot'

export type { DrynessBand, SebumBand }

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
 * Kept as a plain band because temperature is shown to the customer as a
 * temperature. Its effect on sebum is handled in climate.ts, which curves it
 * properly and plateaus where thermoregulation caps output.
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

export const uvBand = (uv: number) => classify(uv, UV_THRESHOLDS)
export const tempBand = (t: number) => classify(t, TEMP_THRESHOLDS)

// ── step variants ───────────────────────────────────────────────────────────

export type AmCleanse = 'gentle' | 'gel'
export type AmToner = 'layered' | 'standard' | 'mist'
export type AmMoisturiser = 'richOil' | 'rich' | 'standard' | 'gel'
export type AmSpf = 'spf50' | 'reapply3h' | 'reapply2h'
export type PmCleanse = 'single' | 'double'
export type PmNight = 'maskHumidifier' | 'creamOil' | 'barrier'

/**
 * What the plan was decided from, in the units it was decided in.
 *
 * Carried on the plan so the screen can show its working. "Rich cream" is an
 * instruction; "rich cream, because the air is pulling 41 hPa against your skin
 * and your hydration measured 52" is a reason — and a customer can weigh a
 * reason, or disagree with it.
 */
export interface PlanBasis {
  /** Evaporative pull between skin and air, hPa. Higher means drier. */
  vpd: number
  /** Water the air is actually carrying, g/m³. */
  absoluteHumidity: number
  /** Above ~24°C sweat stops evaporating and heavy textures sit on top. */
  dewPoint: number
  /** 0–100 composite of the two humidity axes. */
  drynessLoad: number
  /** 0–100 from temperature and dew point. Never from relative humidity. */
  sebumLoad: number
  /** 0–100. Below 15°C the barrier's surface pH shifts and stinging rises. */
  coldStress: number
  /** True when sweat cannot evaporate freely — the occlusion rule. */
  occlusive: boolean
  /** The measured hydration the plan read, and the threshold it was tested against. */
  hydration: number
  dehydratedBelow: number
}

export interface RoutinePlan {
  dryness: DrynessBand
  sebum: SebumBand
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
  basis: PlanBasis
}

/** Air that is pulling water out faster than skin replaces it. */
const isDryAir = (d: DrynessBand) => d === 'drying' || d === 'harsh' || d === 'severe'

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
  const dryness = drynessBand(weather)
  const sebum = sebumBand(weather)
  const uv = uvBand(weather.uv)
  const temp = tempBand(weather.t)

  const td = dewPoint(weather.t, weather.h)
  /** Sweat will not evaporate freely, so anything heavy sits on the surface. */
  const occlusive = td >= 24
  const cold = temp === 'cold' || temp === 'cool'
  const warm = temp === 'warm' || temp === 'hot'
  const dryAir = isDryAir(dryness)
  const dehydrated = metrics.hydration < DEHYDRATED_BELOW

  return {
    dryness,
    sebum,
    uv,
    temp,
    weakest,

    am: {
      // Cold, dry mornings are the wrong time for a foaming cleanse; warm humid
      // ones need the overnight sebum off before anything else will sit right.
      cleanse: cold && dryAir ? 'gentle' : 'gel',

      // Layering thin hydration beats one thick application when the air is
      // pulling water out; when it is already saturated, a mist is enough.
      toner: dryAir ? 'layered' : dryness === 'humid' ? 'mist' : 'standard',

      // Whether a texture will absorb at all comes first, and the scan picks the
      // strength second. Dehydrated skin still wants a gel when sweat cannot
      // evaporate: a ceramide cream at a dew point of 26°C sits on the surface
      // instead of absorbing, which is the opposite of helpful.
      moisturiser:
        occlusive || dryness === 'humid'
          ? 'gel'
          : dryness === 'severe' || (cold && dehydrated)
            ? 'richOil'
            : dryAir || dehydrated
              ? 'rich'
              : 'standard',

      // Straight off the WHO index: daily protection regardless, with
      // reapplication tightening as the index climbs.
      spf:
        uv === 'extreme' ? 'reapply2h' : uv === 'veryHigh' || uv === 'high' ? 'reapply3h' : 'spf50',
    },

    pm: {
      // Sunscreen and a day's sebum need two steps to come off; a cold, dry,
      // low-UV day does not.
      cleanse: warm || occlusive || uv !== 'low' ? 'double' : 'single',

      // Same ordering as the morning: air that stops sweat evaporating rules
      // out the oil top-up no matter what the scan said.
      night:
        occlusive || dryness === 'humid'
          ? 'barrier'
          : dryness === 'severe' || (cold && dehydrated)
            ? 'maskHumidifier'
            : dryAir || dehydrated
              ? 'creamOil'
              : 'barrier',
    },

    basis: {
      vpd: Math.round(vapourPressureDeficit(weather) * 10) / 10,
      absoluteHumidity: Math.round(absoluteHumidity(weather.t, weather.h) * 10) / 10,
      dewPoint: Math.round(td * 10) / 10,
      drynessLoad: Math.round(drynessLoad(weather)),
      sebumLoad: Math.round(sebumLoad(weather)),
      coldStress: Math.round(coldStress(weather)),
      occlusive,
      hydration: metrics.hydration,
      dehydratedBelow: DEHYDRATED_BELOW,
    },
  }
}
