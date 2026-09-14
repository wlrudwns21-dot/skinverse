import type { Lang } from '../data/types'
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
            <div style={s('font-size:11.5px;color:#8A7D6C')}>{st.t.inTransit} — {order.eta}</div>
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
        onClick={st.signOut}
        style={s('cursor:pointer;margin-top:18px;border:1px solid #D8CFBF;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700;color:#8A7D6C;background:#FFFFFF')}
      >
        {st.a.logOut}
      </div>
    </div>
  )
}
