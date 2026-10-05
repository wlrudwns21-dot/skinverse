import { describe, expect, it } from 'vitest'
import { detailPages, detailTiles, TILE_H } from './detailPages'

describe('detailTiles', () => {
  it('covers the page exactly, with no gap and no overrun', () => {
    for (const [id, art] of Object.entries(detailPages)) {
      for (const [lang, total] of Object.entries(art.pages)) {
        const tiles = detailTiles(id, lang as never)
        expect(tiles.reduce((n, t) => n + t.h, 0), `${id} ${lang}`).toBe(total)
      }
    }
  })

  it('keeps every tile inside what a browser will decode', () => {
    for (const id of Object.keys(detailPages)) {
      for (const t of detailTiles(id, 'ko')) {
        // iOS Safari stops decoding somewhere past 16MP and draws nothing.
        expect(t.w * t.h).toBeLessThan(16_000_000)
      }
    }
  })

  it('numbers tiles from zero, in order', () => {
    const tiles = detailTiles('ae-atobarrier365-cream-80', 'ko')
    expect(tiles[0].src).toBe('/products/ae-atobarrier365-cream-80/detail/ko/0.webp')
    expect(tiles.at(-1)?.src).toBe(`/products/ae-atobarrier365-cream-80/detail/ko/${tiles.length - 1}.webp`)
  })

  it('gives the last tile the remainder, not a full tile', () => {
    const tiles = detailTiles('ae-atobarrier365-cream-80', 'ko')
    expect(tiles.at(-1)?.h).toBe(12769 % TILE_H)
    expect(tiles[0].h).toBe(TILE_H)
    expect(tiles[0].w).toBe(1170)
  })

  it('returns nothing rather than another language, when a page is missing', () => {
    // Every registered page is in all four languages today, so the case that
    // has to be proven is the product with no artwork at all.
    expect(detailTiles('nope', 'ko')).toEqual([])
    expect(detailTiles('ae-atobarrier365-cream-80', 'ko', { w: 1170, pages: { en: 100 } })).toEqual([])
  })

  it('declares each product\'s own export width, not a shared one', () => {
    // The ACICA serum is exported at 860 and everything else at 1170. Declaring
    // 1170 for it would reserve 36% too much height per tile and shove the page
    // around as tiles load.
    expect(detailTiles('ae-acica365-soothing-serum-40', 'ko')[0].w).toBe(860)
    expect(detailTiles('ae-acica365-soothing-serum-duo', 'ko')[0].w).toBe(1170)
  })
})
