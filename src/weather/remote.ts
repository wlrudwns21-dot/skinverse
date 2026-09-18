import type { AirQuality } from '../routine/air'
import type { Weather } from '../data/types'

/**
 * Live weather from Open-Meteo.
 *
 * Chosen because it needs no API key and no backend: the browser calls it
 * directly, so there is no secret to leak and nothing to deploy. It returns the
 * three readings the routine logic actually branches on — temperature, relative
 * humidity and UV index.
 *
 * ⚠️ Licensing: Open-Meteo is free for non-commercial use (under ~10k calls a
 * day). Once Skinverse is selling for real, that needs either their paid plan or
 * a swap to a commercial provider — this file is the only place to change.
 */
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

/**
 * Air quality is a separate Open-Meteo service — same terms, same lack of a
 * key, different host. It has to be a second request; there is no way to ask
 * for particulates from the forecast endpoint.
 */
const AIR_ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality'

/** Readings older than this are re-fetched; weather does not move minute to minute. */
const CACHE_MS = 10 * 60 * 1000

const cache = new Map<string, { at: number; value: Weather }>()

const keyFor = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`

/**
 * Returns null rather than throwing — every caller already has a sensible
 * fallback, and a weather outage must not take the routine screen down.
 *
 * @param force skip the cache. Set when the visitor pressed refresh: they are
 *              asking for the current reading, and handing back one from nine
 *              minutes ago makes the button look broken even though it worked.
 */
export async function fetchWeather(
  lat: number,
  lon: number,
  force = false,
): Promise<Weather | null> {
  const key = keyFor(lat, lon)
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.value

  const url =
    `${ENDPOINT}?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,uv_index&timezone=auto'

  try {
    // Fired together rather than in sequence: the routine screen waits on this,
    // and two round trips end to end would be felt.
    const [res, air] = await Promise.all([fetch(url), fetchAir(lat, lon)])
    if (!res.ok) return null

    const body = (await res.json()) as {
      current?: { temperature_2m?: number; relative_humidity_2m?: number; uv_index?: number }
    }
    const current = body.current
    if (!current) return null

    const t = current.temperature_2m
    const h = current.relative_humidity_2m
    const uv = current.uv_index

    // Partial payloads happen; anything missing means we keep the fallback.
    if (typeof t !== 'number' || typeof h !== 'number' || typeof uv !== 'number') return null

    const value: Weather = { t: Math.round(t), h: Math.round(h), uv: Math.round(uv) }
    // Air quality is additive, never required: a reading without it is still a
    // complete weather reading, and the routine simply says nothing about dust.
    if (air) value.air = air

    cache.set(key, { at: Date.now(), value })
    return value
  } catch {
    return null
  }
}

/**
 * Particulates, or null.
 *
 * Its own try/catch on purpose. Air quality is the optional half of the
 * reading, so this service being down must not cost the customer their
 * temperature and UV as well.
 */
async function fetchAir(lat: number, lon: number): Promise<AirQuality | null> {
  const url = `${AIR_ENDPOINT}?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5&timezone=auto`

  try {
    const res = await fetch(url)
    if (!res.ok) return null

    const body = (await res.json()) as { current?: { pm10?: number; pm2_5?: number } }
    const pm10 = body.current?.pm10
    const pm25 = body.current?.pm2_5
    if (typeof pm10 !== 'number' || typeof pm25 !== 'number') return null

    return { pm10: Math.round(pm10), pm25: Math.round(pm25) }
  } catch {
    return null
  }
}
