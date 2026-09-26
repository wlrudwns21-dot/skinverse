import { describe, expect, it } from 'vitest'
import { parseLabel } from './label'

describe('parseLabel', () => {
  it('returns nothing for nothing', () => {
    expect(parseLabel(null).names).toEqual([])
    expect(parseLabel('').names).toEqual([])
    expect(parseLabel('   \n  ').names).toEqual([])
  })

  it('reads a plain comma-separated list', () => {
    const { names } = parseLabel('정제수, 글리세린, 부틸렌글라이콜, 나이아신아마이드')
    expect(names).toEqual(['정제수', '글리세린', '부틸렌글라이콜', '나이아신아마이드'])
  })

  it('keeps a chemical name that contains a comma', () => {
    // The single most important rule here. Split naively, 1,2-헥산다이올 becomes
    // '1' and '2-헥산다이올', neither of which is in the register, and the
    // customer is told their product holds two unidentifiable things.
    const { names } = parseLabel('정제수, 1,2-헥산다이올, 글리세린')
    expect(names).toEqual(['정제수', '1,2-헥산다이올', '글리세린'])
  })

  it('keeps a name with several internal commas', () => {
    const { names } = parseLabel('2,4,6-트라이브로모페놀, 글리세린')
    expect(names).toEqual(['2,4,6-트라이브로모페놀', '글리세린'])
  })

  it('still splits a comma that merely follows a digit', () => {
    // '폴리솔베이트20, 글리세린' — the comma is a separator even though a digit
    // precedes it, because no digit follows.
    const { names } = parseLabel('폴리솔베이트20, 글리세린')
    expect(names).toEqual(['폴리솔베이트20', '글리세린'])
  })

  it('strips the heading labels use', () => {
    for (const heading of ['[전성분]', '전성분 :', '성분명:', '주요성분', 'Ingredients:']) {
      const { names } = parseLabel(`${heading} 정제수, 글리세린`)
      expect(names).toEqual(['정제수', '글리세린'])
    }
  })

  it('treats each line as a separator', () => {
    const { names } = parseLabel('정제수\n글리세린\n나이아신아마이드')
    expect(names).toEqual(['정제수', '글리세린', '나이아신아마이드'])
  })

  it('rejoins a name OCR broke across lines', () => {
    // A two-character tail on its own line is a break mid-word, not an
    // ingredient: there is no cosmetic ingredient called '올'.
    const { names } = parseLabel('정제수, 1,2-헥산다이\n올, 글리세린')
    expect(names).toContain('1,2-헥산다이올')
    expect(names).not.toContain('올')
  })

  it('keeps a bracketed allergen declaration intact', () => {
    // 향료(리모넨) is how a label declares the allergen inside a fragrance. The
    // register holds both this and plain 향료, so the matcher decides, not this.
    const { names } = parseLabel('정제수, 향료(리모넨), 글리세린')
    expect(names).toEqual(['정제수', '향료(리모넨)', '글리세린'])
  })

  it('keeps a name with a slash', () => {
    const { names } = parseLabel('정제수, 아크릴레이트/C10-30알킬아크릴레이트크로스폴리머')
    expect(names).toEqual(['정제수', '아크릴레이트/C10-30알킬아크릴레이트크로스폴리머'])
  })

  it('drops volumes, batch codes and label furniture', () => {
    const { names, dropped } = parseLabel(
      '전성분: 정제수, 글리세린, 50ml, 제조번호 A2024, 내용량 100g',
    )
    expect(names).toEqual(['정제수', '글리세린'])
    expect(dropped).toContain('50ml')
  })

  it('drops single stray characters OCR invents', () => {
    const { names, dropped } = parseLabel('정제수, ㅁ, 글리세린, .')
    expect(names).toEqual(['정제수', '글리세린'])
    expect(dropped).toContain('ㅁ')
  })

  it('shows a repeated ingredient once', () => {
    // Labels list a name twice when it appears in two phases of a formula.
    // Twice on screen reads as two different ingredients.
    const { names } = parseLabel('정제수, 글리세린, 정제수')
    expect(names).toEqual(['정제수', '글리세린'])
  })

  it('treats a repeat with different spacing as the same ingredient', () => {
    const { names } = parseLabel('소듐하이알루로네이트, 소듐 하이알루로네이트')
    expect(names).toHaveLength(1)
  })

  it('preserves the order the label printed', () => {
    // 화장품법 requires descending quantity above 1%, so the first names are most
    // of the product. Reordering would throw that away.
    const label = '정제수, 글리세린, 나이아신아마이드, 판테놀, 향료'
    expect(parseLabel(label).names).toEqual([
      '정제수', '글리세린', '나이아신아마이드', '판테놀', '향료',
    ])
  })

  it('survives a realistic OCR blob', () => {
    const ocr = `[전성분]
정제수, 글리세린, 부틸렌글라이콜, 1,2-헥산다이올,
나이아신아마이드, 판테놀, 세라마이드엔피, 카보머,
트로메타민, 다이소듐이디티에이, 향료(리모넨, 리날룰)
내용량 50ml`
    const { names } = parseLabel(ocr)
    expect(names).toContain('정제수')
    expect(names).toContain('1,2-헥산다이올')
    expect(names).toContain('나이아신아마이드')
    expect(names).toContain('세라마이드엔피')
    expect(names).toContain('다이소듐이디티에이')
    expect(names).not.toContain('50ml')
    // '향료(리모넨, 리날룰)' has a separating comma inside brackets. Splitting
    // there is acceptable — both halves are looked up — but neither may be empty
    // or pure punctuation.
    expect(names.every((n) => n.replace(/[^가-힣a-zA-Z0-9]/g, '').length >= 2)).toBe(true)
  })

  it('handles full-width and ideographic commas', () => {
    const { names } = parseLabel('정제수，글리세린、판테놀')
    expect(names).toEqual(['정제수', '글리세린', '판테놀'])
  })

  it('never returns an empty or whitespace-only name', () => {
    const { names } = parseLabel('정제수, , ,글리세린,,')
    expect(names).toEqual(['정제수', '글리세린'])
  })
})
