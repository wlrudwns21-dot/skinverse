/**
 * What a visitor is allowed to do, in one place.
 *
 * Browsing and *looking* is open to everyone — the shop, the weather-tuned
 * routine, the skincare advice, the skin stories. What costs the platform
 * something, or only means anything if it is remembered, is for members.
 *
 * The AI analysis is members-only. It used to allow guests one trial a day,
 * which read well on paper and worked badly: every analysis is a billed call
 * against a prepaid balance, the result could not be saved so the customer got
 * a number and no way to act on it, and a trend — the thing that makes the
 * product worth returning to — needs at least two scans against one account.
 * Giving it away produced cost without a relationship.
 */
export type Capability =
  /** Home, product grid, product detail. */
  | 'browse'
  /** Weather routine screen: city switching, AM/PM steps, daily advice. */
  | 'viewRoutine'
  /** Missions/rewards screen in read-only form. */
  | 'viewRewards'
  /** Running the AI analysis. Members only: every call is billed and saved. */
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
  'cart',
])

export function can(capability: Capability, isMember: boolean): boolean {
  return isMember || GUEST_CAPABILITIES.has(capability)
}

/** Capabilities a guest can reach but only in a limited or unsaved form. */
export const GUEST_LIMITED: ReadonlySet<Capability> = new Set<Capability>([])
