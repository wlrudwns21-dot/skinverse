import { describe, expect, it } from 'vitest'
import type { Lang } from './types'
import {
  ageOn,
  dialCodeFor,
  dialCodes,
  dialKey,
  genders,
  isBirthDate,
  isCustomsCode,
  isPhone,
  MAX_AGE,
  MIN_AGE,
  normaliseCustomsCode,
  normalisePhone,
} from './signup'

const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']
const TODAY = new Date(2026, 8, 16) // 2026-09-16, local

describe('dialling codes', () => {
  it('names every country in every language', () => {
    for (const d of dialCodes) {
      for (const lang of LANGS) expect(d.name[lang], `${d.iso} ${lang}`).toBeTruthy()
    }
  })

  it('writes every code with a leading +', () => {
    for (const d of dialCodes) expect(d.code, d.iso).toMatch(/^\+\d{1,4}$/)
  })

  /**
   * The US and Canada share +1, so a list keyed on the code alone would
   * collapse them into one option — and React would warn about the duplicate.
   */
  it('keys on country rather than code, so +1 is not two of the same', () => {
    const plusOne = dialCodes.filter((d) => d.code === '+1')
    expect(plusOne.length).toBeGreaterThan(1)
    const keys = dialCodes.map(dialKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('preselects from the country already chosen on the form', () => {
    expect(dialCodeFor('South Korea')).toBe('+82')
    expect(dialCodeFor('Thailand')).toBe('+66')
    expect(dialCodeFor('united kingdom')).toBe('+44')
  })

  it('falls back to the home market for a country it does not carry', () => {
    expect(dialCodeFor('Atlantis')).toBe('+82')
  })
})

describe('phone numbers', () => {
  it('accepts the punctuation people actually type', () => {
    expect(isPhone('010-1234-5678')).toBe(true)
    expect(isPhone('(02) 555 0199')).toBe(true)
    expect(isPhone('20 7946 0958')).toBe(true)
  })

  it('rejects letters and empty input', () => {
    expect(isPhone('call me')).toBe(false)
    expect(isPhone('')).toBe(false)
    expect(isPhone('   ')).toBe(false)
  })

  /** Loose on purpose: thirty countries write numbers thirty ways. */
  it('bounds the digit count rather than the shape', () => {
    expect(isPhone('12345')).toBe(false)
    expect(isPhone('123456')).toBe(true)
    expect(isPhone('123456789012345')).toBe(true)
    expect(isPhone('1234567890123456')).toBe(false)
  })

  /**
   * The trunk 0 is dropped once a dialling code is in front: 010-1234-5678
   * dialled from abroad is +82 10 1234 5678, and storing the 0 makes the
   * stored number unreachable.
   */
  it('strips punctuation and the trunk zero', () => {
    expect(normalisePhone('010-1234-5678')).toBe('1012345678')
    expect(normalisePhone('(02) 555 0199')).toBe('25550199')
    expect(normalisePhone('7700 900123')).toBe('7700900123')
  })
})

describe('birth dates', () => {
  it('counts an age that has already had its birthday this year', () => {
    expect(ageOn('2000-01-15', TODAY)).toBe(26)
  })

  it('does not count a birthday still to come', () => {
    expect(ageOn('2000-12-15', TODAY)).toBe(25)
  })

  it('counts the birthday itself', () => {
    expect(ageOn('2000-09-16', TODAY)).toBe(26)
    expect(ageOn('2000-09-17', TODAY)).toBe(25)
  })

  /** `new Date(2026, 1, 30)` silently becomes 2 March, so it is checked back. */
  it('rejects a day that does not exist', () => {
    expect(ageOn('2026-02-30', TODAY)).toBeNull()
    expect(ageOn('2001-02-29', TODAY)).toBeNull()
    expect(ageOn('2000-02-29', TODAY)).toBe(26) // 2000 was a leap year
  })

  it('rejects anything that is not a date', () => {
    expect(ageOn('', TODAY)).toBeNull()
    expect(ageOn('2000-1-5', TODAY)).toBeNull()
    expect(ageOn('tomorrow', TODAY)).toBeNull()
  })

  it('rejects a date in the future', () => {
    expect(ageOn('2027-01-01', TODAY)).toBeNull()
  })

  it('holds the floor and the ceiling', () => {
    const born = (age: number) => `${TODAY.getFullYear() - age}-01-01`
    expect(isBirthDate(born(MIN_AGE - 1), TODAY)).toBe(false)
    expect(isBirthDate(born(MIN_AGE), TODAY)).toBe(true)
    expect(isBirthDate(born(MAX_AGE), TODAY)).toBe(true)
    expect(isBirthDate(born(MAX_AGE + 1), TODAY)).toBe(false)
  })
})

describe('the customs clearance code', () => {
  /**
   * Optional is the whole point: a customer who came for the analysis has no
   * parcel to clear, and one shopping from outside Korea has no use for it.
   */
  it('treats an empty value as valid', () => {
    expect(isCustomsCode('')).toBe(true)
    expect(isCustomsCode('   ')).toBe(true)
  })

  it('accepts P followed by twelve digits, in either case', () => {
    expect(isCustomsCode('P123456789012')).toBe(true)
    expect(isCustomsCode('p123456789012')).toBe(true)
  })

  it('rejects a filled-in value of the wrong shape', () => {
    expect(isCustomsCode('P12345678901')).toBe(false)
    expect(isCustomsCode('P1234567890123')).toBe(false)
    expect(isCustomsCode('123456789012')).toBe(false)
    expect(isCustomsCode('PABCDEFGHIJKL')).toBe(false)
  })

  it('stores it upper-cased and trimmed', () => {
    expect(normaliseCustomsCode('  p123456789012 ')).toBe('P123456789012')
  })
})

describe('gender', () => {
  it('translates every option', () => {
    for (const g of genders) {
      for (const lang of LANGS) expect(g.label[lang], `${g.key} ${lang}`).toBeTruthy()
    }
  })

  /** A form that makes the question unavoidable decides for the person. */
  it('offers a way to decline', () => {
    expect(genders.some((g) => g.key === 'undisclosed')).toBe(true)
  })
})
