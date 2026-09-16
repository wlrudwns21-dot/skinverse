import { describe, expect, it } from 'vitest'
import { orderStatusMeta, orderStatusOrder } from './admin'
import { isPaymentLocked, PAYMENT_LOCKED, type OrderStatus } from './types'
import { dictionaries, langOptions } from '../i18n'

/**
 * The rules that keep an order's status honest.
 *
 * All three of these were easy to break by adding one line somewhere else: a
 * new status with no label renders blank, a payment status added to the
 * operator's dropdown offers a click the database will refuse, and a missing
 * translation leaves a refunded order telling a customer it is on its way.
 */

const ALL: OrderStatus[] = [
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'partly_refunded',
  'refunded',
  'reversed',
  'payment_failed',
]

describe('order status', () => {
  it('labels every status', () => {
    for (const st of ALL) {
      const meta = orderStatusMeta[st]
      expect(meta, `no label for ${st}`).toBeDefined()
      expect(meta[0].length).toBeGreaterThan(0)
    }
  })

  /*
   * The important one.
   *
   * `reverse_checkout` is the only thing allowed to write these, and a trigger
   * in the database enforces it. If one ever appears in this dropdown the
   * operator gets an option that always fails — and, worse, the belief that
   * they can mark an order refunded without a refund having happened.
   */
  it('never offers a payment state in the operator dropdown', () => {
    for (const st of orderStatusOrder) {
      expect(isPaymentLocked(st), `${st} must not be operator-selectable`).toBe(false)
    }
  })

  it('locks exactly the four states the webhook owns', () => {
    expect([...PAYMENT_LOCKED].sort()).toEqual(
      ['partly_refunded', 'payment_failed', 'refunded', 'reversed'],
    )
    expect(isPaymentLocked('paid')).toBe(false)
    expect(isPaymentLocked('cancelled')).toBe(false)
  })

  it('every fulfilment state is selectable', () => {
    expect(orderStatusOrder).toEqual(['paid', 'preparing', 'shipped', 'delivered', 'cancelled'])
  })

  /*
   * My page reads `t.orderState[status]` to replace "배송 중" when an order has
   * been unwound. A locale missing a key would fall through to undefined and
   * render nothing at all where the refund notice should be.
   */
  it('translates every unwound state in every language', () => {
    const needed = [...PAYMENT_LOCKED, 'cancelled'] as const
    for (const { value } of langOptions) {
      const t = dictionaries[value]
      for (const key of needed) {
        const label = t.orderState[key as keyof typeof t.orderState]
        expect(label, `${value} is missing orderState.${key}`).toBeTruthy()
      }
    }
  })
})
