import type { Lang } from '../data/types'

/**
 * The maker's long-form detail artwork, sliced into tiles.
 *
 * ── why these are tiles and not one image ───────────────────────────────────
 *
 * A detail page is one tall picture, up to 1170×18,704. That is 21.9
 * megapixels, and iOS Safari refuses to decode an image much past 16 — not
 * with an error, but by drawing nothing. So an unsliced page is a blank screen
 * on an iPhone, which is most of the audience. Tiles of 2,000px stay well
 * under any limit and stack with no gap, so the seam cannot be seen.
 *
 * It also means a customer who reads the top of the page downloads one tile
 * rather than the whole three megabytes.
 *
 * ── why the width is stored per product ─────────────────────────────────────
 *
 * It would be tidier if every page were exported at the same width, and for a
 * while every one was: 1170, which is 390pt at 3×. Then the ACICA serum
 * arrived at 860. Assuming the old number would have made each tile declare a
 * height it does not have, and a lazily-loaded tile that reserves the wrong
 * space shoves the page around under the reader's thumb. So the width is a
 * fact about each product's artwork, recorded with it.
 */
export const TILE_H = 2000

export interface DetailTile {
  src: string
  w: number
  h: number
}

/** One product's artwork: the width it was exported at, and its page heights. */
export interface DetailArt {
  w: number
  /** Page height per locale. A missing locale has no artwork. */
  pages: Partial<Record<Lang, number>>
}

export const detailPages: Record<string, DetailArt> = {
  'ae-acica365-soothing-serum-40': {
    w: 860,
    pages: { en: 10494, ko: 10446, th: 10502, zh: 10327 },
  },
  'ae-acica365-soothing-serum-duo': {
    w: 1170,
    pages: { en: 14277, ko: 14211, th: 14324, zh: 14050 },
  },
  'ae-atobarrier365-cream-80': {
    w: 1170,
    pages: { en: 12889, ko: 12769, th: 12769, zh: 12382 },
  },
  'ae-atobarrier365-cream-mist-120': {
    w: 1170,
    pages: { en: 14599, ko: 14497, th: 14617, zh: 14413 },
  },
  'ae-atobarrier365-hydro-soothing-80': {
    w: 1170,
    pages: { en: 18704, ko: 18271, th: 18385, zh: 17909 },
  },
  'ae-dermauv365-mineral-40': {
    w: 1170,
    pages: { en: 15361, ko: 15007, th: 15152, zh: 14828 },
  },
  'ae-regederm365-capsule-serum-30': {
    w: 1170,
    pages: { en: 17309, ko: 17070, th: 17308, zh: 16819 },
  },
}

/**
 * The tiles for one product in one language, or an empty list when there is no
 * page for it.
 *
 * There is no fallback to another language. A Thai customer shown a Korean
 * detail page has been shown a page they cannot read, which is worse than
 * being shown none — the analysis above it is in their language and says the
 * same things.
 */
export function detailTiles(id: string, lang: Lang, art: DetailArt | undefined = detailPages[id]): DetailTile[] {
  const total = art?.pages?.[lang]
  if (!art || !total || total <= 0 || !(art.w > 0)) return []

  const tiles: DetailTile[] = []
  for (let top = 0, n = 0; top < total; top += TILE_H, n += 1) {
    tiles.push({
      src: `/products/${id}/detail/${lang}/${n}.webp`,
      w: art.w,
      h: Math.min(TILE_H, total - top),
    })
  }
  return tiles
}
