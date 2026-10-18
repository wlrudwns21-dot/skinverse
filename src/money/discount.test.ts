import { describe, expect, it } from 'vitest'

import { offPercent } from './discount'

describe('what it refuses to call a discount', () => {
  it('says nothing when no list price is recorded', () => {
    // Zero is "we do not know", not "no discount". REJURAN is the live case:
    // its duty-free sale prices were never captured, so those products sell
    // at list and must show no strikethrough rather than a cheerful 0%.
    expect(offPercent(59, 0)).toBeNull()
    expect(offPercent(59, null)).toBeNull()
    expect(offPercent(59, undefined)).toBeNull()
  })

  it('says nothing when the list price is not above the sale price', () => {
    expect(offPercent(20, 20)).toBeNull()
    expect(offPercent(20, 19)).toBeNull()
  })

  it('says nothing for a difference that rounds to nothing', () => {
    // 0.4% off. Rounded it is zero, and a zero drawn as a sale badge is worse
    // than an empty space.
    expect(offPercent(19.92, 20)).toBeNull()
  })

  it('refuses nonsense rather than returning it', () => {
    expect(offPercent(0, 20)).toBeNull()
    expect(offPercent(-5, 20)).toBeNull()
    expect(offPercent(Number.NaN, 20)).toBeNull()
    expect(offPercent(10, Number.NaN)).toBeNull()
    expect(offPercent(10, Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('the discounts actually in the catalogue', () => {
  // Taken from the duty-free price sheet: every brand discounts by its own
  // amount, and d'Alba by a different amount on each product. If the maths
  // here ever drifts, these are the numbers a customer would see change.
  const rows: [string, number, number, number][] = [
    ['AESTURA cream', 16.8, 21, 20],
    ['AESTURA cream mist', 11.2, 14, 20],
    ['AESTURA acica duo', 34.4, 43, 20],
    ['ANUA PDRN serum', 15.6, 26, 40],
    ['ANUA cleansing foam', 6.6, 11, 40],
    ['AHC Volume 5 eye', 10.2, 17, 40],
    ['AHC night gel', 11.4, 19, 40],
    ['AHC Lift 4 eye', 10.8, 18, 40],
    ["d'Alba tone-up sun", 15.84, 22, 28],
    ["d'Alba anti-aging sun", 15.84, 24, 34],
    ["d'Alba vita toning serum", 20.9, 38, 45],
  ]

  it.each(rows)('%s is %d from %d — %d%% off', (_name, price, list, want) => {
    expect(offPercent(price, list)).toBe(want)
  })
})

describe('rounding', () => {
  it('rounds to the nearest whole percent rather than truncating', () => {
    // 1 - 10/15 = 33.33% rounds down, 1 - 10/16 = 37.5% rounds up.
    expect(offPercent(10, 15)).toBe(33)
    expect(offPercent(10, 16)).toBe(38)
  })

  it('reports one percent at the smallest difference it will show', () => {
    expect(offPercent(99, 100)).toBe(1)
  })
})
