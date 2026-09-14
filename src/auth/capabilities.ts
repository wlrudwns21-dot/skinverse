/**
 * What a visitor is allowed to do, in one place.
 *
 * The rule the product asked for: browsing and *looking* is open to everyone —
 * the shop, the weather-tuned routine, the skincare advice. What costs the
 * platform something, or only means anything if it is remembered, is for
 * members: buying, saving a routine, earning and spending points, and the AI
 * scan beyond a single daily trial.
 *
 * Guests get exactly one scan per calendar day so they can judge the product
 * before committing, but the result is never written down — it lives in memory
 * until they refresh.
 */
export type Capability =
  /** Home, product grid, product detail. */
  | 'browse'
  /** Weather routine screen: city switching, AM/PM steps, daily advice. */
  | 'viewRoutine'
  /** Missions/rewards screen in read-only form. */
  | 'viewRewards'
  /** Running the AI analysis. Guests are additionally capped at once a day. */
  | 'scan'
  /** Keeping a scan result — history, and survival across a refresh. */
  | 'saveScan'
  /** Putting items in the bag. */
  | 'cart'
  /** Paying. */
  | 'checkout'
  /** Saving the current weather routine to the account. */
  | 'saveRoutine'
  /** Completing a mission for points. */
  | 'claimMission'
  /** Spending points on a reward. */
  | 'redeem'
  /** My Page. */
  | 'myPage'

const GUEST_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>([
  'browse',
  'viewRoutine',
  'viewRewards',
  'scan',
  'cart',
])

export function can(capability: Capability, isMember: boolean): boolean {
  return isMember || GUEST_CAPABILITIES.has(capability)
}

/** Capabilities a guest can reach but only in a limited or unsaved form. */
export const GUEST_LIMITED: ReadonlySet<Capability> = new Set<Capability>(['scan'])

// ── guest daily scan allowance ──────────────────────────────────────────────

const GUEST_SCAN_KEY = 'skinverse.guestScan'

/** Local calendar day as YYYY-MM-DD, so the allowance resets at the visitor's midnight. */
function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * Whether a guest has already used today's trial scan.
 *
 * This is a browser-side allowance, not a security control — clearing site data
 * resets it. That is an acceptable trade: the scan is the hook that sells the
 * signup, and anything stronger would mean fingerprinting visitors.
 */
export function guestScanUsedToday(): boolean {
  try {
    return localStorage.getItem(GUEST_SCAN_KEY) === today()
  } catch {
    return false
  }
}

export function markGuestScanUsed(): void {
  try {
    localStorage.setItem(GUEST_SCAN_KEY, today())
  } catch {
    // Private browsing or blocked storage: the guest simply gets another try.
  }
}
