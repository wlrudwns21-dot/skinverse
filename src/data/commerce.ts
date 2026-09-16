/**
 * SAMPLE DATA — commercial rules.
 * These mirror the knobs the admin console exposes under 미션 · 포인트 설정.
 */

export type ShipMethod = 'dhl' | 'ems'

/**
 * The seed rates, and only the seed rates.
 *
 * The live figures come from the `shipping_methods` table via the catalog,
 * because `place_order` charges from that table — a fee hard-coded here would
 * quote the customer one price and bill another the day an operator changes it.
 * These rows are what the app shows before the first query lands.
 */
export const shipping: Record<ShipMethod, { label: string; fee: number; eta: string }> = {
  dhl: { label: 'DHL Express', fee: 12, eta: 'Sep 17 – Sep 19' },
  ems: { label: 'K-Packet/EMS', fee: 8, eta: 'Sep 21 – Sep 28' },
}

export const pointsRules = {
  /** Points granted per $1 spent. */
  earnPerDollar: 5,
  /** Share of the order total that points may cover, 0–1. */
  useCap: 0.3,
  /** Points per $1 of discount when spending them. */
  pointsPerDollar: 100,
}

/** The PayPal sandbox account shown in the payment modal. */
export const paypalSandboxAccount = 'sb-buyer@skinverse.test'
