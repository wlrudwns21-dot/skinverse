import { useState } from 'react'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

/**
 * Customers waiting to hear back about their money.
 *
 * Two answers, and both are final from the customer's side, so both ask for
 * something first: a refund asks for the amount, a decline asks for a reason.
 * The reason is not politeness — a refusal a customer cannot understand is the
 * one that becomes a chargeback, and a chargeback costs the fee as well as the
 * goods.
 */
export function Refunds() {
  const admin = useAdmin()
  const [open, setOpen] = useState<string | null>(null)
  /** Empty means "everything still outstanding", which is the usual case. */
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const start = (orderNo: string) => {
    setOpen(orderNo)
    setAmount('')
    setNote('')
  }

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>환불 요청</div>
      <div style={s('font-size:12px;color:#8A7D6C;margin-top:4px;line-height:1.6')}>
        환불을 실행하면 PayPal로 즉시 전송되고, 적립 포인트는 환불 비율만큼 자동 회수됩니다.
        <b style={s('color:#B4622F')}> 재고는 자동 복구되지 않습니다</b> — 반품을 받은 뒤 상품 관리에서 직접 조정하세요.
      </div>

      {admin.refundQueue.length === 0 && (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:22px;text-align:center;font-size:12.5px;color:#8A7D6C;margin-top:14px')}>
          대기 중인 환불 요청이 없습니다.
        </div>
      )}

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {admin.refundQueue.map((r) => (
          <div key={r.orderNo} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px')}>
            <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap')}>
              <div style={s('min-width:0')}>
                <b style={s('font-size:14px')}>{r.orderNo}</b>
                <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:2px')}>
                  {r.shipName} · {r.shipCountry} · {r.askedAt} 요청
                </div>
              </div>
              <div style={s('text-align:right;flex-shrink:0')}>
                <div style={s('font-size:14px;font-weight:700')}>{r.remainingS}</div>
                <div style={s('font-size:11px;color:#8A7D6C')}>
                  결제 {r.totalS} · {r.statusLabel}
                </div>
              </div>
            </div>

            {/* The customer's own words. An operator deciding without them is
                deciding on the amount alone, which is how good customers get
                refused and bad ones get paid. */}
            <div style={s('background:#F8F5EF;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12.5px;color:#4A4234;line-height:1.6;white-space:pre-wrap')}>
              {r.reason || '(사유 없음)'}
            </div>

            {!r.capturable && (
              <div style={s('background:#FBE9E3;border-radius:8px;padding:8px 11px;margin-top:8px;font-size:11.5px;color:#A64B32')}>
                이 주문에는 PayPal 결제 기록이 없어 자동 환불할 수 없습니다.
              </div>
            )}

            {open !== r.orderNo ? (
              <div style={s('display:flex;gap:8px;margin-top:10px')}>
                <div
                  onClick={() => start(r.orderNo)}
                  style={s('flex:1;cursor:pointer;border:1px solid #D8CFBF;border-radius:999px;padding:9px;text-align:center;font-size:12px;font-weight:700;color:#8A7D6C')}
                >
                  처리하기
                </div>
              </div>
            ) : (
              <div style={s('margin-top:10px;border-top:1px solid #F1ECE2;padding-top:10px')}>
                <div style={s('font-size:11.5px;color:#8A7D6C;font-weight:700')}>
                  환불 금액 (비우면 남은 전액 {r.remainingS})
                </div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal"
                  placeholder={String(r.remaining.toFixed(2))}
                  style={s('width:140px;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:13px;margin-top:5px;outline:none')}
                />

                <div style={s('font-size:11.5px;color:#8A7D6C;font-weight:700;margin-top:10px')}>
                  메모 / 거절 사유
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="거절하려면 사유를 반드시 적어주세요 — 고객에게 그대로 표시됩니다"
                  style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:12.5px;font-family:inherit;margin-top:5px;outline:none;resize:vertical')}
                />

                <div style={s('display:flex;gap:8px;margin-top:10px;flex-wrap:wrap')}>
                  <div
                    onClick={() => setOpen(null)}
                    style={s('cursor:pointer;border:1px solid #D8CFBF;border-radius:999px;padding:9px 16px;font-size:12px;font-weight:700;color:#8A7D6C')}
                  >
                    닫기
                  </div>
                  <div
                    onClick={() => void admin.refuseRefund(r.orderNo, note)}
                    style={s('cursor:pointer;border:1px solid #EFCFC3;background:#FBE9E3;border-radius:999px;padding:9px 16px;font-size:12px;font-weight:700;color:#A64B32')}
                  >
                    거절
                  </div>
                  <div
                    onClick={() => {
                      if (r.busy || !r.capturable) return
                      const value = amount.trim() === '' ? null : Number(amount)
                      if (value !== null && (!Number.isFinite(value) || value <= 0)) return
                      void admin.issueRefund(r.orderNo, value, note)
                    }}
                    style={s(
                      'flex:1;min-width:120px;border-radius:999px;padding:9px;text-align:center;font-size:12px;font-weight:700;' +
                        (r.busy || !r.capturable
                          ? 'background:#EFE9DD;color:#B0A490'
                          : 'cursor:pointer;background:#221C15;color:#F3E9D6'),
                    )}
                  >
                    {r.busy ? '처리 중…' : 'PayPal로 환불 실행'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
