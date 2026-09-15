import { cityNames, CURRENT_LOCATION } from '../data/cities'
import { storiesHomeCta } from '../data/stories'
import { PlanBasis } from '../components/PlanBasis'
import { RefreshIcon } from '../components/RefreshIcon'
import { RoutineAdherence } from '../components/RoutineAdherence'
import { RoutineCheck } from '../components/RoutineCheck'
import { CoreTipCard } from './Stories'
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
          onChange={(e) => {
            if (e.target.value === CURRENT_LOCATION) st.requestLocation()
            else st.setCity(e.target.value)
          }}
          style={s('border:1px solid #D8CFBF;border-radius:10px;padding:8px 10px;font-size:12px;background:#FFFFFF;outline:none;max-width:140px')}
        >
          <option value={CURRENT_LOCATION}>📍 {st.a.currentLocation}</option>
          {cityNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Where the numbers come from, said plainly: a live reading, a sample
          value, or a location request still in flight or refused. */}
      <div style={s('display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap')}>
        <span style={s('font-size:11px;font-weight:700;border-radius:999px;padding:4px 9px;' + (st.weatherIsLive ? 'background:#EAF1EC;color:#2E6B58' : 'background:#EFE9DD;color:#8A7D6C'))}>
          {st.weatherIsLive ? '● ' + st.a.liveWeather : st.a.sampleWeather}
        </span>
        <span style={s('font-size:12px;color:#8A7D6C')}>{st.placeLabel}</span>
        {st.weatherAgo && (
          <span style={s('font-size:11.5px;color:#B9AC93')}>· {st.weatherAgo}</span>
        )}
        {/* The reading refreshes itself every two hours; this is for the
            visitor who has just walked outside and does not want to wait. */}
        <span
          onClick={st.refreshWeather}
          style={s('cursor:pointer;font-size:11.5px;font-weight:700;color:#2E6B58;border:1px solid #CFE0D4;background:#EAF1EC;border-radius:999px;padding:3px 10px;display:inline-flex;align-items:center;gap:5px')}
        >
          {!st.weatherBusy && <RefreshIcon />}
          {st.weatherBusy ? st.refreshingLabel : st.refreshLabel}
        </span>
        {!st.usingLocation && (
          <span onClick={st.requestLocation} style={s('cursor:pointer;font-size:12px;color:#2E6B58;font-weight:600;text-decoration:underline')}>
            📍 {st.a.useMyLocation}
          </span>
        )}
      </div>

      {st.geoStatus === 'asking' && (
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:11px 14px;margin-top:8px;font-size:12.5px;color:#6E6252')}>
          {st.a.locating}
        </div>
      )}
      {(st.geoStatus === 'denied' || st.geoStatus === 'unavailable') && (
        <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:12px;padding:11px 14px;margin-top:8px;font-size:12.5px;color:#9A8455;line-height:1.5;display:flex;justify-content:space-between;gap:10px;align-items:center')}>
          <span>{st.geoStatus === 'denied' ? st.a.locationDenied : st.a.locationUnavailable}</span>
          <span onClick={st.clearLocation} style={s('cursor:pointer;font-weight:700;color:#C29A5B;white-space:nowrap;flex-shrink:0')}>
            {st.a.pickCity}
          </span>
        </div>
      )}

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

      {/* The three readings that decide the plan, each with what it changes.
          Showing the criteria beats an unexplained list of products. */}
      <div style={s('background:#221C15;color:#EFE8DA;border-radius:14px;padding:16px;margin-top:10px')}>
        <div style={s('font-size:11px;letter-spacing:0.12em;color:#C7B99E;font-weight:700')}>{st.basisTitle}</div>
        <div style={s('font-size:11.5px;color:#9A8F7C;margin-top:4px')}>{st.basisHint}</div>

        <div style={s('display:flex;flex-direction:column;gap:11px;margin-top:13px')}>
          {[
            { key: 'temp', icon: '🌡', v: st.bands.temp },
            { key: 'humidity', icon: '💧', v: st.bands.humidity },
            { key: 'uv', icon: '☀', v: st.bands.uv },
          ].map((row) => (
            <div key={row.key} style={s('display:flex;gap:10px;align-items:flex-start')}>
              <span style={s('font-size:13px;flex-shrink:0;width:18px')}>{row.icon}</span>
              <div style={s('min-width:0')}>
                <div style={s('font-size:12.5px;font-weight:700')}>
                  {row.v.value}
                  <span style={s('color:#C7B99E;font-weight:600')}> · {row.v.label}</span>
                </div>
                <div style={s('font-size:12px;color:#BDB2A0;line-height:1.5;margin-top:2px')}>{row.v.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The working behind the steps below. Collapsed by default — someone who
          just wants the routine should get the routine, and someone who wants to
          know why gets the measurements in the units they were taken in. */}
      <PlanBasis plan={st.plan} weather={st.weatherNow} lang={st.lang} t={st.basisT} />

      {/* Today's progress, before the steps themselves — a customer coming
          back at 9pm wants to know what is left, not to re-read the list. */}
      <div style={s('background:#221C15;color:#F0EADC;border-radius:14px;padding:14px 16px;margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px')}>
        <div style={s('min-width:0')}>
          <div style={s('font-size:13px;font-weight:700')}>
            {st.todayAdherence.done === st.todayAdherence.total && st.todayAdherence.total > 0
              ? st.checkT.allDone
              : st.checkT.doneToday(st.todayAdherence.done, st.todayAdherence.total)}
          </div>
          <div style={s('font-size:11.5px;color:#9A8F7C;margin-top:2px')}>{st.checkT.sub}</div>
        </div>
        <div style={s('width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:conic-gradient(#C29A5B ' + st.todayAdherence.pct + '%, rgba(255,255,255,0.14) 0)')}>
          <div style={s('width:34px;height:34px;border-radius:50%;background:#221C15;display:flex;align-items:center;justify-content:center')}>
            {st.todayAdherence.pct}%
          </div>
        </div>
      </div>

      {!st.isMember && (
        <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:12px;padding:11px 14px;margin-top:10px;font-size:12.5px;color:#9A8455;line-height:1.5')}>
          {st.checkT.memberOnly}
        </div>
      )}

      <RoutineCheck slot="am" steps={st.amList} heading={st.t.morning + ' ☀'} />
      <RoutineCheck slot="pm" steps={st.pmList} heading={st.t.evening + ' ☾'} />

      <RoutineAdherence />

      {/* The one principle behind the steps above, in full. A routine tells you
          what to do; this is the reason it works, and the routine screen is the
          moment a customer is actually thinking about it. */}
      <div style={s('margin-top:18px')}>
        <CoreTipCard lang={st.lang} onOpen={st.goStories} />
        <div
          onClick={st.goStories}
          style={s('cursor:pointer;text-align:center;font-size:12px;font-weight:600;color:#2E6B58;margin-top:10px')}
        >
          {storiesHomeCta[st.lang]} →
        </div>
      </div>

      <div
        onClick={st.saveRoutine}
        style={s('cursor:pointer;margin-top:16px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700')}
      >
        {st.a.saveRoutineCta}
        {!st.isMember && <span style={s('font-size:11px;font-weight:600;opacity:.7')}> · {st.a.signUp}</span>}
      </div>

      {st.isMember && st.savedRoutineCount > 0 && (
        <div style={s('text-align:center;font-size:12px;color:#8A7D6C;margin-top:10px')}>
          {st.a.savedRoutines(st.savedRoutineCount)}
        </div>
      )}

      <div onClick={st.goMissions} style={s('cursor:pointer;margin-top:12px;background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:13px 14px;font-size:13px;display:flex;justify-content:space-between;align-items:center')}>
        <b>{st.t.completeCta}</b>
        <span style={s('font-weight:700;color:#C29A5B')}>→</span>
      </div>
    </div>
  )
}
