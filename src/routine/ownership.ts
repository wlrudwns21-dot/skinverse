/**
 * What the customer already owns, and when they will run out.
 *
 * The naive version of this rule is "hide what they bought", and it is wrong.
 * Cosmetics are consumables: a repurchase is the intended outcome, not a
 * failure of the recommender. Somebody who bought a 50ml serum in March has
 * been out for a fortnight by June, and putting it back in front of them is the
 * single most useful thing the shop can do that day.
 *
 * So the signal is not "owned" but "how far through it are they", and it
 * changes sign:
 *
 *   just bought          push it down   — it is on their shelf
 *   running out          push it up     — this is the moment
 *   long past            say nothing    — rank it on its merits
 *
 * All of it is a guess built on another guess (`useDays`), so the weights are
 * small enough to reorder products of similar standing and no more. It must
 * never bury something the skin actually needs.
 */

/** One line of the customer's purchase history, reduced to what matters here. */
export interface Ownership {
  productId: string
  /** Whole days since they last bought it. */
  daysSince: number
  /** Roughly how many days one unit lasts, from the catalogue. */
  useDays: number
}

export type OwnershipVerdict = 'hasIt' | 'runningOut' | 'longPast'

/**
 * Where they are in the bottle.
 *
 * The window opens at 70% — people start scraping the bottom well before it is
 * empty, and an offer that arrives the day they run out arrives a few days
 * late. It closes at 130%, after which the purchase says nothing useful about
 * today and the product goes back to being ranked on its merits.
 */
export const RESTOCK_OPENS = 0.7
export const RESTOCK_CLOSES = 1.3

export function verdict(own: Ownership): OwnershipVerdict {
  if (own.useDays <= 0) return 'longPast'
  const through = own.daysSince / own.useDays
  if (through < RESTOCK_OPENS) return 'hasIt'
  if (through < RESTOCK_CLOSES) return 'runningOut'
  return 'longPast'
}

/**
 * Points to add, which may be negative.
 *
 * Both sides taper. The penalty is heaviest the day after the parcel arrives
 * and fades as the bottle empties; the nudge is strongest in the middle of the
 * restock window and fades as the purchase becomes old news. A cliff edge in
 * either would mean a product visibly jumping the shelf overnight for a reason
 * the customer cannot see.
 */
export function ownershipPoints(own: Ownership, weight: number): number {
  if (own.useDays <= 0 || own.daysSince < 0) return 0
  const through = own.daysSince / own.useDays

  if (through < RESTOCK_OPENS) {
    // Full penalty at purchase, nothing by the time the window opens.
    return -Math.round(weight * (1 - through / RESTOCK_OPENS))
  }
  if (through < RESTOCK_CLOSES) {
    // A tent over the window: nothing at the edges, full nudge in the middle.
    const span = RESTOCK_CLOSES - RESTOCK_OPENS
    const middle = RESTOCK_OPENS + span / 2
    const distance = Math.abs(through - middle) / (span / 2)
    return Math.round(weight * (1 - distance))
  }
  return 0
}

/** Days between two instants, floored. Negative inputs are the caller's bug. */
export function daysBetween(from: string, to: Date = new Date()): number {
  const then = new Date(from).getTime()
  if (!Number.isFinite(then)) return -1
  return Math.floor((to.getTime() - then) / 86_400_000)
}
