import { describe, expect, it } from 'vitest'
import { SEED_CATALOG } from '../catalog/remote'
import { FALLBACK_RATES } from './fx'

/**
 * The shop sells at the Lotte Duty Free selling price.
 *
 * Products are authored in won and the dollar figure is derived, so the rate is
 * the only thing standing between "the same price as Lotte" and "forty-eight
 * cents under it", which is what ₩1,400 produced. Nothing about the code says
 * the rate matters — it is one number in a table — so this pins it to the only
 * evidence there is: Lotte's own dollar prices, off the price list.
 *
 * If this fails, a rate changed. That is allowed, but it is a pricing decision
 * and the figures below have to be revisited with it, not the other way round.
 */
const LOTTE_USD: Record<string, number> = {
  'ae-atobarrier365-cream-80': 16.8,
  'ae-atobarrier365-cream-mist-120': 11.2,
  'ae-atobarrier365-hydro-soothing-80': 16.8,
  'ae-regederm365-capsule-serum-30': 24,
  'ae-dermauv365-mineral-40': 15.2,
  'ae-acica365-soothing-serum-40': 19.2,
  'ae-acica365-soothing-serum-duo': 34.4,
}

describe('the fallback prices match Lotte Duty Free', () => {
  it('derives every product to the cent', () => {
    for (const p of SEED_CATALOG.products) {
      const want = LOTTE_USD[p.id]
      expect(want, `${p.id} is missing from the Lotte price list`).toBeDefined()
      expect(p.price, `${p.id} (₩${p.priceKrw})`).toBe(want)
    }
  })

  it('covers every product in the catalogue', () => {
    expect(SEED_CATALOG.products.map((p) => p.id).sort()).toEqual(Object.keys(LOTTE_USD).sort())
  })

  /* The seed and the database have to agree, or the shop quotes one price
     while the server charges another. The database holds the same number in
     `fx_rates`; this is the half that can be checked without a connection. */
  it('uses the rate the won prices were set from', () => {
    expect(FALLBACK_RATES.USD.krwPerUnit).toBe(1359.6)
  })
})
