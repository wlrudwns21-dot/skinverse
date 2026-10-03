import type { MissionView } from '../store/StoreContext'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

function MissionRow({ m }: { m: MissionView }) {
  return (
    <div onClick={m.claim} style={s(`cursor:pointer;background:${m.bg};border:1px solid var(--line);border-radius:4px;padding:12px 14px;display:flex;align-items:center;gap:12px`)}>
      <div style={s(`width:24px;height:24px;border-radius:4px;background:${m.boxBg};color:var(--on-dark);font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>
        {m.mark}
      </div>
      <div style={s(`flex:1;font-size:13px;font-weight:500;${m.txtStyle}`)}>{m.label}</div>
      <div style={s('font-size:12px;font-weight:500;color:var(--warn)')}>+{m.pts} P</div>
    </div>
  )
}

export function Missions() {
  const st = useStore()

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('background:var(--ink);color:var(--on-dark);border-radius:4px;padding:18px')}>
        <div style={s('display:flex;justify-content:space-between;align-items:flex-start')}>
          <div>
            <div style={s('font-size:11px;letter-spacing:0.14em;color:var(--warn-on-dark)')}>{st.t.glowPts}</div>
            <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:34px;margin-top:4px')}>{st.pointsS} P</div>
          </div>
          <div style={s('text-align:right;font-size:12px')}>
            <div style={s('background:rgba(255,255,255,0.12);border-radius:3px;padding:5px 10px;font-weight:500')}>Lv. {st.levelName}</div>
            <div style={s('margin-top:6px;color:var(--warn-on-dark)')}>🔥 {st.streakLine}</div>
          </div>
        </div>
        <div style={s('margin-top:14px;font-size:11px;color:var(--on-dark-2);display:flex;justify-content:space-between')}>
          <span>{st.levelName}</span>
          <span>{st.nextLevelS}</span>
        </div>
        <div style={s('height:6px;background:rgba(255,255,255,0.15);border-radius:99px;margin-top:5px;overflow:hidden')}>
          <div style={s(`height:100%;width:${st.levelPct};background:var(--warn-mid);border-radius:3px`)} />
        </div>
      </div>

      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:17px;margin:18px 2px 8px')}>
        {st.t.daily} <span style={s("font-size:12px;color:var(--ink-4);font-family:'Albert Sans'")}>{st.dailyDoneS}</span>
      </div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {st.dailyList.map((m) => <MissionRow key={m.label} m={m} />)}
      </div>

      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:17px;margin:18px 2px 8px')}>{st.t.weekly}</div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {st.weeklyList.map((m) => <MissionRow key={m.label} m={m} />)}
      </div>

      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:17px;margin:18px 2px 8px')}>{st.t.redeem}</div>
      <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
        {st.rewardList.map((r) => (
          <div key={r.label} style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:12px')}>
            <div style={s('font-size:13px;font-weight:500;line-height:1.3')}>{r.label}</div>
            <div onClick={r.redeem} style={s(`cursor:pointer;margin-top:10px;text-align:center;border-radius:3px;padding:8px;font-size:12px;font-weight:500;${r.btnStyle}`)}>
              {r.btn}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
