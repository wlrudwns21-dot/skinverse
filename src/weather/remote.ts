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
    const res = await fetch(url)
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
    cache.set(key, { at: Date.now(), value })
    return value
  } catch {
    return null
  }
}
