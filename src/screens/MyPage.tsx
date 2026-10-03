import { useState } from 'react'
import type { Lang, MetricKey } from '../data/types'
import { langOptions } from '../i18n'
import { s } from '../lib/css'
import { useAuth } from '../auth/AuthContext'
import { OrderHistory } from '../components/OrderHistory'
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
  /*
   * Shut by default.
   *
   * The chart is the tallest thing on this screen and it grows with every
   * scan, so after a few months the settings, the orders and the sign-out
   * button are all below a wall of bars. Someone opening My page usually wants
   * one of those, not the chart — and the one number they might want from it
   * is in the header, which stays visible either way.
   */
  const [open, setOpen] = useState(false)

  // An axis with too little history to chart is not offered, so the picker can
  // never lead somewhere empty.
  const chart = st.trendFor(axis) ?? st.trendFor(null)
  if (!chart) return null

  return (
    <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px;margin-top:20px')}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={s('cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px')}
      >
        <div style={s('min-width:0')}>
          <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:16px')}>{st.trendTitle}</div>
          <div style={s('font-size:11.5px;color:var(--ink-4);margin-top:2px')}>
            {open ? st.trendSub : chart.count}
          </div>
        </div>
        <div style={s('display:flex;align-items:center;gap:8px;flex-shrink:0')}>
          {/* The headline figure, so collapsing costs nothing at a glance. */}
          {!open && chart.points.length > 0 && (
            <b style={s('font-size:18px;color:var(--link)')}>
              {chart.points[chart.points.length - 1].score}
            </b>
          )}
          <span style={s(`font-size:11px;color:var(--ink-3);transition:transform .2s;transform:rotate(${open ? 180 : 0}deg)`)}>
            ▾
          </span>
        </div>
      </div>

      {open && (
        <>
      {st.cumulativeLine && (
        <div style={s('background:var(--surface);border-radius:4px;padding:9px 12px;margin-top:10px;font-size:12px;color:var(--ink-2);line-height:1.5')}>
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
                  'cursor:pointer;flex-shrink:0;font-size:11.5px;font-weight:500;border-radius:3px;padding:5px 11px;' +
                    (active
                      ? 'background:var(--accent);color:var(--on-accent)'
                      : 'background:var(--surface-2);color:var(--ink-3)'),
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
            <div style={s('font-size:10px;font-weight:500;color:var(--ink-2);margin-bottom:3px')}>{p.score}</div>
            <div style={s(`width:100%;border-radius:6px 6px 0 0;background:${p.color};height:${p.height}`)} />
          </div>
        ))}
      </div>

      <div style={s('display:flex;gap:6px;margin-top:6px;overflow-x:auto')}>
        {chart.points.map((p) => (
          <div key={p.key} style={s('flex:1;min-width:26px;text-align:center')}>
            <div style={s('font-size:9.5px;color:var(--ink-3)')}>{p.date}</div>
            {p.humidity && (
              <div style={s('font-size:9px;color:var(--ink-4);margin-top:1px')}>💧{p.humidity}</div>
            )}
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  )
}

/** How many past scans the list shows before asking to be expanded. */
const HISTORY_PREVIEW = 5

export function MyPage() {
  const st = useStore()
  const auth = useAuth()
  const email = auth.user?.email ?? ''
  const [allScans, setAllScans] = useState(false)

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('display:flex;align-items:center;gap:14px')}>
        <div style={s('width:58px;height:58px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:500;flex-shrink:0')}>
          {initials(st.state.name, email)}
        </div>
        <div style={s('min-width:0')}>
          <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:20px')}>{st.state.name || email}</div>
          <div style={s('font-size:12px;color:var(--ink-3)')}>Lv. {st.levelName} · {st.pointsS} P · 🔥 {st.streakLine}</div>
          <div style={s('font-size:11px;color:var(--ink-4);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{email}</div>
        </div>
      </div>

      {/* Bars are scaled to the range actually present, not to 0–100: skin
          scores cluster narrowly, and a fixed axis flattens a real swing into
          a row of identical bars. The humidity under each one is what makes a
          dip readable rather than alarming. */}
      <TrendCard />

      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:16px;margin:20px 2px 8px')}>{st.t.skinHistory}</div>
      {st.history.length > 0 ? (
        <div style={s('display:flex;flex-direction:column;gap:8px')}>
          {/* Same problem as the chart: this list is unbounded and everything
              useful sits under it. The newest few are what people look at. */}
          {(allScans ? st.history : st.history.slice(0, HISTORY_PREVIEW)).map((h, i) => (
            <div key={h.date + i} style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center')}>
              <div>
                <div style={s('font-size:13px;font-weight:500')}>{h.date}</div>
                <div style={s('font-size:11.5px;color:var(--ink-3)')}>{h.type}</div>
              </div>
              <div style={s(`font-size:16px;font-weight:500;color:${h.color}`)}>{h.score}</div>
            </div>
          ))}
          {st.history.length > HISTORY_PREVIEW && (
            <div
              onClick={() => setAllScans((v) => !v)}
              style={s('cursor:pointer;border:1px solid var(--line-2);border-radius:3px;padding:9px;text-align:center;font-size:12px;font-weight:500;color:var(--ink-3);background:var(--surface)')}
            >
              {allScans ? st.t.showLess : st.t.showAll(st.history.length - HISTORY_PREVIEW)}
            </div>
          )}
        </div>
      ) : (
        <div style={s('border:1px dashed var(--line-2);border-radius:4px;padding:16px;font-size:12px;color:var(--ink-3);text-align:center;line-height:1.5')}>
          {st.t.noScan}
        </div>
      )}

      {st.savedRoutineCount > 0 && (
        <>
          <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:16px;margin:18px 2px 8px')}>{st.t.routineTitle}</div>
          <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:12px 14px;font-size:13px;font-weight:500')}>
            {st.a.savedRoutines(st.savedRoutineCount)}
          </div>
        </>
      )}

      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:16px;margin:18px 2px 8px')}>{st.t.orders}</div>
      <OrderHistory />

      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:16px;margin:18px 2px 8px')}>{st.t.settings}</div>
      <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;overflow:hidden;font-size:13px')}>
        <div style={s('padding:13px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line)')}>
          <span>{st.t.language}</span>
          <select
            value={st.lang}
            onChange={(e) => st.setLang(e.target.value as Lang)}
            style={s('border:1px solid var(--line-2);border-radius:4px;padding:6px 8px;font-size:12px;font-weight:500;background:var(--surface);outline:none;cursor:pointer')}
          >
            {langOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.full}</option>
            ))}
          </select>
        </div>
        <div style={s('padding:13px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line)')}>
          <span>{st.t.currency}</span>
          <select
            value={st.currency}
            onChange={(e) => st.setCurrency(e.target.value)}
            style={s('border:1px solid var(--line-2);border-radius:4px;padding:6px 8px;font-size:12px;font-weight:500;background:var(--surface);outline:none;cursor:pointer')}
          >
            {st.currencyOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div style={s('padding:13px 14px;display:flex;justify-content:space-between;border-bottom:1px solid var(--line)')}>
          <span>{st.t.shipRegion}</span>
          <b>{st.state.country}</b>
        </div>
        <div onClick={st.toggleNotif} style={s('cursor:pointer;padding:13px 14px;display:flex;justify-content:space-between;align-items:center')}>
          <span>{st.t.reminders}</span>
          <div style={s(`width:40px;height:24px;border-radius:99px;background:${st.notifBg};position:relative;transition:background .2s`)}>
            <div style={s(`position:absolute;top:3px;left:${st.notifLeft};width:18px;height:18px;border-radius:50%;background:var(--surface);transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,0.25)`)} />
          </div>
        </div>
      </div>

      <div
        onClick={st.goSupport}
        style={s('cursor:pointer;margin-top:18px;background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:14px;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500')}
      >
        <span>💬 {st.a.support}</span>
        <span style={s('color:var(--ink-4)')}>→</span>
      </div>

      <div
        onClick={st.signOut}
        style={s('cursor:pointer;margin-top:10px;border:1px solid var(--line-2);border-radius:3px;padding:13px;text-align:center;font-size:13px;font-weight:500;color:var(--ink-3);background:var(--surface)')}
      >
        {st.a.logOut}
      </div>

      <Withdraw />

      {/* Findable after signup too, not only at the moment of agreeing. */}
      <div style={s('display:flex;justify-content:center;gap:14px;margin-top:20px;font-size:12px;color:var(--ink-3)')}>
        <span onClick={() => st.goLegal('terms')} style={s('cursor:pointer')}>이용약관</span>
        <span style={s('color:var(--on-dark-2)')}>·</span>
        <span onClick={() => st.goLegal('privacy')} style={s('cursor:pointer;font-weight:500;color:var(--ink-2)')}>
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
      <div style={s('background:var(--surface-2);border:1px solid var(--warn-mid);border-radius:4px;padding:14px 16px;margin-top:20px')}>
        <div style={s('font-size:13px;font-weight:500;color:var(--warn)')}>탈퇴 요청 처리 중</div>
        <div style={s('font-size:12px;color:var(--warn);margin-top:6px;line-height:1.6')}>
          요청이 접수되었습니다. 배송 중인 주문이 있는지 확인한 뒤 처리해드립니다.
          <br />
          처리가 끝나기 전까지는 취소하실 수 있습니다.
        </div>
        <div
          onClick={st.cancelDeletion}
          style={s('cursor:pointer;margin-top:12px;background:var(--surface);border:1px solid var(--line-2);border-radius:3px;padding:11px;text-align:center;font-size:12.5px;font-weight:500;color:var(--ink-2)')}
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
          style={s('cursor:pointer;font-size:12px;color:var(--ink-4);text-decoration:underline')}
        >
          회원 탈퇴
        </span>
      </div>
    )
  }

  return (
    <div style={s('background:var(--surface);border:1px solid var(--warn-mid);border-radius:4px;padding:16px;margin-top:20px')}>
      <div style={s('font-size:13.5px;font-weight:500;color:var(--warn)')}>정말 탈퇴하시겠어요?</div>

      <div style={s('font-size:12px;color:var(--ink-2);margin-top:10px;line-height:1.7')}>
        <b>삭제되는 것</b>
        <br />
        계정과 로그인 정보, 피부 분석 기록 전체, 루틴 기록, 장바구니, 보유 포인트
      </div>

      {/* Said plainly here rather than buried in the privacy policy, because
          "왜 아직 내 이름이 남아 있냐"는 탈퇴 후에 나오는 질문입니다. */}
      <div style={s('font-size:12px;color:var(--ink-2);margin-top:10px;line-height:1.7')}>
        <b>법령에 따라 보관되는 것</b>
        <br />
        주문·결제 기록 5년, 문의 기록 3년 (전자상거래법). 이 기록은 계정과의 연결이
        끊긴 상태로 보관되며, 로그인해서 볼 수는 없습니다.
      </div>

      <div style={s('background:var(--surface-2);border-radius:4px;padding:10px 12px;margin-top:12px;font-size:11.5px;color:var(--warn);line-height:1.5')}>
        보유하신 포인트는 즉시 소멸하며 복구되지 않습니다.
      </div>

      <div style={s('margin-top:14px')}>
        <div style={s('font-size:11px;font-weight:500;color:var(--ink-2);letter-spacing:0.06em;margin-bottom:5px')}>
          탈퇴 사유 <span style={s('color:var(--ink-4);font-weight:500')}>· 선택</span>
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="더 나은 서비스를 만드는 데 쓰겠습니다"
          style={s('width:100%;box-sizing:border-box;border:1px solid var(--line-2);border-radius:4px;padding:10px 12px;font-size:13px;background:var(--surface);outline:none')}
        />
      </div>

      <div
        onClick={() => st.requestDeletion(reason.trim())}
        style={s('cursor:pointer;margin-top:14px;background:var(--warn);color:var(--on-dark);border-radius:3px;padding:13px;text-align:center;font-size:13px;font-weight:500')}
      >
        탈퇴 요청하기
      </div>
      <div
        onClick={() => setOpen(false)}
        style={s('cursor:pointer;margin-top:8px;text-align:center;font-size:12.5px;color:var(--ink-3);padding:6px')}
      >
        돌아가기
      </div>
    </div>
  )
}
