import { describe, expect, it } from 'vitest'
import { readLimit, type Fact } from './plainKorean'

/*
 * The parser against the Ministry's own corpus.
 *
 * 식약처 records 167 distinct 배합한도 blocks for Korea. These are the shapes
 * among them — every structurally different one, copied verbatim, bullets and
 * stray spaces and all. Five fixtures proved the parser worked on five fixtures;
 * this is what says it works on the register.
 *
 * The assertions are deliberately about the things that would harm a customer if
 * wrong: a ceiling that disappears, a prohibition read as a permission, a number
 * attached to the wrong kind of product.
 */

/** One per structural shape in the Korean register. */
const CORPUS: string[] = [
  // bare ceiling
  '* 배합한도 : 1%',
  '* 배합한도 : 0.001%',
  '* 배합한도 : 7.50%',
  // ceiling + an unbulleted rule on the next line — the shape that used to
  // swallow the ceiling entirely
  '* 배합한도 : 0.01%\n눈 주위 및 입술에 사용할 수 없음',
  '* 배합한도 : 0.05%\n에어로졸(스프레이에 한함) 제품에는 사용금지',
  '* 배합한도 : 0.10%\n점막에 사용되는 제품에는 사용금지',
  '* 배합한도 : 0.2%\n염모용 화장품에만 사용',
  // ceiling + a parenthetical continuation
  '* 배합한도 : 0.05%\n(다만, 제품의 pH는 6을 넘어야 함)',
  '* 배합한도 : 1.0%\n(다만, 염모용제품류에 용제로 사용할 경우에는 10%)',
  // a prohibition with no ceiling at all
  '* 배합한도 : 눈 주위 및 입술에 사용할 수 없음',
  '* 배합한도 : 점막에 사용할 수 없음',
  '* 배합한도 : 영유아용 제품류 또는 만 13세 이하 어린이가 사용할 수 있음을 특정하여 표시하는 제품에 사용할 수 없음',
  // permitted only in certain products
  '* 배합한도 : 염모용 화장품에만 사용',
  '* 배합한도 : 화장 비누에만 사용',
  '* 배합한도 : 적용 후 바로 씻어내는 제품 및 염모용 화장품에만 사용',
  // measured "as" another substance
  '* 배합한도 : 산으로서 10%',
  '* 배합한도 : 페놀로서 0.15%',
  '* 배합한도 : 징크로서 1%',
  // bulleted, per product type
  '* 배합한도 : ∙ 두발용 제품류에 1.5%\n∙ 기타 제품에는 사용금지',
  '* 배합한도 : ∙ 산화염모에 2.0 %\n∙ 기타 제품에는 사용금지',
  '* 배합한도 : ∙ 사용 후 씻어내는 제품에 1.0%, \n∙ 기타 제품에 0.5%',
  '* 배합한도 : ∙ 외음부세정제에 12%\n∙ 기타 제품에는 사용금지',
  // two ceilings inside one bullet
  '* 배합한도 : (단일성분 또는 혼합사용의 합으로서) 사용 후 씻어내는 두발용 제품류 및 두발용 염색용 제품류에 2.5%, 사용 후 씻어내지 않는 두발용 제품류 및 두발 염색용 제품류에 1.0%',
  '* 배합한도 : 로우손 0.25%, 디하이드록시아세톤 3%',
  // sections
  '* 배합한도 : <보존제>\n∙ 두발용 제품류를 제외한 화장품에 0.1%\n<기타배합한도>\n∙ 사용 후 씻어내는 제품류에 1.5%',
  '* 배합한도 : <자외선차단제>\n∙ 25%\n<비타르색소>\n* CI Number(색소) : CI 77947',
  // purity and composition requirements, which are not ceilings on use
  '* 배합한도 : 원료 중 땅콩단백질의 최대 농도는 0.5ppm을 초과하지 않아야 함',
  '* 배합한도 : 원료 중 펩타이드의 최대 평균분자량은 3.5 kDa 이하이어야 함',
  // pH requirements
  '* 배합한도 : ∙ 헤어스트레이트너 제품에 4.5%\n∙ 제모제에서 pH조정 목적으로 사용되는 경우 최종 제품의 pH는 12.7이하\n∙ 기타 제품에는 사용금지',
  // a header with nothing behind it
  '* 배합한도 :',
  // no header at all — some rows begin straight at a section
  '<기타배합한도>\n∙ 두발용 제품류에 과산화수소로서 3%\n∙ 기타 제품에는 사용금지\n<염모제>\n∙ 염모제(탈염탈색 포함)에서 과산화수소로서 7.0 %',
  // a child restriction with several exceptions
  '* 배합한도 : ∙ 사용 후 씻어내는 제품에 0.02%\n∙ 사용 후 씻어내지 않는 제품에 0.01% \n∙ 다만, 데오드란트에 배합할 경우에는 0.0075% (3세 이하 어린이 사용 금지)\n∙ 입술에 사용되는 제품, 에어로졸(스프레이에 한함) 제품, 바디로션 및 바디크림에는 사용금지\n∙ 영유아용 제품류 또는 만 13세 이하 어린이가 사용할 수 있음을 특정하여 표시하는 제품에는 사용금지(목욕용제품, 샤워젤류 및 샴푸류는 제외)',
]

/** Every percentage the Ministry wrote in a block. */
function percentsInSource(block: string): number[] {
  return [...block.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)]
    .map((m) => Number(m[1].replace(',', '.')))
    .filter((n) => Number.isFinite(n))
}

/** Every percentage the parser kept, from `percent` or from the text it wrote. */
function percentsInFacts(facts: Fact[]): number[] {
  const out: number[] = []
  for (const f of facts) {
    if (f.percent !== null) out.push(f.percent)
    for (const m of f.text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
      const n = Number(m[1].replace(',', '.'))
      if (Number.isFinite(n)) out.push(n)
    }
  }
  return out
}

describe('the Korean register, by shape', () => {
  it('parses every shape without throwing', () => {
    for (const block of CORPUS) expect(() => readLimit(block)).not.toThrow()
  })

  it('leaves almost nothing unclassified', () => {
    const facts = CORPUS.flatMap(readLimit)
    const other = facts.filter((f) => f.kind === 'other')
    // The only shape that legitimately has no category is the stray
    // `* CI Number(색소) : CI 77947` line, which is a colour index, not a rule.
    expect(other.every((f) => /CI\s*Number|CI\s*\d/.test(f.source))).toBe(true)
    expect(other.length).toBeLessThanOrEqual(1)
    // A smoke check that the corpus is actually being read, not an exact count:
    // the number moves whenever a shape is added above.
    expect(facts.length).toBeGreaterThan(50)
  })

  it('never loses a percentage the Ministry wrote', () => {
    // The bug this guards: a ceiling on one line and a prohibition on the next
    // used to merge, and the ceiling disappeared without trace.
    for (const block of CORPUS) {
      const wrote = percentsInSource(block)
      const kept = new Set(percentsInFacts(readLimit(block)))
      for (const p of wrote) {
        expect(kept.has(p), `${p}% lost from: ${block.slice(0, 60)}`).toBe(true)
      }
    }
  })

  it('keeps the ceiling and the prohibition as separate facts', () => {
    const facts = readLimit('* 배합한도 : 0.01%\n눈 주위 및 입술에 사용할 수 없음')
    expect(facts).toHaveLength(2)
    expect(facts[0].kind).toBe('limit')
    expect(facts[0].percent).toBe(0.01)
    expect(facts[1].kind).toBe('ban')
  })

  it('keeps a bracketed condition as its own fact rather than dropping it', () => {
    const facts = readLimit('* 배합한도 : 0.05%\n(다만, 제품의 pH는 6을 넘어야 함)')
    expect(facts).toHaveLength(2)
    expect(facts[0].kind).toBe('limit')
    expect(facts[0].percent).toBe(0.05)
    // The pH requirement is a rule, not an exception to the ceiling. It used to
    // be discarded for being neither a ban nor a 제외.
    expect(facts[1].kind).toBe('condition')
    expect(facts[1].text).toContain('pH')
  })

  it('keeps a second ceiling that lives inside brackets', () => {
    const facts = readLimit('* 배합한도 : 1.0%\n(다만, 염모용제품류에 용제로 사용할 경우에는 10%)')
    const limits = facts.filter((f) => f.kind === 'limit')
    expect(limits.map((f) => f.percent).sort((a, b) => (a as number) - (b as number)))
      .toEqual([1, 10])
  })

  it('reads "…에만 사용" as a restriction, not as unrecognised text', () => {
    const facts = readLimit('* 배합한도 : 염모용 화장품에만 사용')
    expect(facts).toHaveLength(1)
    expect(facts[0].kind).toBe('onlyFor')
    expect(facts[0].text).toBe('염모용 화장품에만 쓸 수 있습니다.')
  })

  it('does not read "산으로서 10%" as a product type', () => {
    const facts = readLimit('* 배합한도 : 산으로서 10%')
    expect(facts[0].scope).toBeNull()
    expect(facts[0].text).toBe('최대 10%까지 넣을 수 있습니다.')
  })

  it('carries the strictest number when one clause holds several', () => {
    const facts = readLimit(
      '* 배합한도 : (단일성분 또는 혼합사용의 합으로서) 사용 후 씻어내는 두발용 제품류 및 두발용 염색용 제품류에 2.5%, 사용 후 씻어내지 않는 두발용 제품류 및 두발 염색용 제품류에 1.0%',
    )
    expect(facts).toHaveLength(1)
    // Reporting 2.5 here would tell a customer a leave-on product may hold more
    // than twice what it may.
    expect(facts[0].percent).toBe(1)
    expect(facts[0].text).toContain('2.5%')
    expect(facts[0].text).toContain('1.0%')
  })

  it('treats purity and molecular-weight requirements as conditions', () => {
    for (const block of [
      '* 배합한도 : 원료 중 땅콩단백질의 최대 농도는 0.5ppm을 초과하지 않아야 함',
      '* 배합한도 : 원료 중 펩타이드의 최대 평균분자량은 3.5 kDa 이하이어야 함',
    ]) {
      const facts = readLimit(block)
      expect(facts[0].kind).toBe('condition')
      // Neither is a ceiling on how much may go into a formula.
      expect(facts[0].percent).toBeNull()
    }
  })

  it('handles a block that starts at a section with no 배합한도 header', () => {
    const facts = readLimit(
      '<기타배합한도>\n∙ 두발용 제품류에 과산화수소로서 3%\n∙ 기타 제품에는 사용금지\n<염모제>\n∙ 염모제(탈염탈색 포함)에서 과산화수소로서 7.0 %',
    )
    expect(facts.filter((f) => f.kind === 'purpose')).toHaveLength(2)
    expect(facts.filter((f) => f.kind === 'limit').map((f) => f.percent)).toEqual([3, 7])
  })

  it('finds both child restrictions, not just the obvious one', () => {
    const facts = readLimit(CORPUS[CORPUS.length - 1])
    const child = facts.filter((f) => f.kind === 'childBan')
    // Two, and both real: the deodorant clause bans under-threes inside its
    // brackets, and the last clause bans infant and under-13 products outright.
    // Reporting one would hide whichever was found second.
    expect(child).toHaveLength(2)
    expect(child.some((f) => f.text.includes('만 3세 이하'))).toBe(true)
    expect(child.some((f) => f.text.includes('목욕용제품, 샤워젤류 및 샴푸류'))).toBe(true)
  })

  it('every fact keeps wording traceable to the source', () => {
    for (const block of CORPUS) {
      for (const fact of readLimit(block)) {
        expect(fact.source.trim().length).toBeGreaterThan(0)
        expect(block.replace(/\s+/g, '')).toContain(fact.source.replace(/\s+/g, '').slice(0, 10))
      }
    }
  })
})
