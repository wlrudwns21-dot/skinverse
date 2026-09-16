import { useEffect, useState } from 'react'
import { loadAuditLog, type AuditEntry } from '../adminRemote'
import { s } from '../../lib/css'

const ROW_COLS = 'display:grid;grid-template-columns:150px 130px 1.1fr 1.4fr;gap:10px'

/** What each action is called, and how loud it should look. */
const ACTIONS: Record<string, { label: string; tone: string; bg: string }> = {
  'points.change': { label: '포인트 변동', tone: '#8A6D32', bg: '#FBF3E4' },
  'operator.add': { label: '운영자 추가', tone: '#2E6B58', bg: '#EAF1EC' },
  'operator.change': { label: '권한 변경', tone: '#A64B32', bg: '#FBE9E3' },
  'operator.remove': { label: '운영자 삭제', tone: '#A64B32', bg: '#FBE9E3' },
  'order.update': { label: '주문 처리', tone: '#4A4234', bg: '#F1ECE2' },
  'order.paid': { label: '결제 완료', tone: '#2E6B58', bg: '#EAF1EC' },
  'order.void': { label: '주문 취소', tone: '#8A7D6C', bg: '#F1EEE6' },
  // The four below all mean money left again. Loud on purpose.
  'order.refunded': { label: '환불', tone: '#B4622F', bg: '#FBEFE3' },
  'order.reversed': { label: '지급거절(분쟁)', tone: '#A33B3B', bg: '#FAE4E4' },
  'order.payment_failed': { label: '결제 실패', tone: '#A64B32', bg: '#FBE9E3' },
  'payment.dispute': { label: '분쟁 접수', tone: '#A33B3B', bg: '#FAE4E4' },
  'payment.orphaned': { label: '결제 불일치', tone: '#A33B3B', bg: '#FAE4E4' },
}

const num = (v: unknown) => (typeof v === 'number' ? v : null)
const str = (v: unknown) => (typeof v === 'string' ? v : null)

/** `{from, to}` pairs read better as an arrow than as JSON. */
function movement(d: Record<string, unknown>, key: string): string | null {
  const pair = d[key] as Record<string, unknown> | undefined
  if (!pair || typeof pair !== 'object') return null
  const from = str(pair.from) ?? num(pair.from)
  const to = str(pair.to) ?? num(pair.to)
  if (from === to) return null
  return `${from === '' || from === null ? '—' : from} → ${to === '' || to === null ? '—' : to}`
}

/**
 * One line of plain Korean per entry.
 *
 * A log nobody reads is a log that does not work, and raw jsonb is a log nobody
 * reads. The full record is still one click away for the cases this flattens.
 */
function describe(e: AuditEntry): string {
  const d = e.detail

  if (e.action === 'points.change') {
    const delta = num(d.delta) ?? 0
    const sign = delta > 0 ? '+' : ''
    return `${num(d.from) ?? '?'} P → ${num(d.to) ?? '?'} P (${sign}${delta})`
  }

  if (e.action === 'operator.add') {
    return `${d.role === 'master' ? '마스터' : '일반 관리자'} · ${d.status}${d.note ? ` · ${d.note}` : ''}`
  }

  if (e.action === 'operator.change') {
    const parts = [movement(d, 'role'), movement(d, 'status')].filter(Boolean)
    return parts.length ? parts.join(' · ') : '변경 없음'
  }

  if (e.action === 'operator.remove') {
    return `${d.role === 'master' ? '마스터' : '일반 관리자'} · ${d.status}`
  }

  if (e.action === 'order.update') {
    const parts = [movement(d, 'status'), movement(d, 'tracking')].filter(Boolean)
    return parts.length ? parts.join(' · ') : '변경 없음'
  }

  if (e.action === 'order.paid') {
    return `$${num(d.total) ?? '?'} 결제 · ${num(d.pointsEarned) ?? 0} P 적립`
  }

  /*
   * Money going back out.
   *
   * This is the line an operator acts on, so it says what still needs doing
   * rather than only what happened: points that could not be reclaimed are a
   * decision for a human, and stock that was not returned is a shelf that is
   * still wrong.
   */
  if (
    e.action === 'order.refunded' ||
    e.action === 'order.reversed' ||
    e.action === 'order.payment_failed'
  ) {
    const parts = [
      `$${num(d.amount) ?? '?'} 반환`,
      d.full === false ? `부분 (누적 $${num(d.refundedTotal) ?? '?'} / $${num(d.orderTotal) ?? '?'})` : '전액',
    ]
    if (num(d.pointsClawedBack)) parts.push(`${num(d.pointsClawedBack)} P 회수`)
    if (num(d.pointsReturned)) parts.push(`사용 ${num(d.pointsReturned)} P 반환`)
    if (num(d.pointsShort)) parts.push(`⚠ ${num(d.pointsShort)} P 회수 불가 (잔액 부족)`)
    parts.push(d.stockReturned === true ? '재고 복구됨' : '⚠ 재고 수동 조정 필요')
    return parts.join(' · ')
  }

  if (e.action === 'payment.dispute') {
    return `${str(d.status) ?? '?'} · 사유 ${str(d.reason) ?? '?'} · $${str(d.amount) ?? '?'} · 기한 내 대응 필요`
  }

  if (e.action === 'payment.orphaned') {
    return `취소된 주문에 $${num(d.total) ?? '?'} 입금 · 환불 필요`
  }

  return JSON.stringify(d)
}

/**
 * Master-only.
 *
 * The log is how you investigate an operator, so the operator being
 * investigated must not be able to read it — that is enforced by row level
 * security, not by hiding this menu item. A plain admin who reached this screen
 * would see an empty table.
 */
export function Audit() {
  const [rows, setRows] = useState<AuditEntry[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    void loadAuditLog().then(setRows)
  }, [])

  const all = rows ?? []
  const shown = filter === 'all' ? all : all.filter((r) => r.action === filter)
  const kinds = Array.from(new Set(all.map((r) => r.action)))

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>감사 로그</div>
      <div style={s('font-size:12.5px;color:#8A7D6C;margin-top:6px;line-height:1.6')}>
        포인트가 움직이거나, 운영자 권한이 바뀌거나, 주문이 처리될 때마다 <b>누가 · 언제 · 무엇을</b>{' '}
        했는지 자동으로 남습니다. 앱이 아니라 데이터베이스가 직접 기록하므로 콘솔을 거치지 않은
        변경도 빠지지 않습니다.
        <br />
        <b>이 기록은 누구도 수정하거나 삭제할 수 없습니다</b> — 마스터도 마찬가지입니다.
      </div>

      {kinds.length > 0 && (
        <div style={s('display:flex;gap:6px;flex-wrap:wrap;margin-top:16px')}>
          {['all', ...kinds].map((k) => {
            const on = filter === k
            const meta = ACTIONS[k]
            return (
              <div
                key={k}
                onClick={() => setFilter(k)}
                style={s(
                  'cursor:pointer;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;' +
                    (on
                      ? 'background:#221C15;color:#F5F0E6'
                      : 'background:#FFFFFF;border:1px solid #E4DCCB;color:#6E6252'),
                )}
              >
                {k === 'all' ? `전체 ${all.length}` : `${meta?.label ?? k}`}
              </div>
            )
          })}
        </div>
      )}

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:6px 16px 16px;margin-top:14px;overflow-x:auto')}>
        <div style={s('min-width:760px')}>
          <div style={s(ROW_COLS + ';font-size:11px;color:#8A7D6C;font-weight:700;padding:10px 6px;border-bottom:1px solid #ECE6DA')}>
            <span>시각</span><span>행위</span><span>수행자</span><span>내용</span>
          </div>

          {rows === null && (
            <div style={s('padding:26px;text-align:center')}>
              <div style={s('width:28px;height:28px;margin:0 auto;border-radius:50%;border:3px solid #E4DCCB;border-top-color:#2E6B58;animation:spin 1s linear infinite')} />
            </div>
          )}

          {rows !== null && shown.length === 0 && (
            <div style={s('padding:26px;text-align:center;font-size:12.5px;color:#8A7D6C;line-height:1.6')}>
              기록이 없습니다.
              <br />
              <span style={s('font-size:11.5px;color:#A2957F')}>
                포인트 지급이나 운영자 승인을 한 번 해보시면 여기에 남습니다.
              </span>
            </div>
          )}

          {shown.map((e) => {
            const meta = ACTIONS[e.action]
            const isOpen = open === e.id
            return (
              <div key={e.id} style={s('border-bottom:1px solid #F1ECE2')}>
                <div
                  onClick={() => setOpen(isOpen ? null : e.id)}
                  style={s(ROW_COLS + ';cursor:pointer;font-size:12.5px;padding:11px 6px;align-items:center')}
                >
                  <span style={s('color:#8A7D6C;font-size:11.5px')}>
                    {new Date(e.at).toLocaleString('ko-KR', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>

                  <span>
                    <span style={s(`background:${meta?.bg ?? '#F1ECE2'};color:${meta?.tone ?? '#4A4234'};border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700;white-space:nowrap`)}>
                      {meta?.label ?? e.action}
                    </span>
                  </span>

                  <span style={s('min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                    {/* 'system' means no signed-in caller — a trigger firing
                        during a migration, not a person. */}
                    {e.actor === 'system' ? (
                      <span style={s('color:#A2957F')}>시스템</span>
                    ) : (
                      e.actor
                    )}
                  </span>

                  <span style={s('min-width:0;color:#4A4234;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                    {describe(e)}
                  </span>
                </div>

                {isOpen && (
                  <div style={s('background:#FAF8F3;border-radius:10px;padding:12px 14px;margin:0 6px 12px;font-size:11.5px;line-height:1.7;color:#6E6252')}>
                    <div><b>대상</b> · <span style={s('word-break:break-all')}>{e.subject ?? '—'}</span></div>
                    <div><b>정확한 시각</b> · {new Date(e.at).toLocaleString('ko-KR')}</div>
                    <div style={s('margin-top:6px')}><b>원본 기록</b></div>
                    <pre style={s('margin:4px 0 0;font-size:11px;white-space:pre-wrap;word-break:break-all;color:#8A7D6C')}>
                      {JSON.stringify(e.detail, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {rows !== null && all.length >= 200 && (
        <div style={s('font-size:11.5px;color:#A2957F;margin-top:12px')}>
          최근 200건만 표시합니다. 더 오래된 기록도 데이터베이스에는 그대로 남아 있습니다.
        </div>
      )}
    </div>
  )
}
