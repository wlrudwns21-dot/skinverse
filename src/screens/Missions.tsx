import type { MissionView } from '../store/StoreContext'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

function MissionRow({ m }: { m: MissionView }) {
  return (
    <div onClick={m.claim} style={s(`cursor:pointer;background:${m.bg};border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px`)}>
      <div style={s(`width:24px;height:24px;border-radius:8px;background:${m.boxBg};color:#FFF;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>
        {m.mark}
      </div>
      <div style={s(`flex:1;font-size:13px;font-weight:600;${m.txtStyle}`)}>{m.label}</div>
      <div style={s('font-size:12px;font-weight:700;color:#C29A5B')}>+{m.pts} P</div>
    </div>
  )
}

export function Missions() {
  const st = useStore()

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('background:linear-gradient(140deg,#221C15,#3A3226);color:#F5F0E6;border-radius:18px;padding:18px')}>
        <div style={s('display:flex;justify-content:space-between;align-items:flex-start')}>
          <div>
            <div style={s('font-size:11px;letter-spacing:0.14em;color:#C7B99E')}>{st.t.glowPts}</div>
            <div style={s('font-family:Marcellus,serif;font-size:34px;margin-top:4px')}>{st.pointsS} P</div>
          </div>
          <div style={s('text-align:right;font-size:12px')}>
            <div style={s('background:rgba(255,255,255,0.12);border-radius:99px;padding:5px 10px;font-weight:700')}>Lv. {st.levelName}</div>
            <div style={s('margin-top:6px;color:#C7B99E')}>🔥 {st.streakLine}</div>
          </div>
        </div>
        <div style={s('margin-top:14px;font-size:11px;color:#C7B99E;display:flex;justify-content:space-between')}>
          <span>{st.levelName}</span>
          <span>{st.nextLevelS}</span>
        </div>
        <div style={s('height:6px;background:rgba(255,255,255,0.15);border-radius:99px;margin-top:5px;overflow:hidden')}>
          <div style={s(`height:100%;width:${st.levelPct};background:#C29A5B;border-radius:99px`)} />
        </div>
      </div>

      <div style={s('font-family:Marcellus,serif;font-size:17px;margin:18px 2px 8px')}>
        {st.t.daily} <span style={s("font-size:12px;color:#A2957F;font-family:'Albert Sans'")}>{st.dailyDoneS}</span>
      </div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {st.dailyList.map((m) => <MissionRow key={m.label} m={m} />)}
      </div>

      <div style={s('font-family:Marcellus,serif;font-size:17px;margin:18px 2px 8px')}>{st.t.weekly}</div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {st.weeklyList.map((m) => <MissionRow key={m.label} m={m} />)}
      </div>

      <div style={s('font-family:Marcellus,serif;font-size:17px;margin:18px 2px 8px')}>{st.t.redeem}</div>
      <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
        {st.rewardList.map((r) => (
          <div key={r.label} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:12px')}>
            <div style={s('font-size:13px;font-weight:600;line-height:1.3')}>{r.label}</div>
            <div onClick={r.redeem} style={s(`cursor:pointer;margin-top:10px;text-align:center;border-radius:999px;padding:8px;font-size:12px;font-weight:700;${r.btnStyle}`)}>
              {r.btn}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
