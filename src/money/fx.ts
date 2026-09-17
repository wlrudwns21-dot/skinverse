/**
 * One price, several currencies.
 *
 * The shop is priced in won, because that is what the business buys and sells
 * in. The server settles in dollars, because that is what PayPal is told to
 * charge. A customer in Bangkok would rather see baht than either.
 *
 * So there are two conversions and it matters which is which:
 *
 *   authoring   ₩ → $   happens in the database, once, when a price is saved
 *   display     $ → ฿   happens here, every render, and changes nothing real
 *
 * Nothing in this file may ever decide what somebody is charged. It turns a
 * number the server already committed to into a number a human can read, and
 * the checkout says out loud which of the two is the actual bill.
 */

export interface FxRate {
  code: string
  label: string
  symbol: string
  /** One unit of this currency is worth this many won. */
  krwPerUnit: number
  decimals: number
}

export type FxRates = Record<string, FxRate>

/** The currency the server settles in. Every amount it returns is in this. */
export const SETTLEMENT = 'USD'

/**
 * What the shop falls back to before the rates load, or if they fail to.
 *
 * Deliberately just the settlement currency at 1:1. Showing a price converted
 * at a guessed rate is worse than showing the dollar price — one is unfamiliar,
 * the other is wrong.
 */
export const FALLBACK_RATES: FxRates = {
  USD: { code: 'USD', label: '미국 달러', symbol: '$', krwPerUnit: 1400, decimals: 2 },
}

/**
 * Convert an amount from the settlement currency into `code`.
 *
 * Returns null when it cannot be done honestly — an unknown currency, a
 * missing settlement rate, a nonsensical zero. The caller then shows the
 * settlement amount rather than a fabricated one.
 */
export function convert(amount: number, rates: FxRates, code: string): number | null {
  if (!Number.isFinite(amount)) return null
  if (code === SETTLEMENT) return amount

  const from = rates[SETTLEMENT]
  const to = rates[code]
  if (!from || !to || from.krwPerUnit <= 0 || to.krwPerUnit <= 0) return null

  return (amount * from.krwPerUnit) / to.krwPerUnit
}

/**
 * Round the way the currency is written.
 *
 * Won has no minor unit, so ₩39,200.47 is not a real price — it is a
 * conversion artefact. Baht and yuan keep their two places.
 */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/** `$28.00`, `₩39,200`, `฿980.00` — symbol in front, grouped, no currency code. */
export function format(value: number, rate: FxRate): string {
  const rounded = roundTo(value, rate.decimals)
  const body = rounded.toLocaleString('en-US', {
    minimumFractionDigits: rate.decimals,
    maximumFractionDigits: rate.decimals,
  })
  // A negative amount reads better as −₩1,200 than as ₩−1,200.
  return rounded < 0 ? '−' + rate.symbol + body.replace('-', '') : rate.symbol + body
}

/**
 * The one function the screens call: a settlement amount, as the customer's
 * money.
 *
 * Falls back to the settlement currency rather than failing, because a price
 * that does not render is worse than a price in the wrong currency.
 */
export function display(amount: number, rates: FxRates, code: string): string {
  const rate = rates[code]
  const converted = rate ? convert(amount, rates, code) : null
  if (rate && converted != null) return format(converted, rate)

  const settle = rates[SETTLEMENT] ?? FALLBACK_RATES[SETTLEMENT]
  return format(amount, settle)
}

/**
 * Is this currency merely displayed, or is it what the card is billed in?
 *
 * The checkout has to say so. Quoting ฿1,372 and then billing $37.60 without a
 * word is how a customer decides they have been overcharged by the difference
 * between two rounding conventions.
 */
export const isSettlement = (code: string): boolean => code === SETTLEMENT
