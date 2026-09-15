/**
 * When a routine step can be ticked off, and how well the week went.
 *
 * A routine is advice until someone does it, and "did you do it?" is a question
 * with a time attached: a morning cleanse logged at 11pm is not a morning
 * cleanse, and a checkbox that accepts it is a checkbox that measures nothing.
 * So each half of the routine has a window, and outside it the steps are shown
 * but cannot be claimed.
 *
 * Everything here is pure and takes the clock as an argument. That is what lets
 * the windows be tested at 3am and at 5pm without waiting for either.
 */

export type Slot = 'am' | 'pm'

/**
 * The windows, in local hours.
 *
 * Morning runs from 4am — early enough for a shift worker, late enough that
 * 2am counts as the night before — to noon. Evening runs from 5pm, which is
 * the hour the customer asked for, to the end of the day.
 *
 * The gap between them is deliberate. Skincare done at 2pm is neither routine,
 * and letting the afternoon count for both would turn a two-a-day habit into
 * one anyone can clear in a single sitting.
 */
export const WINDOWS: Record<Slot, { from: number; until: number }> = {
  am: { from: 4, until: 12 },
  pm: { from: 17, until: 24 },
}

export const SLOTS: Slot[] = ['am', 'pm']

/** Is this slot's window open at the given local time? */
export function isOpen(slot: Slot, now: Date): boolean {
  const hour = now.getHours()
  const window = WINDOWS[slot]
  return hour >= window.from && hour < window.until
}

/** Whichever window is open now, or null in the gap between them. */
export function openSlot(now: Date): Slot | null {
  return SLOTS.find((slot) => isOpen(slot, now)) ?? null
}

/**
 * The local calendar day, as `YYYY-MM-DD`.
 *
 * Built from the local parts rather than `toISOString`, which would convert to
 * UTC first and file a 9pm evening routine in Seoul under the following day.
 */
export function localDay(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** `YYYY-MM-DD` for a day offset from the given date, negative for the past. */
export function dayOffset(now: Date, days: number): string {
  const shifted = new Date(now)
  shifted.setDate(shifted.getDate() + days)
  return localDay(shifted)
}

// ── adherence ───────────────────────────────────────────────────────────────

/** One step, as the screen needs to decide whether it can be ticked. */
export interface Checkable {
  slot: Slot
  key: string
}

/** What was actually ticked, as `day -> set of "slot:key"`. */
export type CheckLog = Record<string, ReadonlySet<string>>

export const checkId = (slot: Slot, key: string) => `${slot}:${key}`

export interface DayAdherence {
  day: string
  /** Steps ticked that day. */
  done: number
  /** Steps the routine asked for. */
  total: number
  /** 0–100. Zero when the routine asks for nothing, rather than NaN. */
  pct: number
  /** Per-slot completion, for a chart that shows morning and evening apart. */
  am: { done: number; total: number }
  pm: { done: number; total: number }
}

/**
 * How a single day went.
 *
 * `steps` is today's routine. Using it for past days is a deliberate
 * simplification and a real limitation: the routine follows the weather, so a
 * humid week may have asked for fewer steps than today does, and those days
 * will read slightly harsh. Storing the day's plan alongside its ticks is what
 * would fix it properly — worth doing before this drives anything but a chart.
 */
export function adherenceFor(day: string, steps: Checkable[], log: CheckLog): DayAdherence {
  const ticked = log[day] ?? new Set<string>()
  const count = (slot: Slot) => {
    const inSlot = steps.filter((step) => step.slot === slot)
    return {
      total: inSlot.length,
      done: inSlot.filter((step) => ticked.has(checkId(step.slot, step.key))).length,
    }
  }

  const am = count('am')
  const pm = count('pm')
  const total = am.total + pm.total
  const done = am.done + pm.done

  return { day, done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100), am, pm }
}

export interface Streak {
  /** Consecutive days, ending today or yesterday, that were fully cleared. */
  current: number
  /** The longest such run anywhere in the window. */
  best: number
}

/** A day counts toward a streak only when every step was ticked. */
const cleared = (day: DayAdherence) => day.total > 0 && day.done === day.total

/**
 * The run of cleared days, counted back from today.
 *
 * Today not being finished yet does not break the streak — it is still
 * morning somewhere in the day — so the count may start at yesterday. Anything
 * stricter would zero a customer's streak every night at midnight.
 */
export function streakOf(days: DayAdherence[]): Streak {
  const ordered = [...days].sort((a, b) => (a.day < b.day ? 1 : -1))

  let current = 0
  for (const [index, day] of ordered.entries()) {
    if (cleared(day)) current++
    else if (index === 0) continue // today, still in progress
    else break
  }

  let best = 0
  let run = 0
  for (const day of ordered) {
    run = cleared(day) ? run + 1 : 0
    if (run > best) best = run
  }

  return { current, best }
}

/** The share of all asked-for steps that were actually done, across the window. */
export function overallRate(days: DayAdherence[]): number {
  const total = days.reduce((sum, day) => sum + day.total, 0)
  if (total === 0) return 0
  const done = days.reduce((sum, day) => sum + day.done, 0)
  return Math.round((done / total) * 100)
}
