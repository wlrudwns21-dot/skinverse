import { useState } from 'react'
import { orderStatusMeta, orderStatusOrder } from '../../data/admin'
import { isPaymentLocked, type OrderStatus } from '../../data/types'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const ROW_COLS = 'display:grid;grid-template-columns:1.1fr 1.1fr 0.7fr 0.9fr 1fr 1.1fr;gap:8px'

export function Orders() {
  const admin = useAdmin()
  /**
   * Which order has its refund panel open. One at a time, and closed by
   * default — a refund button that is always armed on every row is a refund
   * waiting to be issued by a mis-click.
   */
  const [refunding, setRefunding] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>주문 관리</div>

      <div style={s('display:flex;gap:8px;margin:14px 0;flex-wrap:wrap')}>
        {admin.orderChips.map((c) => (
          <div key={c.id} onClick={c.pick} style={s(c.style)}>{c.label}</div>
        ))}
      </div>

      {admin.orderList.length === 0 && (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:22px;text-align:center;font-size:12.5px;color:#8A7D6C;line-height:1.6')}>
          {admin.hasOrders ? '이 상태의 주문이 없습니다.' : '아직 주문이 없습니다. 스토어에서 결제가 완료되면 여기에 나타납니다.'}
        </div>
      )}

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:6px 16px 16px;overflow-x:auto')}>
        <div style={s('min-width:760px')}>
          <div style={s(ROW_COLS + ';font-size:11px;color:#8A7D6C;font-weight:700;padding:10px 6px;border-bottom:1px solid #ECE6DA')}>
            <span>주문번호 / 일시</span><span>고객 / 국가</span><span>금액</span><span>배송 방법</span><span>운송장</span><span>상태 변경</span>
          </div>
          {admin.orderList.map((o) => {
            const remaining = o.amt - o.refunded
            const canRefund = o.capturable && remaining > 0.005
            return (
            <div key={o.no}>
            <div style={s(ROW_COLS + ';font-size:12.5px;padding:11px 6px;border-bottom:1px solid #F1ECE2;align-items:center')}>
              <div>
                <b>{o.no}</b>
                <div style={s('font-size:11px;color:#8A7D6C')}>{o.date}</div>
              </div>
              <div>
                {o.name}
                <div style={s('font-size:11px;color:#8A7D6C')}>{o.country}</div>
              </div>
              <div>
                <b>{o.amtS}</b>
                {/* A partly refunded order looks identical to an untouched one
                    without this, which is how the same order gets refunded
                    twice. */}
                {o.refunded > 0 && (
                  <div style={s('font-size:10.5px;color:#B4622F;font-weight:700')}>
                    −${o.refunded.toFixed(2)}
                  </div>
                )}
              </div>
              <span style={s('color:#6E6252')}>{o.carrier}</span>
              <span style={s('font-size:11.5px;color:#6E6252')}>{o.tracking}</span>
              {isPaymentLocked(o.status) ? (
                /*
                 * Not a dropdown, because there is nothing to choose. PayPal
                 * has already decided, the database refuses to be told
                 * otherwise, and a select box here would only offer the
                 * operator a click that fails.
                 */
                <span
                  title="결제사에서 확정된 상태입니다. 콘솔에서는 변경할 수 없습니다."
                  style={s('border-radius:6px;padding:5px 9px;font-size:11.5px;font-weight:700;text-align:center;white-space:nowrap;' +
                    `color:${orderStatusMeta[o.status][1]};background:${orderStatusMeta[o.status][2]}`)}
                >
                  {orderStatusMeta[o.status][0]}
                </span>
              ) : (
                <select
                  value={o.status}
                  onChange={(e) => o.setStatus(e.target.value as OrderStatus)}
                  style={s('border:1px solid #D8CFBF;border-radius:8px;padding:7px 8px;font-size:12px;background:#FFFFFF;outline:none;cursor:pointer;max-width:130px')}
                >
                  {orderStatusOrder.map((st) => (
                    <option key={st} value={st}>{orderStatusMeta[st][0]}</option>
                  ))}
                </select>
              )}
            </div>

            {/* The refund control lives under the row rather than in it: it
                needs an amount and a note, and money should cost more than one
                click to move. */}
            {canRefund && (
              <div style={s('padding:0 6px 10px')}>
                {refunding !== o.no ? (
                  <span
                    onClick={() => { setRefunding(o.no); setAmount(''); setNote('') }}
                    style={s('cursor:pointer;font-size:11.5px;font-weight:700;color:#B4622F;text-decoration:underline')}
                  >
                    환불하기
                  </span>
                ) : (
                  <div style={s('background:#FBF6EE;border:1px solid #EBD9B8;border-radius:12px;padding:11px 13px;margin-top:4px')}>
                    <div style={s('font-size:11.5px;color:#8A6D32;line-height:1.6')}>
                      남은 환불 가능 금액 <b>${remaining.toFixed(2)}</b> · 비우면 전액 환불됩니다.
                      적립 포인트는 자동 회수되고, <b>재고는 자동 복구되지 않습니다.</b>
                    </div>
                    <div style={s('display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center')}>
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        inputMode="decimal"
                        placeholder={remaining.toFixed(2)}
                        style={s('width:110px;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:12.5px;outline:none;text-align:right')}
                      />
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="메모 (선택)"
                        style={s('flex:1;min-width:140px;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:12.5px;outline:none')}
                      />
                      <span
                        onClick={() => setRefunding(null)}
                        style={s('cursor:pointer;font-size:12px;font-weight:700;color:#8A7D6C;padding:8px 10px')}
                      >
                        취소
                      </span>
                      <span
                        onClick={() => {
                          if (admin.refundBusy) return
                          const value = amount.trim() === '' ? null : Number(amount)
                          if (value !== null && (!Number.isFinite(value) || value <= 0)) return
                          void admin.issueRefund(o.no, value, note)
                          setRefunding(null)
                        }}
                        style={s(
                          'border-radius:999px;padding:8px 16px;font-size:12px;font-weight:700;' +
                            (admin.refundBusy
                              ? 'background:#EFE9DD;color:#B0A490'
                              : 'cursor:pointer;background:#221C15;color:#F3E9D6'),
                        )}
                      >
                        {admin.refundBusy === o.no ? '처리 중…' : 'PayPal 환불 실행'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
