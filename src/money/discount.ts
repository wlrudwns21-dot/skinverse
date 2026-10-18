/**
 * How far under the list price we are, as a whole percent.
 *
 * Every brand in the shop sells below the duty-free list — AESTURA by 20%,
 * ANUA and AHC by 40%, d'Alba by a different amount on each product — and
 * none of it was visible until the list price had somewhere to live. This is
 * the one place that decides whether a discount is shown at all, so that the
 * struck-through price and the percentage can never disagree: both come from
 * this returning a number, and both are absent when it returns null.
 *
 * It is display only. Nothing is charged at the list price and an order
 * records the sale price, so this can be wrong in only one direction — it can
 * fail to show a discount that exists. It cannot overcharge anyone.
 */
export function offPercent(price: number, list: number | null | undefined): number | null {
  if (!Number.isFinite(price) || price <= 0) return null

  // Absent, zero, or not above the sale price. Zero is the live case rather
  // than a theoretical one: REJURAN's discounted prices were never captured,
  // so those two products are sold at list and have nothing to strike
  // through. "0% off" would be a claim, not a blank.
  if (!list || !Number.isFinite(list) || list <= price) return null

  const off = Math.round((1 - price / list) * 100)

  // Below one percent, rounding has already turned it into either a lie or a
  // zero. A ₩200 difference on a $20 product is not a sale.
  return off >= 1 ? off : null
}
