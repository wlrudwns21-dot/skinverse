import { describe, expect, it } from 'vitest'
import { marginFromPrice, priceFromMargin } from './remote'

/**
 * The two directions the product form moves in: type a margin and get a price,
 * or override the price and see what margin that really is.
 *
 * Worth pinning because an operator sets a shelf price from these numbers, and
 * a margin that reads 40% while actually being 28% is a business error nobody
 * would catch until the quarter closed.
 */
describe('price from cost and margin', () => {
  it('adds the margin to the cost', () => {
    // ₩28,000 at 40% → ₩39,200, which is what p1 actually costs today.
    expect(priceFromMargin(28000, 40)).toBe(39200)
  })

  it('rounds to a whole won', () => {
    // ₩10,000 at 33.33% is ₩13,333, not ₩13,333.00 — nobody writes that.
    expect(priceFromMargin(10000, 33.33)).toBe(13333)
    expect(Number.isInteger(priceFromMargin(9999, 17.5))).toBe(true)
  })

  it('treats a zero margin as selling at cost', () => {
    expect(priceFromMargin(28000, 0)).toBe(28000)
  })

  it('allows a negative margin — a loss leader is a real decision', () => {
    expect(priceFromMargin(10000, -20)).toBe(8000)
  })

  it('refuses the nonsensical rather than producing a price', () => {
    // No cost means no margin to apply; −100% would make everything free.
    expect(priceFromMargin(0, 40)).toBe(0)
    expect(priceFromMargin(-1, 40)).toBe(0)
    expect(priceFromMargin(10000, -100)).toBe(0)
    expect(priceFromMargin(Number.NaN, 40)).toBe(0)
  })
})

describe('margin from cost and price', () => {
  it('is the inverse of the forward calculation', () => {
    expect(marginFromPrice(28000, 39200)).toBeCloseTo(40, 6)
  })

  it('reports a loss as a negative margin', () => {
    expect(marginFromPrice(10000, 8000)).toBeCloseTo(-20, 6)
  })

  it('reports zero when the price is the cost', () => {
    expect(marginFromPrice(28000, 28000)).toBe(0)
  })

  it('does not divide by a zero cost', () => {
    expect(marginFromPrice(0, 39200)).toBe(0)
  })

  it('round-trips a hand-rounded price back to roughly the margin asked for', () => {
    // The operator types 40%, gets ₩39,200, rounds it up to a nicer ₩39,000 —
    // the form must then admit that is 39.3%, not keep claiming 40%.
    const honest = marginFromPrice(28000, 39000)
    expect(honest).toBeGreaterThan(39)
    expect(honest).toBeLessThan(40)
  })
})
