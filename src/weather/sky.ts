/**
 * What the sky is doing, from the WMO code Open-Meteo reports.
 *
 * The forecast gives a code with far more resolution than a backdrop can use
 * — it distinguishes light drizzle from dense freezing drizzle — so this
 * collapses the full table into the four skies a picture can actually show.
 * Fog goes in with cloud and a thunderstorm goes in with rain, because a
 * banner behind a weather reading is scene-setting, not a forecast: the
 * numbers next to it are what the customer reads.
 *
 * Reference: WMO 4677, as published in Open-Meteo's `weather_code` field.
 */
export type Sky = 'clear' | 'cloud' | 'rain' | 'snow'

export function skyFor(code: number | undefined): Sky {
  // No code at all — the sample reading, or a stored one taken before this
  // field existed. Nothing was claimed, so the pleasant default is honest.
  if (typeof code !== 'number' || !Number.isFinite(code)) return 'clear'

  if (code === 0 || code === 1) return 'clear'
  // 2 partly cloudy, 3 overcast, 45/48 fog — all of them read as grey sky.
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloud'
  // 51-57 drizzle, 61-67 rain, 80-82 showers, 95-99 thunderstorm.
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) {
    return 'rain'
  }
  // 71-77 snowfall, 85-86 snow showers.
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'

  // A code the table does not list — the service reported something, and we
  // cannot place it. Grey sky, deliberately: of the four, "clear" is the only
  // one that would actively mislead, since it claims sunshine over a reading
  // that might be a storm.
  return 'cloud'
}

/**
 * The backdrop file for a sky, which may not exist yet.
 *
 * The banner falls back to a flat tint when the file is missing, so a sky
 * nobody has photographed still leaves the layout and the readings intact.
 */
export const skyImage = (sky: Sky) => `/banner/sky-${sky}.webp`
