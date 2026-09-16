import { describe, expect, it } from 'vitest'
import type { CatalogProduct, StoreSettings } from '../catalog/types'
import { initialState, POINTS_PER_DOLLAR, totalsOf, type StoreState } from './state'

/**
 * `totalsOf` is a preview. `place_order()` in the database is the decision, and
 * it recomputes every one of these numbers from its own tables.
 *
 * Two implementations of one sum drift, and when they do the customer is shown
 * one price and charged another. These cases are the fence: each was run
 * against the live function and asserts the figure it actually returned, so a
 * change to either side that breaks the agreement fails here.
 *
 * The SQL this pins, from public.place_order:
 *
 *   cap_pts  := floor(sub * cap_pct / 100.0)::int * 100
 *   used_pts := case when p_use_points then least(pts, cap_pts) else 0 end
 *   total    := greatest(0, sub + ship_fee - (used_pts / 100.0))
 *   earned   := round(total * earn_rate)::int
 */

const settings: StoreSettings = { earnPerDollar: 5, useCapPct: 30, streakBonus: 0 }

const product = (id: string, price: number): CatalogProduct =>
  ({ id, price, active: true } as CatalogProduct)

const rates = { dhl: { fee: 12 }, ems: { fee: 8 } }

function stateWith(over: Partial<StoreState>): StoreState {
  return { ...initialState, ...over }
}

describe('checkout totals agree with place_order()', () => {
  /**
   * The exact scenario run against the database: two of a $28 product, DHL, a
   * member holding 4,720 points, cap 30%, earn 5/$.
   *
   * It answered: sub 56, ship 12, used 1600, total 52, earned 260.
   */
  it('reproduces the figures the database returned', () => {
    const t = totalsOf(
      stateWith({ cart: { p1: 2 }, points: 4720, ship: 'dhl', usePoints: true }),
      [product('p1', 28)],
      settings,
      rates,
    )

    expect(t.sub).toBe(56)
    expect(t.ship).toBe(12)
    expect(t.ptsUsed).toBe(1600)
    expect(t.total).toBe(52)
    expect(Math.round(t.total * settings.earnPerDollar)).toBe(260)
  })

  /** The cap is floored to whole dollars before becoming points, not after. */
  it('floors the cap to a whole dollar', () => {
    const t = totalsOf(
      stateWith({ cart: { p1: 2 }, points: 100000, ship: 'dhl', usePoints: true }),
      [product('p1', 28)],
      settings,
      rates,
    )
    // 56 * 0.30 = 16.8 → 16 dollars → 1,600 points, not 1,680.
    expect(t.ptsUsed).toBe(16 * POINTS_PER_DOLLAR)
  })

  /** A balance smaller than the cap is what limits the discount. */
  it('spends no more than the member actually holds', () => {
    const t = totalsOf(
      stateWith({ cart: { p1: 2 }, points: 300, ship: 'dhl', usePoints: true }),
      [product('p1', 28)],
      settings,
      rates,
    )
    expect(t.ptsUsed).toBe(300)
    expect(t.total).toBe(56 + 12 - 3)
  })

  it('spends nothing when the member has opted out', () => {
    const t = totalsOf(
      stateWith({ cart: { p1: 2 }, points: 4720, ship: 'dhl', usePoints: false }),
      [product('p1', 28)],
      settings,
      rates,
    )
    expect(t.ptsUsed).toBe(0)
    expect(t.total).toBe(68)
  })

  /** Postage follows the chosen method, and the rates come from the catalog. */
  it('charges the rate the catalog carries, not a hard-coded one', () => {
    const cart = { cart: { p1: 1 }, points: 0, usePoints: true }
    const products = [product('p1', 28)]
    expect(totalsOf(stateWith({ ...cart, ship: 'ems' }), products, settings, rates).ship).toBe(8)
    expect(
      totalsOf(stateWith({ ...cart, ship: 'ems' }), products, settings, {
        ...rates,
        ems: { fee: 99 },
      }).ship,
    ).toBe(99)
  })

  /** An empty bag is not a free delivery — place_order refuses it outright. */
  it('charges no postage on an empty bag', () => {
    const t = totalsOf(stateWith({ cart: {}, points: 500 }), [], settings, rates)
    expect(t.sub).toBe(0)
    expect(t.ship).toBe(0)
    expect(t.total).toBe(0)
  })

  /**
   * A line whose product is not in the catalog contributes nothing. The
   * database gets this for free — its join simply does not match — and the
   * preview has to reach the same answer rather than guessing a price.
   */
  it('ignores a line with no live product behind it', () => {
    const t = totalsOf(
      stateWith({ cart: { p1: 1, ghost: 4 }, points: 0, ship: 'ems', usePoints: true }),
      [product('p1', 28)],
      settings,
      rates,
    )
    expect(t.sub).toBe(28)
  })
})
