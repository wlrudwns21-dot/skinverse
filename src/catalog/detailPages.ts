import { media } from '../lib/media'
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
  /**
   * Locales the maker exported at a width other than `w`.
   *
   * The comment above explains why the width is a fact about each product
   * rather than a constant. It turns out to be a fact about each product *and
   * locale*: the ACICA serum's Korean, English, Chinese and Thai pages came at
   * 860, and when its Japanese page arrived it was 1170 like everything else.
   *
   * Downscaling the Japanese one to 860 would have kept this simpler and
   * thrown away pixels the maker actually supplied. Declaring the wrong width
   * is the thing that must not happen — a lazily-loaded tile that reserves the
   * wrong space shoves the page around under the reader's thumb — so the
   * exception is recorded instead of flattened.
   */
  widths?: Partial<Record<Lang, number>>
}

export const detailPages: Record<string, DetailArt> = {
  'an-heartleaf77-b3zinc-serum-30': {
    w: 1170,
    pages: { en: 15668, ja: 15677, ko: 15558, th: 15568, zh: 15327 },
  },
  'da-cleantea-liposome-sun-green-50': {
    w: 1170,
    pages: { en: 15670, ja: 15542, ko: 15248, th: 15308, zh: 14768 },
  },
  'da-waterfull-toneup-sun-pink-50': {
    w: 1170,
    pages: { en: 19908, ja: 20015, ko: 19569, th: 19773, zh: 19045 },
  },
  'da-waterfull-toneup-sun-purple-50': {
    w: 1170,
    pages: { en: 12897, ja: 13052, ko: 12689, th: 12949, zh: 12473 },
  },
  'da-vita-capsule-antiaging-sun-50': {
    w: 1170,
    pages: { en: 16136, ja: 16067, ko: 15754, th: 15905, zh: 15428 },
  },
  'da-vita-toning-capsule-serum-100': {
    w: 1170,
    pages: { en: 17188, ja: 17184, ko: 16619, th: 16953, zh: 16475 },
  },
  'an-pdrn-ha-cleansing-foam-150': {
    w: 1170,
    pages: { en: 14537, ja: 14581, ko: 14462, th: 14464, zh: 14086 },
  },
  'an-niacinamide10-txa4-serum-30': {
    w: 1170,
    pages: { en: 12907, ja: 12938, ko: 12782, th: 12915, zh: 12480 },
  },
  'an-pdrn-ha-capsule100-serum-30': {
    w: 1170,
    pages: { en: 15058, ja: 15025, ko: 14912, th: 15056, zh: 14625 },
  },
  'ae-acica365-soothing-serum-40': {
    w: 860,
    // The maker sent this one's Japanese page at the usual 1170 while its
    // other four stayed at 860. Recorded rather than downscaled.
    widths: { ja: 1170 },
    pages: { en: 10494, ja: 14138, ko: 10446, th: 10502, zh: 10327 },
  },
  'ae-acica365-soothing-serum-duo': {
    w: 1170,
    pages: { en: 14277, ja: 14175, ko: 14211, th: 14324, zh: 14050 },
  },
  'ae-atobarrier365-body-lotion-400': {
    w: 1170,
    pages: { en: 14292, ja: 14331, ko: 14137, th: 14218, zh: 13752 },
  },
  'ae-atobarrier365-cream-80': {
    w: 1170,
    pages: { en: 12889, ja: 12737, ko: 12769, th: 12769, zh: 12382 },
  },
  'ae-atobarrier365-cream-mist-120': {
    w: 1170,
    pages: { en: 14599, ja: 14541, ko: 14497, th: 14617, zh: 14413 },
  },
  'ae-atobarrier365-hydro-soothing-80': {
    w: 1170,
    pages: { en: 18704, ja: 18623, ko: 18271, th: 18385, zh: 17909 },
  },
  'ae-dermauv365-mineral-40': {
    w: 1170,
    pages: { en: 15361, ja: 15187, ko: 15007, th: 15152, zh: 14828 },
  },
  'rj-dual-effect-ampoule-50': {
    w: 1170,
    pages: { en: 11700, ja: 11590, ko: 11507, th: 11697, zh: 11337 },
  },
  'rj-rebalancing-toner-120': {
    w: 1170,
    pages: { en: 11329, ja: 11286, ko: 11089, th: 11057, zh: 10787 },
  },
  'ae-regederm365-capsule-serum-30': {
    w: 1170,
    pages: { en: 17309, ja: 17158, ko: 17070, th: 17308, zh: 16819 },
  },
  'ahc-proshot-volume5-eye-cream-30': {
    w: 1170,
    pages: { en: 17527, ja: 17613, ko: 17096, th: 17275, zh: 16870 },
  },
  'ahc-proshot-volume5-intra-serum-40': {
    w: 1170,
    pages: { en: 17191, ja: 17179, ko: 16720, th: 16949, zh: 16528 },
  },
  'ahc-volume5-night-gel-50': {
    w: 1170,
    pages: { en: 16100, ja: 16233, ko: 15962, th: 15908, zh: 15618 },
  },
  'ahc-proshot-lift4-eye-cream-30': {
    w: 1170,
    pages: { en: 13820, ja: 13726, ko: 13458, th: 13494, zh: 13067 },
  },
  'ahc-proshot-bright3-eye-cream-30': {
    w: 1170,
    pages: { en: 16192, ja: 16409, ko: 15881, th: 15958, zh: 15569 },
  },
  'ahc-premium-hydra-soother-mask-5': {
    w: 1170,
    pages: { en: 12825, ja: 12791, ko: 12416, th: 12612, zh: 12222 },
  },
  'ahc-lift4-overday-night-balm-50': {
    w: 1170,
    pages: { en: 16524, ja: 16693, ko: 16281, th: 16464, zh: 16007 },
  },
  'sw-first-care-serum-vi-90-duo': {
    w: 1170,
    pages: { en: 13050, ja: 13013, ko: 12553, th: 12839, zh: 12324 },
  },
  'sw-ginseng-serum-duo': {
    w: 1170,
    pages: { en: 14524, ja: 14390, ko: 14165, th: 14218, zh: 13746 },
  },
  'sw-ginseng-serum-set': {
    w: 1170,
    pages: { en: 17630, ja: 17716, ko: 16894, th: 17210, zh: 15919 },
  },
  'sw-gentle-cleansing-foam-duo': {
    w: 1170,
    pages: { en: 11005, ja: 11152, ko: 10854, th: 10896, zh: 10587 },
  },
  'sw-ginseng-cream-rich-duo': {
    w: 1170,
    pages: { en: 15229, ja: 14815, ko: 14609, th: 14908, zh: 14184 },
  },
  'sw-pore-purifying-peeloff-mask-120': {
    w: 1170,
    pages: { en: 12606, ja: 12409, ko: 12349, th: 12345, zh: 11945 },
  },
  'cp-biogenic-essence-hydration-155': {
    w: 1170,
    pages: { en: 12949, ja: 12697, ko: 12587, th: 12652, zh: 12352 },
  },
  'cp-biogenic-essence-trio-100': {
    w: 1170,
    pages: { en: 14011, ja: 13741, ko: 13587, th: 13737, zh: 13368 },
  },
  'cp-biogenic-moisturizer-80': {
    w: 1170,
    pages: { en: 12463, ja: 12364, ko: 12167, th: 12286, zh: 11978 },
  },
  'mc-txa-capsule-cream-55': {
    w: 1170,
    pages: { en: 12471, ja: 12209, ko: 11995, th: 12006, zh: 11727 },
  },
  'mc-deep-vitac-capsule-cream-duo': {
    w: 1170,
    pages: { en: 12398, ja: 12118, ko: 11881, th: 11916, zh: 11514 },
  },
  'mc-pdrn-pink-peptide-ampoule-duo': {
    w: 1170,
    pages: { en: 11818, ja: 11333, ko: 11315, th: 11168, zh: 10881 },
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
  if (!art) return []
  const w = art.widths?.[lang] ?? art.w
  if (!total || total <= 0 || !(w > 0)) return []

  const tiles: DetailTile[] = []
  for (let top = 0, n = 0; top < total; top += TILE_H, n += 1) {
    tiles.push({
      src: media(`/products/${id}/detail/${lang}/${n}.webp`),
      w,
      h: Math.min(TILE_H, total - top),
    })
  }
  return tiles
}
