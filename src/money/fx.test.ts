import { describe, expect, it } from 'vitest'
import { convert, display, format, isSettlement, roundTo, type FxRates } from './fx'

/**
 * Pinned to the rates actually seeded in the database, so a change to either
 * side has to be a deliberate change to both.
 */
const RATES: FxRates = {
  KRW: { code: 'KRW', label: '대한민국 원', symbol: '₩', krwPerUnit: 1, decimals: 0 },
  USD: { code: 'USD', label: '미국 달러', symbol: '$', krwPerUnit: 1400, decimals: 2 },
  CNY: { code: 'CNY', label: '중국 위안', symbol: '¥', krwPerUnit: 195, decimals: 2 },
  THB: { code: 'THB', label: '태국 바트', symbol: '฿', krwPerUnit: 40, decimals: 2 },
}

describe('currency conversion', () => {
  it('leaves the settlement currency alone', () => {
    // Not merely "returns the same number" — it must not round-trip through
    // won and come back a cent short.
    expect(convert(37.6, RATES, 'USD')).toBe(37.6)
  })

  it('converts a dollar price to won', () => {
    // $28 at 1,400₩/$ is the price the operator actually typed.
    expect(convert(28, RATES, 'KRW')).toBe(39200)
  })

  it('converts through won to a third currency', () => {
    // $28 → ₩39,200 → ฿980
    expect(convert(28, RATES, 'THB')).toBe(980)
    // $28 → ₩39,200 → ¥201.03
    expect(roundTo(convert(28, RATES, 'CNY')!, 2)).toBe(201.03)
  })

  it('refuses rather than guessing for a currency it has no rate for', () => {
    expect(convert(28, RATES, 'EUR')).toBeNull()
  })

  it('refuses when a rate is zero or negative', () => {
    const broken: FxRates = { ...RATES, THB: { ...RATES.THB, krwPerUnit: 0 } }
    expect(convert(28, broken, 'THB')).toBeNull()
  })
})

describe('formatting', () => {
  it('drops the minor unit for won', () => {
    // ₩39,200.00 is not a price anyone writes.
    expect(format(39200, RATES.KRW)).toBe('₩39,200')
  })

  it('rounds a converted won amount to a whole won', () => {
    expect(display(37.6, RATES, 'KRW')).toBe('₩52,640')
  })

  it('keeps two places for dollars and groups thousands', () => {
    expect(format(1234.5, RATES.USD)).toBe('$1,234.50')
  })

  it('puts the minus sign before the symbol', () => {
    // −$2.40, not $−2.40, because the discount line reads as a subtraction.
    expect(format(-2.4, RATES.USD)).toBe('−$2.40')
  })
})

describe('display falls back rather than failing', () => {
  it('shows the settlement amount for an unknown currency', () => {
    expect(display(37.6, RATES, 'EUR')).toBe('$37.60')
  })

  it('still renders when only the settlement rate is known', () => {
    const only: FxRates = { USD: RATES.USD }
    expect(display(37.6, only, 'THB')).toBe('$37.60')
  })
})

describe('what the customer is actually billed', () => {
  it('knows which currency is real', () => {
    expect(isSettlement('USD')).toBe(true)
    expect(isSettlement('KRW')).toBe(false)
    expect(isSettlement('THB')).toBe(false)
  })
})
