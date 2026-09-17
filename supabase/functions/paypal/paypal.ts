/**
 * The PayPal REST adapter.
 *
 * THE ONLY FILE THAT TALKS TO PAYPAL.
 *
 * It holds the secret, which is the entire reason this runs on a server: a
 * client id is public by design, a secret is not, and anything holding the
 * secret can charge cards in this merchant's name.
 */

const LIVE = 'https://api-m.paypal.com'
const SANDBOX = 'https://api-m.sandbox.paypal.com'

/**
 * Sandbox unless explicitly told otherwise.
 *
 * The safe default is the one that cannot move real money. Going live is a
 * deliberate act — setting PAYPAL_ENV=live — rather than something that happens
 * because a variable was forgotten.
 */
export const IS_LIVE = Deno.env.get('PAYPAL_ENV')?.toLowerCase() === 'live'
export const API_BASE = IS_LIVE ? LIVE : SANDBOX

const CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
const SECRET = Deno.env.get('PAYPAL_SECRET') ?? ''
export const WEBHOOK_ID = Deno.env.get('PAYPAL_WEBHOOK_ID') ?? ''

export const isConfigured = CLIENT_ID.length > 0 && SECRET.length > 0

export class PayPalError extends Error {
  constructor(
    message: string,
    /** What the customer is told. Never leaks PayPal internals. */
    readonly userMessage: string,
    readonly status = 502,
  ) {
    super(message)
    this.name = 'PayPalError'
  }
}

const RETRY = '결제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'

/**
 * The access token, cached until shortly before it expires.
 *
 * Tokens last hours; fetching one per request would double the latency of
 * every payment for nothing. Sixty seconds of headroom covers a token that
 * expires mid-flight.
 */
let cached: { token: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token

  let res: Response
  try {
    res = await fetch(`${API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${SECRET}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
  } catch (err) {
    throw new PayPalError(`token request failed: ${err}`, RETRY)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Loud on purpose: a rejected credential is an operator problem, and it
    // will otherwise present as every payment mysteriously failing.
    throw new PayPalError(
      `PAYPAL REJECTED OUR CREDENTIALS (${res.status}) — check PAYPAL_CLIENT_ID and PAYPAL_SECRET. ${body}`,
      '결제 서비스를 일시적으로 이용할 수 없습니다.',
      503,
    )
  }

  const body = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) throw new PayPalError('token response had no access_token', RETRY)

  cached = {
    token: body.access_token,
    expiresAt: Date.now() + Math.max(0, (body.expires_in ?? 0) - 60) * 1000,
  }
  return cached.token
}

async function call<T>(path: string, init: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const token = await accessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  }
  // PayPal treats a repeat of the same request id as the same request rather
  // than a second one, which is what makes a retried capture safe.
  if (init.idempotencyKey) headers['PayPal-Request-Id'] = init.idempotencyKey

  let res: Response
  try {
    res = await fetch(API_BASE + path, { ...init, headers })
  } catch (err) {
    throw new PayPalError(`network error calling ${path}: ${err}`, RETRY)
  }

  const text = await res.text()
  const body = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    throw new PayPalError(`${path} failed: ${res.status} ${text.slice(0, 500)}`, RETRY, 502)
  }
  return body as T
}

/**
 * Money, as PayPal insists on seeing it.
 *
 * Postgres numeric arrives as a string like "52.0000000000000000". PayPal
 * rejects anything that is not exactly two decimal places for USD, and a
 * mismatch between what we charge and what the order says is the one error
 * worth being pedantic about.
 */
export function amountString(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) throw new PayPalError(`bad amount: ${value}`, RETRY, 500)
  return n.toFixed(2)
}

export interface CreatedOrder {
  id: string
  status: string
}

/**
 * Create the order at PayPal for an amount we already decided.
 *
 * `custom_id` carries our own order number, which is how a webhook arriving
 * later — possibly after the customer's browser is long gone — knows which
 * order it is about.
 */
export async function createOrder(opts: {
  orderNo: string
  total: string | number
  currency: string
  description: string
}): Promise<CreatedOrder> {
  return await call<CreatedOrder>('/v2/checkout/orders', {
    method: 'POST',
    idempotencyKey: `create-${opts.orderNo}`,
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: opts.orderNo,
          custom_id: opts.orderNo,
          invoice_id: opts.orderNo,
          description: opts.description.slice(0, 127),
          amount: {
            currency_code: opts.currency,
            value: amountString(opts.total),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
          },
        },
      },
    }),
  })
}

export interface CaptureResult {
  id: string
  status: string
  captureId: string | null
  /** What PayPal says was actually taken, to check against what we asked for. */
  capturedAmount: string | null
  currency: string | null
}

export async function captureOrder(paypalOrderId: string): Promise<CaptureResult> {
  const body = await call<Record<string, unknown>>(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    { method: 'POST', idempotencyKey: `capture-${paypalOrderId}`, body: '{}' },
  )

  const units = (body.purchase_units ?? []) as Record<string, unknown>[]
  const payments = (units[0]?.payments ?? {}) as Record<string, unknown>
  const captures = (payments.captures ?? []) as Record<string, unknown>[]
  const first = captures[0] ?? {}
  const amount = (first.amount ?? {}) as Record<string, unknown>

  return {
    id: String(body.id ?? paypalOrderId),
    status: String(body.status ?? ''),
    captureId: first.id ? String(first.id) : null,
    capturedAmount: amount.value ? String(amount.value) : null,
    currency: amount.currency_code ? String(amount.currency_code) : null,
  }
}

export interface RefundResult {
  id: string
  status: string
  /** What PayPal says it actually sent back. */
  amount: string | null
  currency: string | null
}

/**
 * Send money back.
 *
 * `amount` omitted means the whole remaining capture — which is what PayPal
 * does with an empty body, and what an operator almost always means. A partial
 * refund must name its figure, and PayPal rejects anything that would take the
 * total refunded past what was captured, so over-refunding is not our bug to
 * prevent.
 *
 * The idempotency key is built from the capture and the amount rather than
 * being random: a double-clicked button sends the same request twice, and
 * PayPal treats the second as a repeat of the first instead of a second
 * refund. Two *deliberate* partial refunds of the same size need distinct
 * keys, which is what the caller's `reference` supplies.
 */
export async function refundCapture(opts: {
  captureId: string
  amount?: number | null
  currency: string
  reference: string
  note?: string
}): Promise<RefundResult> {
  const body: Record<string, unknown> = {}
  if (opts.amount != null && opts.amount > 0) {
    body.amount = { value: amountString(opts.amount), currency_code: opts.currency }
  }
  if (opts.note) body.note_to_payer = opts.note.slice(0, 255)

  const res = await call<Record<string, unknown>>(
    `/v2/payments/captures/${encodeURIComponent(opts.captureId)}/refund`,
    {
      method: 'POST',
      idempotencyKey: `refund-${opts.captureId}-${opts.reference}`,
      body: JSON.stringify(body),
    },
  )

  const amount = (res.amount ?? {}) as Record<string, unknown>
  return {
    id: String(res.id ?? ''),
    status: String(res.status ?? ''),
    amount: amount.value ? String(amount.value) : null,
    currency: amount.currency_code ? String(amount.currency_code) : null,
  }
}

/**
 * Is this webhook really from PayPal?
 *
 * Without this the webhook endpoint is an unauthenticated URL that marks
 * orders paid — anyone who found it could have the shop for free. PayPal
 * verifies the signature for us against the certificate it signed with.
 *
 * Returns false rather than throwing on a missing header: a caller who omits
 * them is not PayPal, and that is an answer, not an error.
 */
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  if (!WEBHOOK_ID) {
    console.error('PAYPAL_WEBHOOK_ID is not set — refusing to trust any webhook')
    return false
  }

  const get = (name: string) => headers.get(name) ?? headers.get(name.toLowerCase())
  const transmissionId = get('PAYPAL-TRANSMISSION-ID')
  const transmissionTime = get('PAYPAL-TRANSMISSION-TIME')
  const transmissionSig = get('PAYPAL-TRANSMISSION-SIG')
  const certUrl = get('PAYPAL-CERT-URL')
  const authAlgo = get('PAYPAL-AUTH-ALGO')

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return false
  }

  try {
    const res = await call<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: WEBHOOK_ID,
          // The event exactly as it arrived. Re-serialising a parsed object
          // can reorder keys and change the bytes the signature covers.
          webhook_event: JSON.parse(rawBody),
        }),
      },
    )
    return res.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('webhook verification call failed', err)
    return false
  }
}
