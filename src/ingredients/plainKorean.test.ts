import { describe, expect, it } from 'vitest'
import { childWarning, headline, readLimit, restrictsChildren } from './plainKorean'

/*
 * Every block quoted here is copied verbatim from 식약처's own data, newlines
 * and U+2219 bullets and all. That is the point: a parser for official text is
 * only worth what it does to the actual official text, and a fixture I wrote
 * myself would mostly prove that I can parse my own writing.
 */

/** 살리실릭애씨드 및 그 염류 — two sections, a ceiling each, and a child ban. */
const SALICYLIC = `* 배합한도 : <보존제>
∙ 살리실릭애씨드로서 0.5%
∙ 영유아용 제품류 또는 만 13세 이하 어린이가 사용할 수 있음을 특정하여 표시하는 제품에는 사용금지(다만, 샴푸는 제외)
<기타배합한도>
∙ 인체세정용 제품류에 살리실릭애씨드로서 2%
∙ 사용 후 씻어내는 두발용 제품류에 살리실릭애씨드로서 3%
∙ 영유아용 제품류 또는 만 13세 이하 어린이가 사용할 수 있음을 특정하여 표시하는 제품에는 사용금지(다만, 샴푸는 제외)
∙ 기능성화장품의 유효성분으로 사용하는 경우에 한하며 기타 제품에는 사용금지`

/** 만수국꽃추출물 — rinse-off and leave-on side by side, plus a purity condition. */
const TAGETES = `* 배합한도 : ∙ 사용 후 씻어내는 제품에 0.1%
∙ 사용 후 씻어내지 않는 제품에 0.01%
∙ 원료 중 알파 테르티에닐(테르티오펜) 함량은 0.35% 이하
∙ 자외선 차단제품 또는 자외선을 이용한 태닝(천연 또는 인공)을 목적으로 하는 제품에는 사용금지`

/** 페녹시에탄올 — the simplest shape there is. */
const PHENOXY = `* 배합한도 : 1%`

/** 징크스테아레이트 — a real entry with a header and nothing behind it. */
const EMPTY = `* 배합한도 :`

/** 소듐하이드록사이드 — conditions about pH, no ceiling on the ingredient itself. */
const NAOH = `* 배합한도 : ∙ 손톱표피 용해 목적일 경우 5%, pH 조정 목적으로 사용되고 최종 제품이 제5조제5항에 pH기준이 정하여 있지 아니한 경우에도 최종 제품의 pH는 11이하
∙ 제모제에서 pH조정 목적으로 사용되는 경우 최종 제품의 pH는 12.7이하`

describe('readLimit', () => {
  it('returns nothing for an absent block', () => {
    expect(readLimit(null)).toEqual([])
    expect(readLimit(undefined)).toEqual([])
    expect(readLimit('')).toEqual([])
  })

  it('returns nothing when the Ministry recorded a header and no clauses', () => {
    // 징크스테아레이트 really is stored this way. An empty result must mean "no
    // ceiling recorded" and never be rendered as reassurance.
    expect(readLimit(EMPTY)).toEqual([])
  })

  it('reads a bare ceiling that shares the header line', () => {
    const facts = readLimit(PHENOXY)
    expect(facts).toHaveLength(1)
    expect(facts[0].kind).toBe('limit')
    expect(facts[0].percent).toBe(1)
    expect(facts[0].scope).toBeNull()
    expect(facts[0].text).toBe('최대 1%까지 넣을 수 있습니다.')
  })

  it('names the purpose from a section header', () => {
    const facts = readLimit(SALICYLIC)
    expect(facts[0].kind).toBe('purpose')
    expect(facts[0].text).toBe('보존제 용도로 허용된 성분입니다.')
  })

  it('does not pretend 기타배합한도 is a purpose', () => {
    // '기타배합한도 용도로 허용된 성분입니다' would be nonsense stated as fact.
    const facts = readLimit(SALICYLIC)
    const others = facts.filter((f) => f.kind === 'purpose' && f.source.includes('기타배합한도'))
    expect(others).toHaveLength(1)
    expect(others[0].text).toBe('아래는 그 밖의 용도에 대한 한도입니다.')
  })

  it('finds the child restriction and keeps its exception', () => {
    const facts = readLimit(SALICYLIC)
    const child = childWarning(facts)
    expect(child).not.toBeNull()
    expect(child?.text).toContain('영유아용 제품과 만 13세 이하 어린이용으로 표시된 제품에는 쓸 수 없습니다')
    // A parent holding a shampoo bottle needs the exception, not just the ban.
    expect(child?.text).toContain('샴푸는 예외입니다')
  })

  it('classifies the child ban as childBan rather than a plain ban', () => {
    const facts = readLimit(SALICYLIC)
    const kinds = facts.filter((f) => CHILD_SOURCE.test(f.source)).map((f) => f.kind)
    expect(kinds.every((k) => k === 'childBan')).toBe(true)
  })

  it('reads every ceiling with the products it applies to', () => {
    const facts = readLimit(SALICYLIC)
    const limits = facts.filter((f) => f.kind === 'limit')
    expect(limits.map((f) => f.percent)).toEqual([0.5, 2, 3])
    expect(limits[1].text).toContain('바디워시·클렌저 등 세정 제품')
    expect(limits[2].text).toContain('씻어내는')
  })

  it('does not mistake 살리실릭애씨드로서 for a kind of product', () => {
    // '…로서' introduces the substance the percentage is measured as, not a
    // scope. Read as a scope it would produce "살리실릭애씨드로서에는 최대…".
    const facts = readLimit(SALICYLIC)
    const first = facts.filter((f) => f.kind === 'limit')[0]
    expect(first.scope).toBeNull()
    expect(first.text).toBe('최대 0.5%까지 넣을 수 있습니다.')
  })

  it('keeps rinse-off and leave-on apart, and the right way round', () => {
    const facts = readLimit(TAGETES)
    const limits = facts.filter((f) => f.kind === 'limit')
    const rinse = limits.find((f) => f.percent === 0.1)
    const leave = limits.find((f) => f.percent === 0.01)

    expect(rinse?.text).toContain('씻어내는 제품')
    expect(rinse?.text).not.toContain('그대로 두는')
    // The stricter limit belongs to the product that stays on the skin. Getting
    // this backwards would tell someone a leave-on may hold ten times more.
    expect(leave?.text).toContain('바르고 그대로 두는 제품')
  })

  it('reads a ban with the products it applies to', () => {
    const facts = readLimit(TAGETES)
    const ban = facts.find((f) => f.kind === 'ban')
    expect(ban).toBeDefined()
    expect(ban?.text).toContain('쓸 수 없습니다')
    expect(ban?.source).toContain('자외선 차단제품')
  })

  it('keeps a purity requirement as a condition rather than a ceiling', () => {
    // '함량은 0.35% 이하' is about the raw material's composition, not how much
    // of the ingredient a formula may contain. Filed as a limit it would read as
    // a 0.35% allowance.
    const facts = readLimit(TAGETES)
    const purity = facts.find((f) => f.source.includes('테르티에닐'))
    expect(purity?.kind).toBe('condition')
    expect(purity?.percent).toBeNull()
  })

  it('keeps pH requirements without inventing a ceiling for them', () => {
    const facts = readLimit(NAOH)
    expect(facts).toHaveLength(2)
    // The first clause does name 5%, for one specific purpose.
    expect(facts[0].kind).toBe('limit')
    expect(facts[0].percent).toBe(5)
    // The second names only a pH, and must not become "최대 12.7%".
    expect(facts[1].kind).toBe('condition')
    expect(facts[1].percent).toBeNull()
    expect(facts[1].text).toContain('12.7')
  })

  it('always keeps the Ministry’s own wording', () => {
    for (const block of [SALICYLIC, TAGETES, PHENOXY, NAOH]) {
      for (const fact of readLimit(block)) {
        expect(fact.source.trim().length).toBeGreaterThan(0)
        expect(block).toContain(fact.source.split('(')[0].trim().slice(0, 12))
      }
    }
  })

  it('never silently drops a clause', () => {
    // Every bullet in the source becomes exactly one fact. A parser that skips
    // what it does not recognise would hide restrictions.
    const bullets = (SALICYLIC.match(/∙/g) ?? []).length
    // Both sections count, including <보존제>, which shares the header line.
    const sections = (SALICYLIC.match(/<[^>]+>/g) ?? []).length
    expect(bullets).toBe(6)
    expect(sections).toBe(2)
    expect(readLimit(SALICYLIC)).toHaveLength(bullets + sections)
  })

  it('handles a shape it has never seen by passing the words through', () => {
    const odd = '* 배합한도 : ∙ 완전히 새로운 형태의 문구입니다'
    const facts = readLimit(odd)
    expect(facts).toHaveLength(1)
    expect(facts[0].kind).toBe('other')
    expect(facts[0].text).toBe('완전히 새로운 형태의 문구입니다')
  })

  it('joins a clause that wrapped onto the next line', () => {
    const wrapped = `* 배합한도 : ∙ 인체세정용 제품류에 2%
(다만, 어린이용 제품은 제외)`
    const facts = readLimit(wrapped)
    expect(facts).toHaveLength(1)
    expect(facts[0].percent).toBe(2)
    expect(facts[0].text).toContain('어린이용 제품은 예외입니다')
  })
})

/** Matches the Ministry's own child-ban sentence, for checking classification. */
const CHILD_SOURCE = /영유아용 제품류 또는 만 13세 이하/

describe('headline', () => {
  it('leads with the child restriction when there is one', () => {
    expect(headline(readLimit(SALICYLIC))).toContain('어린이용으로 표시된 제품에는 쓸 수 없습니다')
  })

  it('leads with a ban when there is no child restriction', () => {
    expect(headline(readLimit(TAGETES))).toContain('쓸 수 없습니다')
  })

  it('falls back to the strictest ceiling, not the first', () => {
    const facts = readLimit(`* 배합한도 : ∙ 사용 후 씻어내는 제품에 3%
∙ 사용 후 씻어내지 않는 제품에 0.2%`)
    // Leading with 3% would understate the restriction on a leave-on product.
    expect(headline(facts)).toContain('0.2%')
  })

  it('returns null rather than inventing a summary', () => {
    expect(headline(readLimit(EMPTY))).toBeNull()
    expect(headline([])).toBeNull()
  })
})

describe('restrictsChildren', () => {
  it('is true only when the Ministry recorded a restriction', () => {
    expect(restrictsChildren(readLimit(SALICYLIC))).toBe(true)
    expect(restrictsChildren(readLimit(TAGETES))).toBe(false)
    expect(restrictsChildren(readLimit(PHENOXY))).toBe(false)
  })

  it('false means nothing was recorded, not that it is suitable', () => {
    // Documented as a test because the distinction is the whole point: 페녹시
    // 에탄올 has no child clause, and that must never be rendered as approval.
    expect(restrictsChildren(readLimit(PHENOXY))).toBe(false)
    expect(childWarning(readLimit(PHENOXY))).toBeNull()
  })
})
