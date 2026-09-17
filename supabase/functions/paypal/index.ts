import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsFor } from './cors.ts'
import {
  amountString,
  captureOrder,
  createOrder,
  IS_LIVE,
  isConfigured,
  PayPalError,
  refundCapture,
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
 *   webhook  the same settlement, triggered by PayPal instead of the browser,
 *            and everything that happens to the money afterwards
 *
 * The webhook is not a nicety. A customer who pays and immediately closes the
 * tab never reaches step two, and without the webhook their money is taken and
 * their order stays pending for ever. Both paths call the same idempotent
 * `settle_checkout`, so whichever arrives first wins and the other is a no-op.
 *
 * Money also goes back out, and only the webhook ever hears about it: a refund
 * issued from PayPal's own dashboard, a chargeback the bank forces, a capture
 * PayPal later denies. Those arrive here and nowhere else — there is no
 * browser involved and no one logged in — so if this endpoint ignores them the
 * order says `paid` for ever and the customer keeps points they earned on a
 * purchase that has been unwound.
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

/** A Supabase client with the service key. Narrowed to what this file uses. */
type Admin = ReturnType<typeof createClient>

/**
 * Money leaving again, and what each event means for the order.
 *
 * REFUNDED  we (or PayPal on our behalf) sent it back — possibly only part
 * REVERSED  the bank pulled it back; a dispute we lost
 * DENIED    the capture never really completed after all
 *
 * The distinction matters downstream: `reverse_checkout` returns spent points
 * on a refund but not on a chargeback, and puts stock back only on a denial.
 */
const REVERSALS: Record<string, 'refund' | 'reversal' | 'denied'> = {
  'PAYMENT.CAPTURE.REFUNDED': 'refund',
  'PAYMENT.CAPTURE.REVERSED': 'reversal',
  'PAYMENT.CAPTURE.DENIED': 'denied',
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/**
 * The PayPal capture id this event is about.
 *
 * On a capture event the resource *is* the capture, so `resource.id` is it. On
 * a refund the resource is the refund, and the capture it undoes is only
 * reachable through the HATEOAS `up` link — which is why this bothers with
 * link parsing at all.
 */
function captureIdOf(resource: Record<string, unknown>, isRefund: boolean): string | null {
  if (!isRefund) return str(resource.id)

  const links = (resource.links ?? []) as Record<string, unknown>[]
  for (const link of links) {
    if (String(link.rel ?? '').toLowerCase() !== 'up') continue
    const href = str(link.href)
    if (!href) continue
    const last = href.split('?')[0].split('/').filter(Boolean).pop()
    if (last) return last
  }
  return null
}

/**
 * Which of our orders is this about?
 *
 * `custom_id` is what we set at creation and is the direct answer when PayPal
 * carries it through. It does not always survive onto a refund resource, so
 * the fallback walks back through the capture id we recorded at settlement.
 * Returning null is a real outcome — an event for a payment that is not ours
 * must be acknowledged and dropped, not retried for ever.
 */
async function resolveOrderNo(
  admin: Admin,
  resource: Record<string, unknown>,
  isRefund: boolean,
): Promise<string | null> {
  const direct = str(resource.custom_id) ?? str(resource.invoice_id)
  if (direct) return direct

  const captureId = captureIdOf(resource, isRefund)
  if (!captureId) return null

  const { data, error } = await admin
    .from('orders')
    .select('order_no')
    .eq('payment_capture_id', captureId)
    .maybeSingle()

  if (error) {
    console.error('could not look up the order by capture id', error.message)
    throw new Error('lookup_failed')
  }
  return str((data as { order_no?: unknown } | null)?.order_no)
}

/** The refunded amount, or null for "all of it". */
function amountOf(resource: Record<string, unknown>): number | null {
  const amount = (resource.amount ?? {}) as Record<string, unknown>
  const raw = str(amount.value)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
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

    // ── a dispute was opened or moved ──────────────────────────────────────
    //
    // No money has moved yet, so nothing about the order changes. It is
    // recorded loudly because a dispute has a deadline: PayPal decides for us
    // if nobody responds, and an operator who never hears about it loses by
    // default. If it is ultimately lost the money leaves as a REVERSED event,
    // which is handled below.
    if (type.startsWith('CUSTOMER.DISPUTE.')) {
      const disputed = (resource.disputed_transactions ?? []) as Record<string, unknown>[]
      const captureId = str(disputed[0]?.seller_transaction_id)
      const amount = (resource.dispute_amount ?? {}) as Record<string, unknown>

      let orderNo: string | null = null
      if (captureId) {
        const { data } = await admin
          .from('orders')
          .select('order_no')
          .eq('payment_capture_id', captureId)
          .maybeSingle()
        orderNo = str((data as { order_no?: unknown } | null)?.order_no)
      }

      console.error(
        `DISPUTE ${type}: ${str(resource.dispute_id) ?? '?'} ` +
          `order=${orderNo ?? 'unknown'} status=${str(resource.status) ?? '?'}`,
      )

      await admin.from('audit_log').insert({
        actor: 'system',
        action: 'payment.dispute',
        subject: orderNo ?? (str(resource.dispute_id) ?? 'unknown'),
        detail: {
          event: type,
          disputeId: str(resource.dispute_id),
          reason: str(resource.reason),
          status: str(resource.status),
          outcome: str((resource.dispute_outcome as Record<string, unknown>)?.outcome_code),
          amount: str(amount.value),
          currency: str(amount.currency_code),
          captureId,
          note: '분쟁이 접수되었습니다. PayPal Resolution Center에서 기한 내 대응이 필요합니다.',
        },
      })

      return json({ ok: true, dispute: true }, 200, cors)
    }

    // ── the money went back out ────────────────────────────────────────────
    const kind = REVERSALS[type]
    if (kind) {
      const isRefund = kind === 'refund'

      let orderNo: string | null
      try {
        orderNo = await resolveOrderNo(admin, resource, isRefund)
      } catch {
        // The database was unreachable, not the event unrecognisable. Ask
        // PayPal to try again rather than dropping a refund on the floor.
        return json({ error: 'lookup_failed' }, 500, cors)
      }

      if (!orderNo) {
        console.error(`${type} could not be matched to an order`, JSON.stringify(resource).slice(0, 400))
        return json({ ok: true, ignored: 'no_order_ref' }, 200, cors)
      }

      const { data, error } = await admin.rpc('reverse_checkout', {
        p_order_no: orderNo,
        p_kind: kind,
        // A refund carries the amount actually returned, which may be a part
        // of the order. A reversal or denial takes the whole capture.
        p_amount: isRefund ? amountOf(resource) : null,
        // The provider's id for this event. `reverse_checkout` keys its
        // idempotency on it, so a redelivered webhook cannot claw back the
        // same points twice.
        p_ref: str(resource.id),
        p_note: `PayPal ${type}`,
      })

      if (error) {
        console.error(`reverse_checkout failed for ${orderNo}`, error.message)
        return json({ error: 'reverse_failed' }, 500, cors)
      }

      const row = (data ?? {}) as Record<string, unknown>
      if (row.ok === false) {
        // Not retryable — the order is in a state this event cannot apply to.
        // Acknowledged so PayPal stops, but recorded so somebody looks.
        console.error(`${type} for ${orderNo} was not applied: ${String(row.reason)}`)
        return json({ ok: true, ignored: row.reason }, 200, cors)
      }

      if (row.pointsShort && Number(row.pointsShort) > 0) {
        // The customer had already spent the points earned on this order. The
        // balance is not taken negative; the gap is somebody's judgement call.
        console.error(
          `POINTS SHORTFALL on ${orderNo}: could not reclaim ${row.pointsShort} P — balance was too low`,
        )
      }
      if (!row.duplicate && !row.stockReturned && kind !== 'denied') {
        console.error(
          `STOCK NOT RETURNED for ${orderNo} (${kind}) — adjust inventory by hand once the goods are back`,
        )
      }

      return json({ ok: true, kind, status: row.status ?? null }, 200, cors)
    }

    // ── the money came in ──────────────────────────────────────────────────
    if (type !== 'PAYMENT.CAPTURE.COMPLETED') {
      // Acknowledged and ignored — including CHECKOUT.ORDER.APPROVED, because
      // approved is not paid and capture is what moves money. Returning an
      // error would make PayPal retry an event we were never going to act on.
      return json({ ok: true, ignored: type }, 200, cors)
    }

    // `custom_id` is the order number we set when creating the order — the only
    // link back to us that survives the customer's browser being gone.
    const orderNo = str(resource.custom_id) ?? str(resource.invoice_id)
    if (!orderNo) {
      console.error('capture webhook carried no custom_id', JSON.stringify(resource).slice(0, 400))
      return json({ ok: true, ignored: 'no_order_ref' }, 200, cors)
    }

    // On a capture event the PayPal order id is nested under
    // supplementary_data.related_ids, not at the top level — `resource.id` is
    // the capture's own id.
    const related = ((resource.supplementary_data ?? {}) as Record<string, unknown>)
      .related_ids as Record<string, unknown> | undefined
    const paypalOrderId = str(related?.order_id)

    const { data, error } = await admin.rpc('settle_checkout', {
      p_order_no: orderNo,
      p_provider: 'paypal',
      p_order_id: paypalOrderId,
      p_capture_id: str(resource.id),
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
  let userEmail = ''
  if (token) {
    const { data } = await admin.auth.getUser(token)
    userId = data.user?.id ?? null
    userEmail = (data.user?.email ?? '').toLowerCase()
  }
  if (!userId) return json({ error: 'members_only' }, 401, cors)

  let body: { action?: string; orderNo?: string; amount?: number; note?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json({ error: 'bad_request' }, 400, cors)
  }

  const orderNo = typeof body.orderNo === 'string' ? body.orderNo : ''
  if (!orderNo) return json({ error: 'order_required' }, 400, cors)

  // ── refund ───────────────────────────────────────────────────────────────
  //
  // Split out above the ownership check below, because this is the one action
  // where the caller is deliberately NOT the person who owns the order. The
  // check it gets instead is the stricter one: an active operator, looked up
  // by the email inside their own verified token.
  if (body.action === 'refund') {
    const { data: operator, error: opError } = await admin
      .from('admin_users')
      .select('email, status')
      .eq('email', userEmail)
      .eq('status', 'active')
      .maybeSingle()

    if (opError) {
      console.error('could not check operator status', opError.message)
      return json({ error: 'unavailable' }, 503, cors)
    }
    if (!operator) return json({ error: 'not_an_operator' }, 403, cors)

    const { data: row, error: readErr } = await admin
      .from('orders')
      .select('order_no, total, refunded_total, status, payment_capture_id')
      .eq('order_no', orderNo)
      .maybeSingle()
    if (readErr) {
      console.error('could not read the order to refund', readErr.message)
      return json({ error: 'unavailable' }, 503, cors)
    }

    const order = row as {
      total: string
      refunded_total: string | null
      status: string
      payment_capture_id: string | null
    } | null
    if (!order) return json({ error: 'no_such_order' }, 404, cors)
    if (!order.payment_capture_id) return json({ error: 'nothing_captured' }, 409, cors)

    // What is actually left to give back. Asking PayPal for more than this
    // fails at their end anyway; failing here says why in plain terms.
    const remaining = Number(order.total) - Number(order.refunded_total ?? 0)
    if (remaining <= 0) return json({ error: 'already_fully_refunded' }, 409, cors)

    const asked = typeof body.amount === 'number' && body.amount > 0 ? body.amount : null
    if (asked != null && asked > remaining + 0.005) {
      return json({ error: 'amount_exceeds_remaining', remaining }, 409, cors)
    }

    let refund
    try {
      refund = await refundCapture({
        captureId: order.payment_capture_id,
        amount: asked,
        currency: CURRENCY,
        // Distinguishes two deliberate partial refunds of the same size while
        // still collapsing an accidental double-click into one.
        reference: `${Math.round((asked ?? remaining) * 100)}-${Math.round(
          Number(order.refunded_total ?? 0) * 100,
        )}`,
        note: body.note,
      })
    } catch (err) {
      if (err instanceof PayPalError) {
        console.error(`refund failed for ${orderNo}`, err.message)
        return json({ error: 'paypal_failed', message: err.userMessage }, err.status, cors)
      }
      throw err
    }

    if (refund.status !== 'COMPLETED' && refund.status !== 'PENDING') {
      console.error(`refund for ${orderNo} came back as ${refund.status}`)
      return json({ error: 'refund_not_accepted', status: refund.status }, 502, cors)
    }

    /*
     * Settle it here as well as in the webhook.
     *
     * Same redundancy as capture, for the same reason: the webhook is the
     * reliable path but not the fast one, and an operator who clicks refund
     * should not be left looking at an order that still says `paid`.
     * `reverse_checkout` keys on the refund id, so whichever arrives second
     * does nothing.
     */
    const { data: applied, error: revErr } = await admin.rpc('reverse_checkout', {
      p_order_no: orderNo,
      p_kind: 'refund',
      p_amount: Number(refund.amount ?? asked ?? remaining),
      p_ref: refund.id,
      p_note: `운영자 환불 (${userEmail})${body.note ? ' · ' + body.note : ''}`,
    })
    if (revErr) {
      // The money has gone back and our books do not know. The webhook will
      // put that right, which is exactly why it exists.
      console.error(`reverse_checkout failed after a successful refund of ${orderNo}`, revErr.message)
      return json({ ok: true, refundId: refund.id, pendingSettlement: true }, 200, cors)
    }

    const result = (applied ?? {}) as Record<string, unknown>
    return json(
      {
        ok: true,
        refundId: refund.id,
        status: result.status ?? null,
        refundedTotal: result.refundedTotal ?? null,
        pointsClawedBack: result.pointsClawedBack ?? 0,
        pointsShort: result.pointsShort ?? 0,
      },
      200,
      cors,
    )
  }

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
