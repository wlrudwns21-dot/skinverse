import { describe, expect, it } from 'vitest'
import { aesturaProducts } from '../data/aestura'
import { SEED_CATALOG } from './remote'

/**
 * The names the maker prints, as they appear in the Product details table of
 * each product's own detail page — and, for the sunscreen, the serum and the
 * capsule serum, on the bottle in the product photograph too.
 *
 * Checked in because they were read off artwork rather than typed from a feed:
 * if someone later "tidies" a name into something that reads better in English,
 * this is the thing that says it was never ours to tidy.
 *
 * The single ACICA serum is the one line not read off its own detail page —
 * that page is still missing. It is the duo's name without " Duo", which the
 * duo's page and the bottle both support.
 */
const OFFICIAL: Record<string, { en: string; ko: string; zh: string }> = {
  'ae-atobarrier365-cream-80': {
    en: 'Atobarrier365 Cream',
    ko: '아토베리어365 크림',
    zh: 'Atobarrier365 面霜',
  },
  'ae-atobarrier365-cream-mist-120': {
    en: 'Atobarrier365 Cream Mist',
    ko: '아토베리어365 크림미스트',
    zh: 'Atobarrier365 乳霜喷雾',
  },
  'ae-atobarrier365-hydro-soothing-80': {
    en: 'Atobarrier365 Hydro Soothing Cream',
    ko: '아토베리어365 하이드로 수딩크림',
    zh: 'Atobarrier365 水润舒缓面霜',
  },
  'ae-regederm365-capsule-serum-30': {
    en: 'Regederm365 Skin Tightening Capsule Serum',
    ko: '리제덤365 모공탄력 캡슐세럼',
    zh: 'Regederm365 毛孔弹力胶囊精华',
  },
  'ae-dermauv365-mineral-40': {
    en: 'Derma UV365 Barrier Hydro Mineral Sunscreen',
    ko: '더마UV365 장벽수분 무기자차 선크림',
    zh: 'Derma UV365 屏障水润物理防晒霜',
  },
  'ae-acica365-soothing-serum-40': {
    en: 'A-CICA365 Soothing Relief Serum pH4.5',
    ko: '에이시카365 흔적진정세럼 pH4.5',
    zh: 'A-CICA365 舒缓淡印精华 pH4.5',
  },
  'ae-acica365-soothing-serum-duo': {
    en: 'A-CICA365 Soothing Relief Serum pH4.5 Duo',
    ko: '에이시카365 흔적진정세럼 pH4.5 듀오',
    zh: 'A-CICA365 舒缓淡印精华 pH4.5 Duo',
  },
}

describe('product names match the maker', () => {
  it('carries the official name in each language', () => {
    for (const p of aesturaProducts) {
      const want = OFFICIAL[p.id]
      expect(want, `${p.id} is not in the official list`).toBeDefined()
      expect(p.name, p.id).toBe(want.en)
      expect(p.nameKo, p.id).toBe(want.ko)
      expect(p.nameZh, p.id).toBe(want.zh)
    }
  })

  it('never repeats the brand inside the name', () => {
    // `brand` is its own field and the shelf already prints "AESTURA · CREAM",
    // so a name starting with AESTURA would show it twice.
    for (const p of aesturaProducts) {
      expect(p.name.startsWith('AESTURA'), p.id).toBe(false)
      expect(p.nameKo.startsWith('에스트라'), p.id).toBe(false)
    }
  })

  it('offers Korean and Chinese to the catalogue, and falls back for the rest', () => {
    for (const p of SEED_CATALOG.products) {
      const want = OFFICIAL[p.id]
      expect(p.nameL?.ko, p.id).toBe(want.ko)
      expect(p.nameL?.zh, p.id).toBe(want.zh)
      // Thai and English both fall through to `name`: the maker's own Thai
      // page prints the English name, so there is nothing else to store.
      expect(p.nameL?.th, p.id).toBeUndefined()
      expect(p.nameL?.en, p.id).toBeUndefined()
    }
  })
})
