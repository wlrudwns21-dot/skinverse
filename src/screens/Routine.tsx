import { cityNames } from '../data/cities'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function Routine() {
  const st = useStore()
  const w = st.weather

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:center;gap:10px')}>
        <div>
          <div style={s('font-family:Marcellus,serif;font-size:22px')}>{st.t.routineTitle}</div>
          <div style={s('font-size:12px;color:#8A7D6C')}>{st.t.routineSub}</div>
        </div>
        <select
          value={st.state.city}
          onChange={(e) => st.setCity(e.target.value)}
          style={s('border:1px solid #D8CFBF;border-radius:10px;padding:8px 10px;font-size:12px;background:#FFFFFF;outline:none')}
        >
          {cityNames.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px')}>
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:12px;text-align:center')}>
          <div style={s('font-size:20px;font-weight:700')}>{w.t}°</div>
          <div style={s('font-size:11px;color:#8A7D6C')}>{st.t.temp}</div>
        </div>
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:12px;text-align:center')}>
          <div style={s('font-size:20px;font-weight:700')}>{w.h}%</div>
          <div style={s('font-size:11px;color:#8A7D6C')}>{st.t.humidity}</div>
        </div>
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:12px;text-align:center')}>
          <div style={s(`font-size:20px;font-weight:700;color:${st.uvColor}`)}>{w.uv}</div>
          <div style={s('font-size:11px;color:#8A7D6C')}>UV</div>
        </div>
      </div>

      <div style={s('background:#221C15;color:#EFE8DA;border-radius:14px;padding:14px;margin-top:10px;font-size:13px;line-height:1.55')}>
        <b style={s('color:#C7B99E')}>{st.t.adjust}</b>
        <br />
        {st.wAdvice}
      </div>

      <div style={s('font-family:Marcellus,serif;font-size:17px;margin:18px 2px 8px')}>{st.t.morning} ☀</div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {st.amSteps.map((step) => (
          <div key={step.n} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center')}>
            <div style={s('width:26px;height:26px;border-radius:50%;background:#EAF1EC;color:#2E6B58;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0')}>{step.n}</div>
            <div>
              <div style={s('font-size:13px;font-weight:600')}>{step.name}</div>
              <div style={s('font-size:11.5px;color:#8A7D6C')}>{step.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={s('font-family:Marcellus,serif;font-size:17px;margin:18px 2px 8px')}>{st.t.evening} ☾</div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {st.pmSteps.map((step) => (
          <div key={step.n} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center')}>
            <div style={s('width:26px;height:26px;border-radius:50%;background:#F1EAF3;color:#6B4B78;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0')}>{step.n}</div>
            <div>
              <div style={s('font-size:13px;font-weight:600')}>{step.name}</div>
              <div style={s('font-size:11.5px;color:#8A7D6C')}>{step.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div onClick={st.goMissions} style={s('cursor:pointer;margin-top:16px;background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:13px 14px;font-size:13px;display:flex;justify-content:space-between;align-items:center')}>
        <b>{st.t.completeCta}</b>
        <span style={s('font-weight:700;color:#C29A5B')}>→</span>
      </div>
    </div>
  )
}
