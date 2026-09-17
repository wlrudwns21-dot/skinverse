import { useState } from 'react'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/** How many orders show before the list asks to be expanded. */
const PREVIEW = 3

/**
 * Every order the member has placed, and the one thing they might want to do
 * about it.
 *
 * The refund control is deliberately called a *request*. The money moves when
 * an operator issues it and PayPal confirms — a button that said "환불" and
 * merely filed a ticket would be promising something the shop has not agreed
 * to, and the customer would come back angry rather than merely waiting.
 */
export function OrderHistory() {
  const st = useStore()
  const [all, setAll] = useState(false)
  /** Which order has its reason box open. One at a time. */
  const [asking, setAsking] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  if (!st.hasOrders) {
    return (
      <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:16px;font-size:12px;color:#8A7D6C;text-align:center')}>
        {st.t.ordersEmpty}
      </div>
    )
  }

  const shown = all ? st.orderHistory : st.orderHistory.slice(0, PREVIEW)

  return (
    <div style={s('display:flex;flex-direction:column;gap:8px')}>
      {shown.map((o) => (
        <div key={o.orderNo} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px')}>
          <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:10px')}>
            <div style={s('min-width:0')}>
              <div style={s('font-size:13px;font-weight:600')}>{o.orderNo}</div>
              <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:1px')}>
                {o.date} · {o.shipMethod.toUpperCase()}
                {o.tracking ? ` · ${o.tracking}` : ''}
              </div>
            </div>
            <div style={s('text-align:right;flex-shrink:0')}>
              <div style={s('font-size:13px;font-weight:700')}>{o.totalS}</div>
              <div style={s(`font-size:11px;font-weight:700;margin-top:2px;color:${o.statusTone}`)}>
                {o.statusLabel}
              </div>
            </div>
          </div>

          {/* What came back, when some of it did. A partly refunded order is
              otherwise indistinguishable from one that was never touched. */}
          {o.refundedS && (
            <div style={s('font-size:11.5px;color:#B4622F;margin-top:6px')}>
              {st.t.refunded} {o.refundedS}
            </div>
          )}

          {o.requestOpen && (
            <div style={s('background:#FBF3E4;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:11.5px;color:#8A6D32;display:flex;justify-content:space-between;align-items:center;gap:8px')}>
              <span>{st.t.refundPending}</span>
              <span
                onClick={() => st.cancelRefund(o.orderNo)}
                style={s('cursor:pointer;text-decoration:underline;flex-shrink:0;font-weight:700')}
              >
                {st.t.refundWithdraw}
              </span>
            </div>
          )}

          {/* A decline without a reason is just a wall. The operator has to
              give one, so it is shown here rather than kept in the console. */}
          {o.declined && (
            <div style={s('background:#FBE9E3;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:11.5px;color:#A64B32;line-height:1.5')}>
              <b>{st.t.refundDeclined}</b>
              {o.declineNote && <div style={s('margin-top:2px')}>{o.declineNote}</div>}
            </div>
          )}

          {o.refundable && asking !== o.orderNo && (
            <div
              onClick={() => { setAsking(o.orderNo); setReason('') }}
              style={s('cursor:pointer;margin-top:9px;border:1px solid #D8CFBF;border-radius:999px;padding:8px;text-align:center;font-size:12px;font-weight:700;color:#8A7D6C')}
            >
              {st.t.refundAsk}
            </div>
          )}

          {asking === o.orderNo && (
            <div style={s('margin-top:9px')}>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={st.t.refundReason}
                rows={3}
                style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:10px;padding:9px 11px;font-size:12.5px;font-family:inherit;outline:none;resize:vertical')}
              />
              <div style={s('font-size:11px;color:#A2957F;line-height:1.5;margin-top:5px')}>
                {st.t.refundNote}
              </div>
              <div style={s('display:flex;gap:8px;margin-top:8px')}>
                <div
                  onClick={() => setAsking(null)}
                  style={s('flex:1;cursor:pointer;border:1px solid #D8CFBF;border-radius:999px;padding:9px;text-align:center;font-size:12px;font-weight:700;color:#8A7D6C')}
                >
                  {st.t.refundWithdraw}
                </div>
                <div
                  onClick={() => {
                    if (!reason.trim()) return
                    st.askRefund(o.orderNo, reason.trim())
                    setAsking(null)
                  }}
                  style={s(
                    'flex:1;border-radius:999px;padding:9px;text-align:center;font-size:12px;font-weight:700;' +
                      (reason.trim()
                        ? 'cursor:pointer;background:#221C15;color:#F3E9D6'
                        : 'background:#EFE9DD;color:#B0A490'),
                  )}
                >
                  {st.t.refundSend}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {st.orderHistory.length > PREVIEW && (
        <div
          onClick={() => setAll((v) => !v)}
          style={s('cursor:pointer;border:1px solid #D8CFBF;border-radius:999px;padding:9px;text-align:center;font-size:12px;font-weight:700;color:#8A7D6C;background:#FFFFFF')}
        >
          {all ? st.t.showLess : st.t.showAll(st.orderHistory.length - PREVIEW)}
        </div>
      )}
    </div>
  )
}
