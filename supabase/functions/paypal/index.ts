import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsFor } from './cors.ts'
import {
  amountString,
  captureOrder,
  createOrder,
  IS_LIVE,
  isConfigured,
  PayPalError,
  verifyWebhook,
} from './paypal.ts'

/**
 * Payment, server side.
 *
 * Three jobs, and the split matters:
 *
 *   create   tell PayPal what to charge — for an amount read out of our own
 *            database, never one the browser sent
 *   capture  take the money, then settle the order
 *   webhook  the same settlement, triggered by PayPal instead of the browser
 *
 * The webhook is not a nicety. A customer who pays and immediately closes the
 * tab never reaches step two, and without the webhook their money is taken and
 * their order stays pending for ever. Both paths call the same idempotent
 * `settle_checkout`, so whichever arrives first wins and the other is a no-op.
 *
 * What this never does is trust a number from the client. The browser sends an
 * order number; everything financial is looked up.
 */

/** Prices throughout the app are USD. */
const CURRENCY = 'USD'

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

interface OrderRow {
  id: string
  order_no: string
  user_id: string | null
  total: string
  status: string
  payment_order_id: string | null
}

Deno.serve(async (req) => {
  const cors = corsFor(req)
  const url = new URL(req.url)
  const isWebhook = url.pathname.endsWith('/webhook')

  if (req.method === 'OPTIONS') {
    const permitted = 'Access-Control-Allow-Origin' in cors
    return new Response(permitted ? 'ok' : 'origin_not_allowed', {
      status: permitted ? 200 : 403,
      headers: cors,
    })
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_misconfigured' }, 500, cors)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  if (!isConfigured) {
    return json(
      { error: 'paypal_not_configured', message: '결제가 아직 연결되지 않았습니다.' },
      501,
      cors,
    )
  }

  // ── webhook ──────────────────────────────────────────────────────────────
  // No JWT here — PayPal has no session. The signature is the authentication,
  // and it is checked before a single byte of the body is acted on.
  if (isWebhook) {
    const raw = await req.text()

    if (!(await verifyWebhook(req.headers, raw))) {
      // Loud, because the only two explanations are a misconfigured
      // PAYPAL_WEBHOOK_ID or somebody probing the endpoint — and the second
      // one is someone trying to mark orders paid for free.
      console.error('rejected a webhook that did not verify')
      return json({ error: 'bad_signature' }, 401, cors)
    }

    let event: Record<string, unknown>
    try {
      event = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return json({ error: 'bad_json' }, 400, cors)
    }

    const type = String(event.event_type ?? '')
    const resource = (event.resource ?? {}) as Record<string, unknown>

    // `custom_id` is the order number we set when creating the order — the only
    // link back to us that survives the customer's browser being gone.
    const orderNo =
      (typeof resource.custom_id === 'string' && resource.custom_id) ||
      (typeof resource.invoice_id === 'string' && resource.invoice_id) ||
      null

    if (type !== 'PAYMENT.CAPTURE.COMPLETED' && type !== 'CHECKOUT.ORDER.APPROVED') {
      // Acknowledged and ignored. Returning an error would make PayPal retry
      // an event we were never going to act on.
      return json({ ok: true, ignored: type }, 200, cors)
    }

    if (type === 'CHECKOUT.ORDER.APPROVED') {
      // Approved is not paid. Capture is what moves money, and the browser is
      // normally the one to ask for it.
      return json({ ok: true, ignored: type }, 200, cors)
    }

    if (!orderNo) {
      console.error('capture webhook carried no custom_id', JSON.stringify(resource).slice(0, 400))
      return json({ ok: true, ignored: 'no_order_ref' }, 200, cors)
    }

    // On a capture event the PayPal order id is nested under
    // supplementary_data.related_ids, not at the top level — `resource.id` is
    // the capture's own id.
    const related = ((resource.supplementary_data ?? {}) as Record<string, unknown>)
      .related_ids as Record<string, unknown> | undefined
    const paypalOrderId = typeof related?.order_id === 'string' ? related.order_id : null

    const { data, error } = await admin.rpc('settle_checkout', {
      p_order_no: orderNo,
      p_provider: 'paypal',
      p_order_id: paypalOrderId,
      p_capture_id: typeof resource.id === 'string' ? resource.id : null,
    })
    if (error) {
      console.error('settle_checkout failed from webhook', error.message)
      // 500 so PayPal retries — this one is worth being redelivered.
      return json({ error: 'settle_failed' }, 500, cors)
    }

    const row = (data ?? {}) as Record<string, unknown>
    if (row.conflict === 'cancelled') {
      console.error(`ORPHANED PAYMENT: ${orderNo} was cancelled but PayPal captured it. Refund needed.`)
    }
    return json({ ok: true }, 200, cors)
  }

  // ── everything else needs a member ───────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  let userId: string | null = null
  if (token) {
    const { data } = await admin.auth.getUser(token)
    userId = data.user?.id ?? null
  }
  if (!userId) return json({ error: 'members_only' }, 401, cors)

  let body: { action?: string; orderNo?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json({ error: 'bad_request' }, 400, cors)
  }

  const orderNo = typeof body.orderNo === 'string' ? body.orderNo : ''
  if (!orderNo) return json({ error: 'order_required' }, 400, cors)

  // The ownership check. Without it, one member could pay for — or capture —
  // another member's order by guessing an order number.
  const { data: orderRow, error: readError } = await admin
    .from('orders')
    .select('id, order_no, user_id, total, status, payment_order_id')
    .eq('order_no', orderNo)
    .maybeSingle()

  if (readError) {
    console.error('could not read the order', readError.message)
    return json({ error: 'unavailable' }, 503, cors)
  }
  const order = orderRow as OrderRow | null
  if (!order || order.user_id !== userId) return json({ error: 'no_such_order' }, 404, cors)

  try {
    // ── create ─────────────────────────────────────────────────────────────
    if (body.action === 'create') {
      if (order.status !== 'pending') return json({ error: 'not_pending' }, 409, cors)

      // Re-entrant: a customer who reloads mid-payment gets the same PayPal
      // order rather than a second one against the same reserved stock.
      if (order.payment_order_id) {
        return json({ ok: true, id: order.payment_order_id, reused: true }, 200, cors)
      }

      const created = await createOrder({
        orderNo: order.order_no,
        total: order.total,
        currency: CURRENCY,
        description: `Skinverse ${order.order_no}`,
      })

      const { error: saveError } = await admin
        .from('orders')
        .update({ payment_provider: 'paypal', payment_order_id: created.id })
        .eq('id', order.id)
      if (saveError) {
        // The PayPal order exists but we cannot recognise its webhook later.
        // Better to fail now than to take money we cannot attribute.
        console.error('could not record the paypal order id', saveError.message)
        return json({ error: 'unavailable' }, 503, cors)
      }

      return json({ ok: true, id: created.id }, 200, cors)
    }

    // ── capture ────────────────────────────────────────────────────────────
    if (body.action === 'capture') {
      if (!order.payment_order_id) return json({ error: 'not_started' }, 409, cors)

      const result = await captureOrder(order.payment_order_id)

      if (result.status !== 'COMPLETED') {
        return json({ error: 'not_completed', status: result.status }, 402, cors)
      }

      // What PayPal took, against what we asked for. A mismatch means
      // something is wrong with our own request and must not be settled
      // quietly — the customer may have been charged the wrong amount.
      const expected = amountString(order.total)
      if (result.capturedAmount && result.capturedAmount !== expected) {
        console.error(
          `AMOUNT MISMATCH on ${order.order_no}: expected ${expected} ${CURRENCY}, ` +
            `captured ${result.capturedAmount} ${result.currency}`,
        )
        return json({ error: 'amount_mismatch' }, 500, cors)
      }

      const { data, error } = await admin.rpc('settle_checkout', {
        p_order_no: order.order_no,
        p_provider: 'paypal',
        p_order_id: order.payment_order_id,
        p_capture_id: result.captureId,
      })
      if (error) {
        // The money is taken and the order is not settled. The webhook will
        // retry this, which is exactly why the webhook exists.
        console.error('settle_checkout failed after a successful capture', error.message)
        return json({ error: 'settle_failed' }, 500, cors)
      }

      const row = (data ?? {}) as Record<string, unknown>
      return json(
        {
          ok: true,
          orderNo: order.order_no,
          alreadySettled: row.alreadySettled === true,
          conflict: row.conflict ?? null,
          pointsEarned: row.pointsEarned ?? 0,
        },
        200,
        cors,
      )
    }

    return json({ error: 'unknown_action' }, 400, cors)
  } catch (err) {
    if (err instanceof PayPalError) {
      console.error(`[paypal${IS_LIVE ? '' : ' sandbox'}]`, err.message)
      return json({ error: 'paypal_failed', message: err.userMessage }, err.status, cors)
    }
    console.error('unexpected failure', err)
    return json({ error: 'unexpected' }, 500, cors)
  }
})
