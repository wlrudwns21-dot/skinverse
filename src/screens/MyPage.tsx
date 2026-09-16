import { useState } from 'react'
import type { Lang, MetricKey } from '../data/types'
import { langOptions } from '../i18n'
import { s } from '../lib/css'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../store/StoreContext'

/** "Yuki Tanaka" → "YT"; falls back to the account's email initial. */
function initials(name: string, email: string): string {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return fromName || email.slice(0, 2).toUpperCase()
}

/**
 * The record, accumulating.
 *
 * The chart used to draw the overall score and nothing else, while the
 * per-axis scores were fetched with every scan and dropped on the floor. The
 * average is the wrong number for someone working on one thing: it can sit
 * still for a month while the hydration underneath it climbs eight points. So
 * the axis is pickable, and the line above the chart says how far the skin has
 * come since the very first scan — the per-scan findings only ever compare the
 * latest against the one before it, which stops meaning much after a season.
 */
function TrendCard() {
  const st = useStore()
  const [axis, setAxis] = useState<MetricKey | null>(null)

  // An axis with too little history to chart is not offered, so the picker can
  // never lead somewhere empty.
  const chart = st.trendFor(axis) ?? st.trendFor(null)
  if (!chart) return null

  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:20px')}>
      <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
        <div style={s('font-family:Marcellus,serif;font-size:16px')}>{st.trendTitle}</div>
        <div style={s('font-size:11px;color:#A2957F;flex-shrink:0')}>{chart.count}</div>
      </div>
      <div style={s('font-size:11.5px;color:#A2957F;margin-top:2px')}>{st.trendSub}</div>

      {st.cumulativeLine && (
        <div style={s('background:#F8F5EF;border-radius:10px;padding:9px 12px;margin-top:10px;font-size:12px;color:#4A4234;line-height:1.5')}>
          {st.cumulativeLine}
        </div>
      )}

      {st.trendAxes.length > 1 && (
        <div style={s('display:flex;gap:6px;overflow-x:auto;margin-top:12px;padding-bottom:3px')}>
          {st.trendAxes.map((option) => {
            const active = option.key === axis
            return (
              <div
                key={option.key ?? 'overall'}
                onClick={() => setAxis(option.key)}
                style={s(
                  'cursor:pointer;flex-shrink:0;font-size:11.5px;font-weight:600;border-radius:999px;padding:5px 11px;' +
                    (active
                      ? 'background:#221C15;color:#F3E9D6'
                      : 'background:#F1EEE6;color:#8A7D6C'),
                )}
              >
                {option.label}
              </div>
            )
          })}
        </div>
      )}

      <div style={s('display:flex;align-items:flex-end;gap:6px;height:120px;margin-top:14px;overflow-x:auto')}>
        {chart.points.map((p) => (
          <div key={p.key} style={s('flex:1;min-width:26px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%')}>
            <div style={s('font-size:10px;font-weight:700;color:#4A4234;margin-bottom:3px')}>{p.score}</div>
            <div style={s(`width:100%;border-radius:6px 6px 0 0;background:${p.color};height:${p.height}`)} />
          </div>
        ))}
      </div>

      <div style={s('display:flex;gap:6px;margin-top:6px;overflow-x:auto')}>
        {chart.points.map((p) => (
          <div key={p.key} style={s('flex:1;min-width:26px;text-align:center')}>
            <div style={s('font-size:9.5px;color:#8A7D6C')}>{p.date}</div>
            {p.humidity && (
              <div style={s('font-size:9px;color:#B9AC93;margin-top:1px')}>💧{p.humidity}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MyPage() {
  const st = useStore()
  const auth = useAuth()
  const order = st.state.order
  const email = auth.user?.email ?? ''

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('display:flex;align-items:center;gap:14px')}>
        <div style={s('width:58px;height:58px;border-radius:50%;background:#2E6B58;color:#F3EFE6;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;flex-shrink:0')}>
          {initials(st.state.name, email)}
        </div>
        <div style={s('min-width:0')}>
          <div style={s('font-family:Marcellus,serif;font-size:20px')}>{st.state.name || email}</div>
          <div style={s('font-size:12px;color:#8A7D6C')}>Lv. {st.levelName} · {st.pointsS} P · 🔥 {st.streakLine}</div>
          <div style={s('font-size:11px;color:#A2957F;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{email}</div>
        </div>
      </div>

      {/* Bars are scaled to the range actually present, not to 0–100: skin
          scores cluster narrowly, and a fixed axis flattens a real swing into
          a row of identical bars. The humidity under each one is what makes a
          dip readable rather than alarming. */}
      <TrendCard />

      <div style={s('font-family:Marcellus,serif;font-size:16px;margin:20px 2px 8px')}>{st.t.skinHistory}</div>
      {st.history.length > 0 ? (
        <div style={s('display:flex;flex-direction:column;gap:8px')}>
          {st.history.map((h, i) => (
            <div key={h.date + i} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center')}>
              <div>
                <div style={s('font-size:13px;font-weight:600')}>{h.date}</div>
                <div style={s('font-size:11.5px;color:#8A7D6C')}>{h.type}</div>
              </div>
              <div style={s(`font-size:16px;font-weight:700;color:${h.color}`)}>{h.score}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:16px;font-size:12px;color:#8A7D6C;text-align:center;line-height:1.5')}>
          {st.t.noScan}
        </div>
      )}

      {st.savedRoutineCount > 0 && (
        <>
          <div style={s('font-family:Marcellus,serif;font-size:16px;margin:18px 2px 8px')}>{st.t.routineTitle}</div>
          <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;font-size:13px;font-weight:600')}>
            {st.a.savedRoutines(st.savedRoutineCount)}
          </div>
        </>
      )}

      <div style={s('font-family:Marcellus,serif;font-size:16px;margin:18px 2px 8px')}>{st.t.orders}</div>
      {order ? (
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center')}>
          <div>
            <div style={s('font-size:13px;font-weight:600')}>{order.no}</div>
            {/*
              * An order that has been refunded, disputed or cancelled must
              * stop claiming to be on its way — that line is the first thing a
              * customer checks after asking for their money back.
              */}
            {order.status && order.status in st.t.orderState ? (
              <div style={s('font-size:11.5px;font-weight:700;color:#C25E43')}>
                {st.t.orderState[order.status as keyof typeof st.t.orderState]}
              </div>
            ) : (
              <div style={s('font-size:11.5px;color:#8A7D6C')}>{st.t.inTransit} — {order.eta}</div>
            )}
          </div>
          <div style={s('font-size:13px;font-weight:700')}>{order.total}</div>
        </div>
      ) : (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:16px;font-size:12px;color:#8A7D6C;text-align:center')}>
          {st.t.noOrders}
        </div>
      )}

      <div style={s('font-family:Marcellus,serif;font-size:16px;margin:18px 2px 8px')}>{st.t.settings}</div>
      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;overflow:hidden;font-size:13px')}>
        <div style={s('padding:13px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F1ECE2')}>
          <span>{st.t.language}</span>
          <select
            value={st.lang}
            onChange={(e) => st.setLang(e.target.value as Lang)}
            style={s('border:1px solid #D8CFBF;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:600;background:#FFFFFF;outline:none;cursor:pointer')}
          >
            {langOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.full}</option>
            ))}
          </select>
        </div>
        <div style={s('padding:13px 14px;display:flex;justify-content:space-between;border-bottom:1px solid #F1ECE2')}>
          <span>{st.t.currency}</span>
          <b>USD $</b>
        </div>
        <div style={s('padding:13px 14px;display:flex;justify-content:space-between;border-bottom:1px solid #F1ECE2')}>
          <span>{st.t.shipRegion}</span>
          <b>{st.state.country}</b>
        </div>
        <div onClick={st.toggleNotif} style={s('cursor:pointer;padding:13px 14px;display:flex;justify-content:space-between;align-items:center')}>
          <span>{st.t.reminders}</span>
          <div style={s(`width:40px;height:24px;border-radius:99px;background:${st.notifBg};position:relative;transition:background .2s`)}>
            <div style={s(`position:absolute;top:3px;left:${st.notifLeft};width:18px;height:18px;border-radius:50%;background:#FFF;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,0.25)`)} />
          </div>
        </div>
      </div>

      <div
        onClick={st.goSupport}
        style={s('cursor:pointer;margin-top:18px;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600')}
      >
        <span>💬 {st.a.support}</span>
        <span style={s('color:#B0A490')}>→</span>
      </div>

      <div
        onClick={st.signOut}
        style={s('cursor:pointer;margin-top:10px;border:1px solid #D8CFBF;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700;color:#8A7D6C;background:#FFFFFF')}
      >
        {st.a.logOut}
      </div>

      <Withdraw />

      {/* Findable after signup too, not only at the moment of agreeing. */}
      <div style={s('display:flex;justify-content:center;gap:14px;margin-top:20px;font-size:12px;color:#8A7D6C')}>
        <span onClick={() => st.goLegal('terms')} style={s('cursor:pointer')}>이용약관</span>
        <span style={s('color:#D8CFBF')}>·</span>
        <span onClick={() => st.goLegal('privacy')} style={s('cursor:pointer;font-weight:700;color:#6E6252')}>
          개인정보처리방침
        </span>
      </div>
    </div>
  )
}

/**
 * 회원 탈퇴.
 *
 * Two steps on purpose. The deletion is irreversible and takes the scan history
 * with it, so it should not be one tap away — and the confirmation is where the
 * member finds out what actually survives, which is the part people are
 * surprised by afterwards rather than before.
 */
function Withdraw() {
  const st = useStore()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (st.deletionPending) {
    return (
      <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:14px 16px;margin-top:20px')}>
        <div style={s('font-size:13px;font-weight:700;color:#8A6D32')}>탈퇴 요청 처리 중</div>
        <div style={s('font-size:12px;color:#9A8455;margin-top:6px;line-height:1.6')}>
          요청이 접수되었습니다. 배송 중인 주문이 있는지 확인한 뒤 처리해드립니다.
          <br />
          처리가 끝나기 전까지는 취소하실 수 있습니다.
        </div>
        <div
          onClick={st.cancelDeletion}
          style={s('cursor:pointer;margin-top:12px;background:#FFFFFF;border:1px solid #D8CFBF;border-radius:999px;padding:11px;text-align:center;font-size:12.5px;font-weight:700;color:#4A4234')}
        >
          탈퇴 요청 취소
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <div style={s('text-align:center;margin-top:22px')}>
        <span
          onClick={() => setOpen(true)}
          style={s('cursor:pointer;font-size:12px;color:#A2957F;text-decoration:underline')}
        >
          회원 탈퇴
        </span>
      </div>
    )
  }

  return (
    <div style={s('background:#FFFFFF;border:1px solid #EFCFC3;border-radius:14px;padding:16px;margin-top:20px')}>
      <div style={s('font-size:13.5px;font-weight:700;color:#A64B32')}>정말 탈퇴하시겠어요?</div>

      <div style={s('font-size:12px;color:#6E6252;margin-top:10px;line-height:1.7')}>
        <b>삭제되는 것</b>
        <br />
        계정과 로그인 정보, 피부 분석 기록 전체, 루틴 기록, 장바구니, 보유 포인트
      </div>

      {/* Said plainly here rather than buried in the privacy policy, because
          "왜 아직 내 이름이 남아 있냐"는 탈퇴 후에 나오는 질문입니다. */}
      <div style={s('font-size:12px;color:#6E6252;margin-top:10px;line-height:1.7')}>
        <b>법령에 따라 보관되는 것</b>
        <br />
        주문·결제 기록 5년, 문의 기록 3년 (전자상거래법). 이 기록은 계정과의 연결이
        끊긴 상태로 보관되며, 로그인해서 볼 수는 없습니다.
      </div>

      <div style={s('background:#FBE9E3;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:11.5px;color:#A64B32;line-height:1.5')}>
        보유하신 포인트는 즉시 소멸하며 복구되지 않습니다.
      </div>

      <div style={s('margin-top:14px')}>
        <div style={s('font-size:11px;font-weight:700;color:#6E6252;letter-spacing:0.06em;margin-bottom:5px')}>
          탈퇴 사유 <span style={s('color:#A2957F;font-weight:600')}>· 선택</span>
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="더 나은 서비스를 만드는 데 쓰겠습니다"
          style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:10px;padding:10px 12px;font-size:13px;background:#FFFFFF;outline:none')}
        />
      </div>

      <div
        onClick={() => st.requestDeletion(reason.trim())}
        style={s('cursor:pointer;margin-top:14px;background:#A64B32;color:#FFFFFF;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700')}
      >
        탈퇴 요청하기
      </div>
      <div
        onClick={() => setOpen(false)}
        style={s('cursor:pointer;margin-top:8px;text-align:center;font-size:12.5px;color:#8A7D6C;padding:6px')}
      >
        돌아가기
      </div>
    </div>
  )
}
