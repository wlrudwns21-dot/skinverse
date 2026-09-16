import { useEffect, useState } from 'react'
import { completeAccountDeletion, loadDeletionRequests, type DeletionRequestRow } from '../adminRemote'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

/** How many days a request has been waiting. */
function waitingDays(iso: string): number {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 0
  return Math.floor((Date.now() - then) / 86_400_000)
}

/**
 * 탈퇴 요청 대기열.
 *
 * Deliberately not an approval screen. 개인정보 보호법 제36조 requires a
 * deletion demand to be acted on without delay, and leaving a service is a
 * contractual right — a business cannot refuse it. So there is no reject
 * button, and the wording throughout says 처리 rather than 승인. What an
 * operator is confirming is that they have checked nothing is mid-shipment,
 * not that the member may go.
 */
export function Withdrawals() {
  const admin = useAdmin()
  const [rows, setRows] = useState<DeletionRequestRow[] | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => void loadDeletionRequests().then(setRows)
  useEffect(reload, [])

  const process = async (row: DeletionRequestRow) => {
    setBusy(true)
    const res = await completeAccountDeletion(row.userId, note.trim())
    setBusy(false)
    setConfirming(null)
    setNote('')

    if (!res.ok) {
      admin.toastMsg(row.email + ' — 처리 실패')
      return
    }
    admin.toastMsg(
      `${row.email} 탈퇴 처리 완료 · 주문 ${res.ordersRetained ?? 0}건, 문의 ${res.threadsRetained ?? 0}건 보관`,
    )
    reload()
  }

  const pending = rows ?? []

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>탈퇴 요청</div>
      <div style={s('font-size:12.5px;color:#8A7D6C;margin-top:6px;line-height:1.6')}>
        회원이 직접 요청한 탈퇴 건입니다. 배송 중인 주문이나 진행 중인 환불이 없는지 확인한 뒤
        처리해주세요.
      </div>

      {/* The operator needs to know this before they look for a reject button
          and wonder where it went. */}
      <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:14px 16px;margin-top:14px;font-size:12px;color:#8A6D32;line-height:1.7')}>
        <b>탈퇴는 승인·거부의 대상이 아닙니다.</b>
        <br />
        개인정보 보호법 제36조는 삭제 요구를 <b>지체 없이</b> 처리하도록 정하고 있고, 회원 탈퇴는
        계약 해지권이라 사업자가 거부할 수 없습니다. 이 화면은 허가를 내주는 곳이 아니라, 처리를
        빠뜨리지 않고 기록으로 남기기 위한 대기열입니다.
        <br />
        <b>주문·결제 기록 5년, 문의 기록 3년</b>은 전자상거래법에 따라 계정과 분리된 상태로
        보관되며 삭제되지 않습니다.
      </div>

      {rows === null && (
        <div style={s('padding:30px;text-align:center')}>
          <div style={s('width:28px;height:28px;margin:0 auto;border-radius:50%;border:3px solid #E4DCCB;border-top-color:#2E6B58;animation:spin 1s linear infinite')} />
        </div>
      )}

      {rows !== null && pending.length === 0 && (
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:30px;margin-top:14px;text-align:center;font-size:13px;color:#8A7D6C')}>
          대기 중인 탈퇴 요청이 없습니다.
        </div>
      )}

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {pending.map((row) => {
          const days = waitingDays(row.requestedAt)
          // Three days is not a legal deadline — "지체 없이" has no number.
          // It is a nudge, and it turns red before anyone could call it a delay.
          const late = days >= 3
          const isOpen = confirming === row.userId

          return (
            <div
              key={row.userId}
              style={s(`background:#FFFFFF;border:1px solid ${late ? '#EFCFC3' : '#ECE6DA'};border-radius:14px;padding:16px`)}
            >
              <div style={s('display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap')}>
                <div style={s('flex:1;min-width:200px')}>
                  <div style={s('font-size:14px;font-weight:700')}>{row.name}</div>
                  <div style={s('font-size:12px;color:#6E6252;margin-top:2px;word-break:break-all')}>
                    {row.email}
                  </div>
                  <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:6px')}>
                    {new Date(row.requestedAt).toLocaleString('ko-KR')} 요청
                  </div>
                  {row.reason && (
                    <div style={s('background:#FAF8F3;border-radius:10px;padding:9px 11px;margin-top:8px;font-size:12px;color:#4A4234;line-height:1.5')}>
                      “{row.reason}”
                    </div>
                  )}
                </div>

                <div
                  style={s(
                    `border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:700;white-space:nowrap;` +
                      (late ? 'background:#FBE9E3;color:#A64B32' : 'background:#F1ECE2;color:#6E6252'),
                  )}
                >
                  {days === 0 ? '오늘 요청' : `${days}일 경과`}
                </div>
              </div>

              {!isOpen ? (
                <div
                  onClick={() => { setConfirming(row.userId); setNote('') }}
                  style={s('cursor:pointer;margin-top:12px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:11px;text-align:center;font-size:12.5px;font-weight:700')}
                >
                  탈퇴 처리하기
                </div>
              ) : (
                <div style={s('background:#FBE9E3;border:1px solid #EFCFC3;border-radius:12px;padding:13px;margin-top:12px')}>
                  <div style={s('font-size:12.5px;font-weight:700;color:#A64B32')}>
                    되돌릴 수 없습니다
                  </div>
                  <div style={s('font-size:11.5px;color:#A64B32;margin-top:5px;line-height:1.6')}>
                    계정, 분석 기록, 루틴, 장바구니, 포인트가 즉시 삭제됩니다. 주문과 문의 기록은
                    법정 보관 기간 동안 남습니다.
                  </div>

                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="처리 메모 (선택) — 예: 배송 완료 확인함"
                    style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:10px;padding:9px 11px;font-size:12px;background:#FFFFFF;outline:none;margin-top:10px')}
                  />

                  <div style={s('display:flex;gap:8px;margin-top:10px')}>
                    <div
                      onClick={busy ? undefined : () => void process(row)}
                      style={s(`cursor:${busy ? 'default' : 'pointer'};flex:1;background:#A64B32;color:#FFFFFF;border-radius:999px;padding:11px;text-align:center;font-size:12.5px;font-weight:700;opacity:${busy ? '.6' : '1'}`)}
                    >
                      {busy ? '처리 중…' : '삭제 실행'}
                    </div>
                    <div
                      onClick={() => setConfirming(null)}
                      style={s('cursor:pointer;flex:1;background:#FFFFFF;border:1px solid #D8CFBF;color:#6E6252;border-radius:999px;padding:11px;text-align:center;font-size:12.5px;font-weight:700')}
                    >
                      취소
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
