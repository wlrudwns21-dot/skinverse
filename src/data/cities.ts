import type { City } from './types'

/**
 * Where the routine can be built for, with the coordinates the live lookup needs.
 *
 * These carry coordinates and nothing else. They used to hold a stored
 * temperature, humidity and UV index as a fallback, which meant a customer
 * could be shown a confident routine built from numbers invented months ago —
 * a stale reading is worse than no reading, because nothing on screen says it
 * is stale. Weather is fetched live from Open-Meteo for whichever place is
 * selected, and when the fetch fails the app says so instead of filling in.
 *
 * The list is long on purpose. The store ships worldwide and the whole premise
 * is that the routine follows the weather, so "your city is not here" is a
 * failure of the product, not a limitation the customer should work around.
 */
export const cities: Record<string, City> = {
  // ── Korea ────────────────────────────────────────────────────────────────
  Seoul: { lat: 37.5665, lon: 126.978 },
  Busan: { lat: 35.1796, lon: 129.0756 },
  Incheon: { lat: 37.4563, lon: 126.7052 },
  Daegu: { lat: 35.8714, lon: 128.6014 },
  Daejeon: { lat: 36.3504, lon: 127.3845 },
  Gwangju: { lat: 35.1595, lon: 126.8526 },
  Ulsan: { lat: 35.5384, lon: 129.3114 },
  Suwon: { lat: 37.2636, lon: 127.0286 },
  Jeju: { lat: 33.4996, lon: 126.5312 },

  // ── Japan ────────────────────────────────────────────────────────────────
  Tokyo: { lat: 35.6762, lon: 139.6503 },
  Osaka: { lat: 34.6937, lon: 135.5023 },
  Kyoto: { lat: 35.0116, lon: 135.7681 },
  Nagoya: { lat: 35.1815, lon: 136.9066 },
  Fukuoka: { lat: 33.5904, lon: 130.4017 },
  Sapporo: { lat: 43.0618, lon: 141.3545 },
  Okinawa: { lat: 26.2124, lon: 127.6809 },

  // ── Greater China ────────────────────────────────────────────────────────
  Shanghai: { lat: 31.2304, lon: 121.4737 },
  Beijing: { lat: 39.9042, lon: 116.4074 },
  Guangzhou: { lat: 23.1291, lon: 113.2644 },
  Shenzhen: { lat: 22.5431, lon: 114.0579 },
  Chengdu: { lat: 30.5728, lon: 104.0668 },
  'Hong Kong': { lat: 22.3193, lon: 114.1694 },
  Taipei: { lat: 25.033, lon: 121.5654 },
  Macau: { lat: 22.1987, lon: 113.5439 },

  // ── Southeast Asia ───────────────────────────────────────────────────────
  Bangkok: { lat: 13.7563, lon: 100.5018 },
  'Chiang Mai': { lat: 18.7883, lon: 98.9853 },
  Phuket: { lat: 7.8804, lon: 98.3923 },
  Singapore: { lat: 1.3521, lon: 103.8198 },
  'Kuala Lumpur': { lat: 3.139, lon: 101.6869 },
  Jakarta: { lat: -6.2088, lon: 106.8456 },
  Bali: { lat: -8.4095, lon: 115.1889 },
  Manila: { lat: 14.5995, lon: 120.9842 },
  Hanoi: { lat: 21.0278, lon: 105.8342 },
  'Ho Chi Minh City': { lat: 10.8231, lon: 106.6297 },
  'Phnom Penh': { lat: 11.5564, lon: 104.9282 },
  Yangon: { lat: 16.8661, lon: 96.1951 },

  // ── South Asia ───────────────────────────────────────────────────────────
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Delhi: { lat: 28.7041, lon: 77.1025 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Colombo: { lat: 6.9271, lon: 79.8612 },
  Dhaka: { lat: 23.8103, lon: 90.4125 },

  // ── Middle East ──────────────────────────────────────────────────────────
  Dubai: { lat: 25.2048, lon: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lon: 54.3773 },
  Riyadh: { lat: 24.7136, lon: 46.6753 },
  Doha: { lat: 25.2854, lon: 51.531 },
  Istanbul: { lat: 41.0082, lon: 28.9784 },
  'Tel Aviv': { lat: 32.0853, lon: 34.7818 },

  // ── Oceania ──────────────────────────────────────────────────────────────
  Sydney: { lat: -33.8688, lon: 151.2093 },
  Melbourne: { lat: -37.8136, lon: 144.9631 },
  Brisbane: { lat: -27.4698, lon: 153.0251 },
  Perth: { lat: -31.9505, lon: 115.8605 },
  Auckland: { lat: -36.8485, lon: 174.7633 },

  // ── Europe ───────────────────────────────────────────────────────────────
  London: { lat: 51.5074, lon: -0.1278 },
  Paris: { lat: 48.8566, lon: 2.3522 },
  Berlin: { lat: 52.52, lon: 13.405 },
  Munich: { lat: 48.1351, lon: 11.582 },
  Amsterdam: { lat: 52.3676, lon: 4.9041 },
  Madrid: { lat: 40.4168, lon: -3.7038 },
  Barcelona: { lat: 41.3851, lon: 2.1734 },
  Milan: { lat: 45.4642, lon: 9.19 },
  Rome: { lat: 41.9028, lon: 12.4964 },
  Zurich: { lat: 47.3769, lon: 8.5417 },
  Vienna: { lat: 48.2082, lon: 16.3738 },
  Stockholm: { lat: 59.3293, lon: 18.0686 },
  Copenhagen: { lat: 55.6761, lon: 12.5683 },
  Oslo: { lat: 59.9139, lon: 10.7522 },
  Helsinki: { lat: 60.1699, lon: 24.9384 },
  Warsaw: { lat: 52.2297, lon: 21.0122 },
  Prague: { lat: 50.0755, lon: 14.4378 },
  Lisbon: { lat: 38.7223, lon: -9.1393 },
  Dublin: { lat: 53.3498, lon: -6.2603 },
  Moscow: { lat: 55.7558, lon: 37.6173 },

  // ── North America ────────────────────────────────────────────────────────
  'New York': { lat: 40.7128, lon: -74.006 },
  'Los Angeles': { lat: 34.0522, lon: -118.2437 },
  'San Francisco': { lat: 37.7749, lon: -122.4194 },
  Seattle: { lat: 47.6062, lon: -122.3321 },
  Chicago: { lat: 41.8781, lon: -87.6298 },
  Boston: { lat: 42.3601, lon: -71.0589 },
  Miami: { lat: 25.7617, lon: -80.1918 },
  Houston: { lat: 29.7604, lon: -95.3698 },
  'Las Vegas': { lat: 36.1699, lon: -115.1398 },
  Honolulu: { lat: 21.3069, lon: -157.8583 },
  Toronto: { lat: 43.6532, lon: -79.3832 },
  Vancouver: { lat: 49.2827, lon: -123.1207 },
  'Mexico City': { lat: 19.4326, lon: -99.1332 },

  // ── South America ────────────────────────────────────────────────────────
  'São Paulo': { lat: -23.5505, lon: -46.6333 },
  'Rio de Janeiro': { lat: -22.9068, lon: -43.1729 },
  'Buenos Aires': { lat: -34.6037, lon: -58.3816 },
  Santiago: { lat: -33.4489, lon: -70.6693 },
  Lima: { lat: -12.0464, lon: -77.0428 },
  Bogotá: { lat: 4.711, lon: -74.0721 },

  // ── Africa ───────────────────────────────────────────────────────────────
  Cairo: { lat: 30.0444, lon: 31.2357 },
  Nairobi: { lat: -1.2921, lon: 36.8219 },
  Lagos: { lat: 6.5244, lon: 3.3792 },
  Johannesburg: { lat: -26.2041, lon: 28.0473 },
  'Cape Town': { lat: -33.9249, lon: 18.4241 },
  Casablanca: { lat: 33.5731, lon: -7.5898 },
}

export const cityNames = Object.keys(cities).sort((a, b) => a.localeCompare(b))

export const defaultCity = 'Seoul'

/** Sentinel for "wherever the visitor actually is", resolved by geolocation. */
export const CURRENT_LOCATION = '__current__'

/** Countries offered on the checkout shipping form. */
export const shippingCountries = [
  'South Korea',
  'Japan',
  'China',
  'Hong Kong',
  'Taiwan',
  'Singapore',
  'Malaysia',
  'Thailand',
  'Vietnam',
  'Indonesia',
  'Philippines',
  'India',
  'United Arab Emirates',
  'Saudi Arabia',
  'Australia',
  'New Zealand',
  'United Kingdom',
  'France',
  'Germany',
  'Netherlands',
  'Spain',
  'Italy',
  'Switzerland',
  'Sweden',
  'Poland',
  'United States',
  'Canada',
  'Mexico',
  'Brazil',
  'South Africa',
]
