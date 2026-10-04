import type { Lang } from '../data/types'

/**
 * The maker's long-form detail artwork, sliced into tiles.
 *
 * ── why these are tiles and not one image ───────────────────────────────────
 *
 * A detail page is one tall picture: 1170 wide and up to 18,704 tall. That is
 * 21.9 megapixels, and iOS Safari refuses to decode an image much past 16 —
 * not with an error, but by drawing nothing. So an unsliced page is a blank
 * screen on an iPhone, which is most of the audience. Tiles of 2,000px are
 * 2.34MP each and stack with no gap, so the seam cannot be seen.
 *
 * It also means a customer who reads the top of the page downloads one tile
 * rather than the whole three megabytes.
 *
 * ── why only the page height is stored ──────────────────────────────────────
 *
 * Everything else about a tile is a consequence of `TILE_H` and the path
 * convention, and storing a derived number twice is how the two drift apart.
 * The height is the one fact that comes from the artwork itself.
 */
export const TILE_H = 2000

/** Width of every tile — 390pt at 3×, which is what the artwork was cut to. */
export const TILE_W = 1170

export interface DetailTile {
  src: string
  w: number
  h: number
}

/** Page height per locale, by product. A missing locale has no artwork. */
export type DetailHeights = Partial<Record<Lang, number>>

export const detailPages: Record<string, DetailHeights> = {
  'ae-acica365-soothing-serum-duo': { en: 14277, ko: 14211, th: 14324, zh: 14050 },
  'ae-atobarrier365-cream-80': { en: 12889, ko: 12769, th: 12769, zh: 12382 },
  'ae-atobarrier365-cream-mist-120': { en: 14599, ko: 14497, th: 14617, zh: 14413 },
  'ae-atobarrier365-hydro-soothing-80': { en: 18704, ko: 18271, th: 18385, zh: 17909 },
  'ae-dermauv365-mineral-40': { en: 15361, ko: 15007, th: 15152, zh: 14828 },
  'ae-regederm365-capsule-serum-30': { en: 17309, ko: 17070, th: 17308, zh: 16819 },
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
export function detailTiles(id: string, lang: Lang, heights: DetailHeights | undefined = detailPages[id]): DetailTile[] {
  const total = heights?.[lang]
  if (!total || total <= 0) return []

  const tiles: DetailTile[] = []
  for (let top = 0, n = 0; top < total; top += TILE_H, n += 1) {
    tiles.push({
      src: `/products/${id}/detail/${lang}/${n}.webp`,
      w: TILE_W,
      h: Math.min(TILE_H, total - top),
    })
  }
  return tiles
}
