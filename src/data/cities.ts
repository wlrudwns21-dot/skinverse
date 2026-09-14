import type { City } from './types'

/**
 * Shipping destinations the routine screen offers, with coordinates for the
 * live weather lookup.
 *
 * The `t` / `h` / `uv` numbers are no longer the source of truth — they are the
 * fallback shown before the first fetch returns, and if the weather service is
 * unreachable. Live values come from Open-Meteo (see `src/weather/remote.ts`).
 */
export const cities: Record<string, City> = {
  Tokyo: { t: 31, h: 78, uv: 8, lat: 35.6762, lon: 139.6503 },
  Shanghai: { t: 29, h: 82, uv: 7, lat: 31.2304, lon: 121.4737 },
  Bangkok: { t: 34, h: 75, uv: 11, lat: 13.7563, lon: 100.5018 },
  Singapore: { t: 32, h: 88, uv: 10, lat: 1.3521, lon: 103.8198 },
  'New York': { t: 24, h: 52, uv: 6, lat: 40.7128, lon: -74.006 },
  Paris: { t: 21, h: 48, uv: 5, lat: 48.8566, lon: 2.3522 },
  Dubai: { t: 39, h: 30, uv: 11, lat: 25.2048, lon: 55.2708 },
}

export const cityNames = Object.keys(cities)

export const defaultCity = 'Tokyo'

/** Sentinel for "wherever the visitor actually is", resolved by geolocation. */
export const CURRENT_LOCATION = '__current__'

/** Countries offered on the checkout shipping form. */
export const shippingCountries = [
  'Japan',
  'China',
  'Thailand',
  'Singapore',
  'United States',
  'France',
  'United Arab Emirates',
]
