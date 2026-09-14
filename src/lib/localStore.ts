/**
 * Small typed wrapper over localStorage.
 *
 * Every access is guarded: private browsing, blocked site data and full quotas
 * all throw, and none of them should take the app down. A failed read behaves
 * as "nothing stored yet".
 */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Nothing to do — the session simply will not survive a refresh.
  }
}

export function clearLocal(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // As above.
  }
}

export const LOCAL_KEYS = {
  /** Guest bag. Members keep their bag in Postgres instead. */
  cart: 'skinverse.cart',
  /** UI preferences, kept for guests and members alike. */
  prefs: 'skinverse.prefs',
} as const
