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

  it('reports an unverified ingredient list without blocking the sale', () => {
    // A listing with a name, a price and a photograph makes no claim that
    // could be wrong. What may not happen is the claim itself, and the
    // database refuses that separately: an unchecked product may hold no
    // ingredient list and no analysis at all.
    expect(gapsOf(base({ checked: false }))).toContain('ingredients')
    expect(canSell(base({ checked: false }))).toBe(true)
    expect(saleBlockers(base({ checked: false }))).toEqual([])
    // Missing photographs, copy and artwork are judgement calls too.
    expect(canSell(base({ img: '', sub: {} as never, detail: undefined }))).toBe(true)
  })

  it('treats a Korean name in `name` as a missing English name', () => {
    // A price list gives only a Korean name, so a bulk-loaded row holds that
    // in `name` until the maker's own page arrives with the English one. The
    // rows that prompted this have since been removed, but the next load will
    // arrive the same way.
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
    expect(saleBlockers(base({ priceKrw: 0, checked: false }))).toEqual(['price'])
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

  it('carries a verified ingredient list for every product it bundles', () => {
    // The seed holds the seven products whose lists were checked against the
    // maker's own. Everything registered since lives in the database only, so
    // a product appearing here without a list means the seed fell behind.
    const unverified = SEED_CATALOG.products.filter((p) => gapsOf(p).includes('ingredients'))
    expect(unverified.map((p) => p.id)).toEqual([])
  })

  it('does not call stock a gap that stops the shop working', () => {
    // The seed has no stock numbers at all — it is a fallback, not inventory —
    // so 'stock' must be a note and never a reason to hide a product.
    const g: Gap[] = gapsOf(SEED_CATALOG.products[0])
    expect(g).toContain('stock')
    expect(canSell(SEED_CATALOG.products[0])).toBe(true)
  })
})
