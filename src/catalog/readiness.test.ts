import { describe, expect, it } from 'vitest'
import { canSell, gapsOf, saleBlockers, type Gap } from './readiness'
import { SEED_CATALOG } from './remote'
import type { CatalogProduct } from './types'

const base = (over: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: 'x',
  brand: 'AESTURA',
  name: 'Something Cream',
  nameL: { ko: '무언가 크림' },
  price: 10,
  priceKrw: 13596,
  useDays: 60,
  tag: 'Hydration',
  metric: 'hydration',
  ml: '50ml',
  kind: 'Cream',
  g: 'linear-gradient(x)',
  img: '/products/x/main.webp',
  ing: '정제수',
  inci: 'Water',
  sub: { ko: 'a', en: 'a', zh: 'a', th: 'a' },
  why: { ko: 'b', en: 'b', zh: 'b', th: 'b' },
  line: '',
  slot: 'both',
  step: 'cream',
  checked: true,
  fits: [],
  pros: [],
  cons: [],
  detail: { w: 1170, pages: { ko: 100 } },
  stock: 10,
  sold: 0,
  active: true,
  ...over,
})

describe('gapsOf', () => {
  it('finds nothing wrong with a complete product', () => {
    expect(gapsOf(base())).toEqual([])
  })

  it('reports an unverified ingredient list, and only that blocks selling', () => {
    expect(gapsOf(base({ checked: false }))).toContain('ingredients')
    expect(canSell(base({ checked: false }))).toBe(false)
    // Missing photographs, copy and artwork are judgement calls, not refusals.
    expect(canSell(base({ img: '', sub: {} as never, detail: undefined }))).toBe(true)
  })

  it('treats a Korean name in `name` as a missing English name', () => {
    // These are the 24 registered from the price list: the sheet gives only a
    // Korean name, so that is what `name` holds until the maker's page arrives.
    expect(gapsOf(base({ name: '아토베리어365 로션', nameL: { ko: '아토베리어365 로션' } }))).toContain('nameEn')
    expect(gapsOf(base({ name: 'Atobarrier365 Lotion' }))).not.toContain('nameEn')
  })

  it('wants copy in all four languages, not just one', () => {
    expect(gapsOf(base({ sub: { ko: 'a' } as never }))).toContain('copy')
    expect(gapsOf(base({ why: { ko: 'b', en: 'b', zh: 'b' } as never }))).toContain('copy')
    expect(gapsOf(base({ sub: { ko: ' ', en: 'a', zh: 'a', th: 'a' } as never }))).toContain('copy')
  })

  it('refuses to sell a product with no price', () => {
    // A ₩0 product settles to the one-cent floor rather than to a refusal, so
    // without this the first person to notice would be whoever bought a toner
    // for a penny. The database carries the same rule as a CHECK.
    expect(gapsOf(base({ priceKrw: 0 }))).toContain('price')
    expect(canSell(base({ priceKrw: 0 }))).toBe(false)
    expect(saleBlockers(base({ priceKrw: 0 }))).toEqual(['price'])
    expect(saleBlockers(base({ priceKrw: 0, checked: false }))).toEqual(['ingredients', 'price'])
    expect(saleBlockers(base())).toEqual([])
  })

  it('names only the gaps the database would actually refuse', () => {
    // Missing photographs and copy are judgement calls; they must never appear
    // as a reason the sale was blocked.
    expect(saleBlockers(base({ img: '', detail: undefined, stock: 0 }))).toEqual([])
  })

  it('reports the photograph, the artwork and empty stock separately', () => {
    expect(gapsOf(base({ img: '' }))).toContain('photo')
    expect(gapsOf(base({ detail: undefined }))).toContain('detail')
    expect(gapsOf(base({ detail: { w: 1170, pages: {} } }))).toContain('detail')
    expect(gapsOf(base({ stock: 0 }))).toContain('stock')
  })
})

describe('the catalogue as it actually stands', () => {
  it('has no product on sale with an unverified ingredient list', () => {
    for (const p of SEED_CATALOG.products) {
      if (p.active) expect(canSell(p), p.id).toBe(true)
    }
  })

  it('reports gaps only for the product that has them', () => {
    const byId = new Map(SEED_CATALOG.products.map((p) => [p.id, gapsOf(p)]))
    const blocked = [...byId].filter(([, g]) => g.includes('ingredients')).map(([id]) => id)
    // The bundled seed carries the seven analysed products; of those exactly
    // one is still waiting on the maker's ingredient list.
    expect(blocked).toEqual(['ae-atobarrier365-hydro-soothing-80'])
  })

  it('does not call stock a gap that stops the shop working', () => {
    // The seed has no stock numbers at all — it is a fallback, not inventory —
    // so 'stock' must be a note and never a reason to hide a product.
    const g: Gap[] = gapsOf(SEED_CATALOG.products[0])
    expect(g).toContain('stock')
    expect(canSell(SEED_CATALOG.products[0])).toBe(true)
  })
})
