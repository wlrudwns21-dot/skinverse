import { describe, expect, it } from 'vitest'

import { detailPages } from './detailPages'
import { toCatalogProduct, type ProductRow } from './types'
import { LANGS } from '../data/types'

/**
 * Where the storefront gets a product's artwork dimensions.
 *
 * This file exists because of one bug, and it is here to stop that bug coming
 * back. The database has a `detail_pages` column holding each page's height
 * per language. Nothing in the app ever wrote to it, so it was only ever
 * filled by someone running SQL by hand after editing `detailPages.ts`. When
 * Japanese was added, the file was updated and the column was not — and
 * because a missing height makes `detailTiles` return an empty list rather
 * than throw, the shop drew no detail page at all and reported nothing wrong.
 * The tiles were in the bucket. The manifest matched byte for byte. Every
 * test passed.
 *
 * The mapper now reads the repository. These tests hold it there.
 */

/** The smallest row the mapper accepts, for a product the repository knows. */
const row = (over: Partial<ProductRow> = {}): ProductRow => ({
  id: 'ae-atobarrier365-cream-80',
  brand: 'AESTURA',
  name: 'Atobarrier365 Cream',
  price: 20,
  tag: 'barrier',
  metric: 'hydration',
  ml: '80ml',
  kind: 'Cream',
  gradient: 'linear-gradient(#fff,#eee)',
  ingredients: '정제수',
  sub: { ko: '', en: '', zh: '', ja: '', th: '' },
  why: { ko: '', en: '', zh: '', ja: '', th: '' },
  stock: 0,
  sold: 0,
  active: true,
  sort: 0,
  ...over,
})

describe('a product row becomes a storefront product', () => {
  it('takes the artwork dimensions from the repository', () => {
    expect(toCatalogProduct(row()).detail).toBe(detailPages['ae-atobarrier365-cream-80'])
  })

  it('ignores a detail_pages column that disagrees with the repository', () => {
    // This is the regression. A row carrying a stale column — here, one that
    // has never heard of Japanese — must not be what the shop draws from.
    const stale = { w: 1170, pages: { ko: 12769 } }
    const got = toCatalogProduct(row({ detail_pages: stale } as Partial<ProductRow>))
    expect(got.detail).not.toBe(stale)
    expect(got.detail).toBe(detailPages['ae-atobarrier365-cream-80'])
  })

  it('serves every language the repository has artwork for', () => {
    // The assertion that would have failed. Iterating LANGS rather than a
    // list written here means a sixth language is covered the day it is added.
    const got = toCatalogProduct(row())
    for (const lang of LANGS) {
      expect(got.detail?.pages?.[lang], `${lang} page height`).toBeGreaterThan(0)
    }
  })

  it('leaves detail undefined for a product with no artwork', () => {
    // A product registered before its pages are drawn is not an error; the
    // page simply has no artwork section until the tiles exist.
    expect(toCatalogProduct(row({ id: 'not-a-product' })).detail).toBeUndefined()
  })
})

describe('every product the repository has artwork for', () => {
  it('has a height in all five languages', () => {
    // `detailPages` is what the storefront now reads, so a gap here is a blank
    // detail page in the shop — which is what happened, and silently.
    for (const [id, art] of Object.entries(detailPages)) {
      for (const lang of LANGS) {
        expect(art.pages[lang], `${id} is missing ${lang}`).toBeGreaterThan(0)
      }
    }
  })
})
