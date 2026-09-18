/**
 * What the air is carrying, and what that means for skin.
 *
 * Particulate matter is not a comfort issue here the way heat is. PM2.5 is
 * small enough to settle into the follicular opening and to carry polycyclic
 * aromatic hydrocarbons and transition metals with it; the documented skin
 * effects are oxidative stress, barrier disruption and aggravated inflammation.
 * For customers in Seoul, Beijing or Bangkok it is a bigger day-to-day variable
 * than UV for most of the year.
 *
 * What this file does NOT do is claim a medical effect for any individual. It
 * turns two numbers into a band, and the routine uses that band the same way it
 * uses "the air is dry today".
 */

/** Micrograms per cubic metre, as every monitoring network reports them. */
export interface AirQuality {
  pm10: number
  pm25: number
}

/**
 * Bands follow Korea's 통합대기환경지수 (미세먼지 4단계), not the US AQI.
 *
 * The audience checks a Korean forecast before leaving the house, so the app
 * saying "나쁨" on a day the forecast says 보통 would read as a bug however
 * defensible the other scale is. The thresholds below are the Ministry of
 * Environment's, in µg/m³:
 *
 *            좋음    보통     나쁨     매우나쁨
 *   PM10     0–30   31–80   81–150    151+
 *   PM2.5    0–15   16–35   36–75      76+
 */
export type AirBand = 'good' | 'moderate' | 'bad' | 'veryBad'

const PM10_THRESHOLDS: { band: AirBand; upTo: number }[] = [
  { band: 'good', upTo: 30 },
  { band: 'moderate', upTo: 80 },
  { band: 'bad', upTo: 150 },
]

const PM25_THRESHOLDS: { band: AirBand; upTo: number }[] = [
  { band: 'good', upTo: 15 },
  { band: 'moderate', upTo: 35 },
  { band: 'bad', upTo: 75 },
]

function classify(value: number, table: { band: AirBand; upTo: number }[]): AirBand {
  for (const row of table) if (value <= row.upTo) return row.band
  return 'veryBad'
}

const RANK: Record<AirBand, number> = { good: 0, moderate: 1, bad: 2, veryBad: 3 }

/**
 * The worse of the two readings.
 *
 * Not an average. A day with clean PM10 and PM2.5 at 90 is a bad day, and
 * averaging the two would report it as moderate — which is exactly the day the
 * advice matters most.
 */
export function airBand(air: AirQuality): AirBand {
  const coarse = classify(air.pm10, PM10_THRESHOLDS)
  const fine = classify(air.pm25, PM25_THRESHOLDS)
  return RANK[coarse] >= RANK[fine] ? coarse : fine
}

/**
 * 0–100, for the same use the dryness and sebum loads are put to: a continuous
 * figure the recommender can weight rather than a four-way switch.
 *
 * Scaled so that the top of 나쁨 sits near 75 and 매우나쁨 climbs from there;
 * it saturates rather than running away on a severe dust day, because the
 * advice does not get more different above a certain point.
 */
export function pollutionLoad(air: AirQuality): number {
  const coarse = (air.pm10 / 150) * 100
  const fine = (air.pm25 / 75) * 100
  return Math.min(100, Math.round(Math.max(coarse, fine)))
}

/** Is today a day the routine should say something about? */
export const isPolluted = (band: AirBand): boolean => band === 'bad' || band === 'veryBad'
