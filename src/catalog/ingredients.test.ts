import { describe, expect, it } from 'vitest'
import {
  INGREDIENT_PREVIEW,
  ingredientPreview,
  ingredientsFor,
  needsCollapse,
} from './ingredients'

const KO = '정제수, 글리세린, 나이아신아마이드, 트라넥사믹애씨드, 부틸렌글라이콜'
const EN = 'Water, Glycerin, Niacinamide, Tranexamic Acid, Butylene Glycol'
const ZH = '水、甘油、烟酰胺、凝血酸、丁二醇'

describe('which ingredient list a reader gets', () => {
  it('gives each reader the list the maker published for them', () => {
    const src = { ko: KO, inci: EN, extra: { zh: ZH } }
    expect(ingredientsFor('ko', src)).toEqual({ text: KO, shownIn: 'ko', isFallback: false })
    expect(ingredientsFor('en', src)).toEqual({ text: EN, shownIn: 'en', isFallback: false })
    expect(ingredientsFor('zh', src)).toEqual({ text: ZH, shownIn: 'zh', isFallback: false })
  })

  it('falls back to INCI, and says so', () => {
    // Thai is the case that prompted all of this: no maker published a Thai
    // ingredient list for anything in the catalogue, so every Thai reader
    // lands here. What they must not get is Korean.
    const src = { ko: KO, inci: EN, extra: { zh: ZH } }
    expect(ingredientsFor('th', src)).toEqual({ text: EN, shownIn: 'en', isFallback: true })
  })

  it('never falls back to Korean for a reader who did not ask for it', () => {
    // A wall of hangul in the middle of a Thai page is not information.
    const koOnly = { ko: KO, inci: '' }
    expect(ingredientsFor('th', koOnly)).toBeNull()
    expect(ingredientsFor('zh', koOnly)).toBeNull()
    expect(ingredientsFor('en', koOnly)).toBeNull()
    expect(ingredientsFor('ko', koOnly)?.text).toBe(KO)
  })

  it('treats whitespace as nothing', () => {
    expect(ingredientsFor('zh', { ko: KO, inci: EN, extra: { zh: '   ' } })?.isFallback).toBe(true)
    expect(ingredientsFor('ko', { ko: '  ', inci: '  ' })).toBeNull()
  })

  it('shows nothing at all rather than an empty heading', () => {
    expect(ingredientsFor('ko', { ko: '', inci: '' })).toBeNull()
  })
})

describe('folding a long list away', () => {
  it('leaves a short list alone', () => {
    expect(needsCollapse(KO)).toBe(false)
    expect(ingredientPreview(KO)).toBe(KO)
  })

  it('cuts a long list at an ingredient boundary, not mid-word', () => {
    const long = Array.from({ length: 60 }, (_, i) => `성분${i}하이알루로네이트`).join(', ')
    expect(needsCollapse(long)).toBe(true)
    const cut = ingredientPreview(long)
    expect(cut.endsWith('…')).toBe(true)
    // The last thing before the ellipsis is a whole ingredient name.
    const last = cut.slice(0, -1).split(', ').at(-1)!
    expect(long.split(', ')).toContain(last)
    expect(cut.length).toBeLessThanOrEqual(INGREDIENT_PREVIEW + 1)
  })

  it('cuts a Chinese list on its own separator', () => {
    // Chinese ingredient lists use the ideographic comma, so splitting on a
    // Latin comma would find no boundary and chop a character in half.
    const long = Array.from({ length: 60 }, (_, i) => `透明质酸钠${i}`).join('、')
    const cut = ingredientPreview(long)
    expect(cut.endsWith('…')).toBe(true)
    expect(cut).not.toContain(',')
    const last = cut.slice(0, -1).split('、').at(-1)!
    expect(long.split('、')).toContain(last)
  })

  it('does not collapse a list that is barely over the line', () => {
    // Hiding two ingredients behind a tap costs more than it saves.
    const just = 'x'.repeat(INGREDIENT_PREVIEW + 10)
    expect(needsCollapse(just)).toBe(false)
  })
})
