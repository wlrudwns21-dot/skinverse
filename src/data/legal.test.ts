import { describe, expect, it } from 'vitest'

import { legalDocs, terms } from './legal'
import { MIN_AGE } from './signup'

/**
 * The terms describe what the app does, so the app is what can falsify them.
 *
 * `legal.ts` opens by saying that "we do not store your face photograph" is
 * only writable because `analyze-skin` behaves that way, and that the sentence
 * becomes a lie the day the code changes. That was a warning with nothing
 * holding it up. These are the claims that can be checked from here.
 */

/** Every paragraph in a document, flattened, including tables. */
const allText = (doc: typeof terms): string =>
  doc.sections
    .flatMap((s) => [
      s.heading,
      ...s.body,
      ...(s.table ? [...s.table.head, ...s.table.rows.flat()] : []),
    ])
    .join('\n')

describe('what the terms promise and the code does', () => {
  it('states the same minimum age the signup form enforces', () => {
    // Raising MIN_AGE without touching the terms would leave the shop
    // promising to accept people it turns away, and lowering it without
    // building a guardian-consent flow would put the terms in breach of the
    // law they cite. Either way the two have to move together.
    expect(allText(terms)).toContain(`만 ${MIN_AGE}세 이상`)
    expect(MIN_AGE).toBe(14)
  })

  it('does not promise a point expiry the database cannot enforce', () => {
    // There is no expiry column anywhere in the schema, so points lapse only
    // on withdrawal. Saying otherwise would be a term we could not apply.
    const text = allText(terms)
    expect(text).toContain('유효기간을 두지 않으며')
    expect(text).toContain('회원 탈퇴 시 보유한 포인트는 즉시 소멸')
  })

  it('still refuses to call the analysis medical', () => {
    // The one claim with real consequences if it drifts.
    const text = allText(terms)
    expect(text).toContain('의료행위가 아니며')
    expect(text).toContain('의료기기가 아닙니다')
  })
})

describe('the shape of the documents', () => {
  it('numbers its clauses without a gap or a repeat', () => {
    // Inserting a clause means renumbering every one after it, which is
    // exactly the edit a person makes wrong.
    const numbers = terms.sections
      .map((s) => /^제(\d+)조/.exec(s.heading)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number)
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1))
    expect(numbers.length).toBeGreaterThanOrEqual(15)
  })

  it('has no empty paragraph in either document', () => {
    for (const doc of legalDocs) {
      for (const section of doc.sections) {
        expect(section.body.length, `${doc.id} ${section.heading}`).toBeGreaterThan(0)
        for (const p of section.body) expect(p.trim(), `${doc.id} ${section.heading}`).not.toBe('')
      }
    }
  })

  it('keeps every table rectangular', () => {
    for (const doc of legalDocs) {
      for (const section of doc.sections) {
        if (!section.table) continue
        for (const row of section.table.rows) {
          expect(row.length, `${doc.id} ${section.heading}`).toBe(section.table.head.length)
        }
      }
    }
  })
})

describe('what is still missing before this can be published', () => {
  /**
   * The unfilled fields, named.
   *
   * Three values only the business has, and the law requires two of them to
   * be displayed before a single order is taken. Pinning the list means a
   * fourth cannot appear unnoticed, and that filling one shows up here as a
   * failing test rather than as nothing at all.
   */
  it('is exactly these three, in both documents', () => {
    const open = [...legalDocs.flatMap((d) => [d.effective, allText(d)])]
      .join('\n')
      .match(/\[[^\]\n]+\]/g)
      ?.map((s) => s.replace(/\[|\]/g, ''))

    expect(new Set(open)).toEqual(
      new Set([
        '시행일: YYYY년 MM월 DD일',
        '통신판매업 신고번호 — 강남구청 신고 후 기재',
        '개인정보 보호책임자 성명 · 직책',
      ]),
    )
  })
})
