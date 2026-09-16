import { supabase } from '../lib/supabase'

/**
 * The browser half of payment.
 *
 * It knows three things: the client id (public by design), how to load the
 * SDK, and how to ask our own server to do anything that involves money. It
 * never sees an amount it could change — the edge function reads the total out
 * of the order row, and this file only ever sends an order number.
 */

/** Public. PayPal client ids are read off the page by anyone who looks. */
export const CLIENT_ID = (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim()

/**
 * Off until a client id is configured.
 *
 * The checkout then shows a plain "not connected yet" notice rather than a
 * button that cannot work, which is the difference between an unfinished
 * feature and a broken one.
 */
export const paypalEnabled = CLIENT_ID.length > 0

export const CURRENCY = 'USD'

let loading: Promise<void> | null = null

/**
 * Load the PayPal SDK once.
 *
 * For anyone editing the Content-Security-Policy: this needs `www.paypal.com`
 * and `www.paypalobjects.com` in `script-src`, PayPal in `frame-src` for the
 * button and the approval window, and in `connect-src` for its own XHR. Miss
 * any of them and the button silently never renders.
 */
export function loadPaypalSdk(): Promise<void> {
  if (!paypalEnabled) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') return resolve()
    if (window.paypal) return resolve()

    const src =
      'https://www.paypal.com/sdk/js' +
      `?client-id=${encodeURIComponent(CLIENT_ID)}` +
      `&currency=${CURRENCY}` +
      '&intent=capture' +
      // Card fields and alternative methods are not wired up, so offering them
      // would produce buttons that lead nowhere.
      '&disable-funding=credit,paylater'

    const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('paypal-blocked')))
      return
    }

    const tag = document.createElement('script')
    tag.src = src
    tag.async = true
    tag.dataset.paypalSdk = 'true'
    tag.onload = () => resolve()
    tag.onerror = () => {
      loading = null
      reject(new Error('paypal-blocked'))
    }
    document.head.appendChild(tag)
  })

  return loading
}

/** Call our own payment server. Never PayPal directly. */
async function callServer(action: 'create' | 'capture', orderNo: string) {
  if (!supabase) throw new Error('not-configured')

  const { data, error } = await supabase.functions.invoke('paypal', {
    body: { action, orderNo },
  })
  if (error) {
    console.error(`[skinverse] 결제 ${action} 실패`, error.message)
    throw error
  }
  return (data ?? {}) as Record<string, unknown>
}

/**
 * Ask PayPal to open an order for one we have already reserved.
 *
 * Returns PayPal's own order id, which is what their SDK wants back from
 * `createOrder`.
 */
export async function openPaypalOrder(orderNo: string): Promise<string> {
  const res = await callServer('create', orderNo)
  const id = typeof res.id === 'string' ? res.id : ''
  if (!id) throw new Error('paypal-create-failed')
  return id
}

export interface CaptureOutcome {
  ok: boolean
  pointsEarned: number
  /** Set when the money arrived for an order that had already been cancelled. */
  conflict: string | null
}

export async function capturePaypalOrder(orderNo: string): Promise<CaptureOutcome> {
  const res = await callServer('capture', orderNo)
  return {
    ok: res.ok === true,
    pointsEarned: typeof res.pointsEarned === 'number' ? res.pointsEarned : 0,
    conflict: typeof res.conflict === 'string' ? res.conflict : null,
  }
}

/** The slice of the PayPal SDK this app uses. */
export interface PaypalButtonsApi {
  Buttons: (opts: {
    style?: Record<string, string | number>
    createOrder: () => Promise<string>
    onApprove: (data: { orderID: string }) => Promise<void>
    onCancel?: () => void
    onError?: (err: unknown) => void
  }) => {
    render: (el: HTMLElement) => Promise<void>
    close: () => void
  }
}

declare global {
  interface Window {
    paypal?: PaypalButtonsApi
  }
}
