import { describe, expect, it } from 'vitest'
import { daysBetween, ownershipPoints, verdict, type Ownership } from './ownership'

const own = (daysSince: number, useDays = 75): Ownership => ({
  productId: 'p1',
  daysSince,
  useDays,
})

/**
 * The rule that is easy to get backwards.
 *
 * Hiding what somebody bought sounds obviously right and is obviously wrong for
 * a consumable: the repurchase is the point. These pin the sign of the signal
 * at each stage of the bottle.
 */
describe('where they are in the bottle', () => {
  it('has it, just after buying', () => {
    expect(verdict(own(1))).toBe('hasIt')
    expect(verdict(own(30))).toBe('hasIt')
  })

  it('is running out before it is actually empty', () => {
    // 70% of 75 days is 52.5 — people scrape the bottom well before empty, and
    // an offer that lands the day it runs out lands a few days late.
    expect(verdict(own(52))).toBe('hasIt')
    expect(verdict(own(53))).toBe('runningOut')
    expect(verdict(own(75))).toBe('runningOut')
    expect(verdict(own(97))).toBe('runningOut')
  })

  it('stops mattering once the purchase is old news', () => {
    expect(verdict(own(98))).toBe('longPast')
    expect(verdict(own(400))).toBe('longPast')
  })

  it('says nothing when the catalogue has no usable life', () => {
    expect(verdict(own(30, 0))).toBe('longPast')
  })
})

describe('the sign of the points', () => {
  it('pushes down what they just bought', () => {
    expect(ownershipPoints(own(1), 10)).toBeLessThan(0)
  })

  it('pushes up what they are about to run out of', () => {
    expect(ownershipPoints(own(75), 10)).toBeGreaterThan(0)
  })

  it('is silent long after', () => {
    expect(ownershipPoints(own(400), 10)).toBe(0)
  })
})

describe('both sides taper', () => {
  /*
   * A cliff edge would mean a product visibly jumping the shelf overnight for
   * a reason the customer has no way to see.
   */
  it('the penalty is heaviest on arrival and fades', () => {
    const fresh = ownershipPoints(own(0), 10)
    const half = ownershipPoints(own(26), 10)
    const nearlyOut = ownershipPoints(own(50), 10)
    expect(fresh).toBe(-10)
    expect(half).toBeGreaterThan(fresh)
    expect(nearlyOut).toBeGreaterThan(half)
    expect(nearlyOut).toBeLessThanOrEqual(0)
  })

  it('the nudge peaks in the middle of the restock window', () => {
    // Window is 52.5–97.5 days, so the peak is at 75 — exactly one bottle.
    const opening = ownershipPoints(own(53), 10)
    const peak = ownershipPoints(own(75), 10)
    const closing = ownershipPoints(own(97), 10)
    expect(peak).toBe(10)
    expect(opening).toBeLessThan(peak)
    expect(closing).toBeLessThan(peak)
  })

  it('never exceeds the weight it was given', () => {
    for (let d = 0; d <= 200; d++) {
      expect(Math.abs(ownershipPoints(own(d), 10))).toBeLessThanOrEqual(10)
    }
  })
})

describe('shorter-lived products come round sooner', () => {
  it('a toner is due for restock while a serum is not', () => {
    // 45 days for a toner, 75 for a serum — at day 50 only one has run out.
    expect(verdict({ productId: 'toner', daysSince: 50, useDays: 45 })).toBe('runningOut')
    expect(verdict({ productId: 'serum', daysSince: 50, useDays: 75 })).toBe('hasIt')
  })
})

describe('days between', () => {
  it('counts whole days', () => {
    const now = new Date('2026-09-18T04:00:00Z')
    expect(daysBetween('2026-09-18T03:00:00Z', now)).toBe(0)
    expect(daysBetween('2026-09-17T03:00:00Z', now)).toBe(1)
    expect(daysBetween('2026-08-19T04:00:00Z', now)).toBe(30)
  })

  it('refuses a date it cannot read rather than returning zero', () => {
    // Zero would read as "bought today" and suppress the product.
    expect(daysBetween('not a date')).toBe(-1)
    expect(ownershipPoints({ productId: 'p', daysSince: -1, useDays: 75 }, 10)).toBe(0)
  })
})
