import type { City } from './types'

/**
 * SAMPLE DATA — static demo weather.
 * Replace with a live weather API response keyed by city when you wire up real data.
 */
export const cities: Record<string, City> = {
  Tokyo: { t: 31, h: 78, uv: 8 },
  Shanghai: { t: 29, h: 82, uv: 7 },
  Bangkok: { t: 34, h: 75, uv: 11 },
  Singapore: { t: 32, h: 88, uv: 10 },
  'New York': { t: 24, h: 52, uv: 6 },
  Paris: { t: 21, h: 48, uv: 5 },
  Dubai: { t: 39, h: 30, uv: 11 },
}

export const cityNames = Object.keys(cities)

export const defaultCity = 'Tokyo'

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
