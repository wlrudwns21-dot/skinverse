import { cityNames, CURRENT_LOCATION } from '../data/cities'
import { storiesHomeCta } from '../data/stories'
import { PhotoBanner } from '../components/PhotoBanner'
import { PlanBasis } from '../components/PlanBasis'
import { RefreshIcon } from '../components/RefreshIcon'
import { RoutineAdherence } from '../components/RoutineAdherence'
import { RoutineCheck } from '../components/RoutineCheck'
import { CoreTipCard } from './Stories'
import { s } from '../lib/css'
import { BTN, DISPLAY, EYEBROW, GUTTER, KICKER, NUMERAL, RULE } from '../lib/ui'
import { skyFor, skyImage } from '../weather/sky'
import { useStore } from '../store/StoreContext'

export function Routine() {
  const st = useStore()
  const w = st.weather
  const sky = skyFor(w.code)

  return (
    <div style={s('animation:rise .4s ease both;padding-bottom:4px')}>
      <div style={s(`${GUTTER};padding-top:22px`)}>
        <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:12px')}>
          <div style={s('min-width:0')}>
            <div style={s(KICKER)}>routine</div>
            <div style={s(`${DISPLAY};font-size:24px;margin-top:8px`)}>{st.t.routineTitle}</div>
            <div style={s('font-size:12px;color:var(--ink-3);margin-top:5px;line-height:1.6')}>{st.t.routineSub}</div>
          </div>
          <select
            value={st.state.city}
            onChange={(e) => {
              if (e.target.value === CURRENT_LOCATION) st.requestLocation()
              else st.setCity(e.target.value)
            }}
            style={s('border:none;border-bottom:1px solid var(--line-2);border-radius:0;padding:6px 2px;font-size:12px;letter-spacing:0.04em;background:transparent;color:var(--ink-2);outline:none;max-width:132px;flex-shrink:0;cursor:pointer')}
          >
            <option value={CURRENT_LOCATION}>📍 {st.a.currentLocation}</option>
            {cityNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Where the numbers come from, said plainly: a live reading, a sample
            value, or a location request still in flight or refused. Written as
            one quiet line — it is a footnote to the readings below, and six
            coloured pills made it look like the point of the screen. */}
        <div style={s('display:flex;align-items:center;gap:10px;margin-top:18px;flex-wrap:wrap;font-size:11px;letter-spacing:0.04em')}>
          <span style={s(`color:${st.weatherIsLive ? 'var(--accent)' : 'var(--ink-4)'}`)}>
            {st.weatherIsLive ? '● ' + st.a.liveWeather : st.a.sampleWeather}
          </span>
          <span style={s('color:var(--ink-3)')}>{st.placeLabel}</span>
          {st.weatherAgo && <span style={s('color:var(--ink-4)')}>{st.weatherAgo}</span>}
          {/* The reading refreshes itself every two hours; this is for the
              visitor who has just walked outside and does not want to wait. */}
          <span
            onClick={st.refreshWeather}
            style={s('cursor:pointer;color:var(--accent);display:inline-flex;align-items:center;gap:5px;border-bottom:1px solid var(--accent-mid);padding-bottom:1px')}
          >
            {!st.weatherBusy && <RefreshIcon />}
            {st.weatherBusy ? st.refreshingLabel : st.refreshLabel}
          </span>
          {!st.usingLocation && (
            <span onClick={st.requestLocation} style={s('cursor:pointer;color:var(--accent);border-bottom:1px solid var(--accent-mid);padding-bottom:1px')}>
              {st.a.useMyLocation}
            </span>
          )}
        </div>

        {st.geoStatus === 'asking' && (
          <div style={s('margin-top:12px;font-size:12.5px;color:var(--ink-3)')}>{st.a.locating}</div>
        )}
        {(st.geoStatus === 'denied' || st.geoStatus === 'unavailable') && (
          <div style={s('margin-top:12px;font-size:12.5px;color:var(--warn);line-height:1.6;display:flex;justify-content:space-between;gap:10px;align-items:baseline')}>
            <span>{st.geoStatus === 'denied' ? st.a.locationDenied : st.a.locationUnavailable}</span>
            <span onClick={st.clearLocation} style={s('cursor:pointer;font-weight:500;white-space:nowrap;flex-shrink:0;border-bottom:1px solid currentColor')}>
              {st.a.pickCity}
            </span>
          </div>
        )}

        {/* The same three readings, in the same shape, as the home screen. */}
        <div style={s('padding:20px 0 4px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
          <div>
            <div style={s('font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-3)')}>{st.t.temp}</div>
            <div style={s(`${NUMERAL};font-size:28px;margin-top:6px`)}>{w.t}°</div>
          </div>
          <div>
            <div style={s('font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-3)')}>{st.t.humidity}</div>
            <div style={s(`${NUMERAL};font-size:28px;margin-top:6px`)}>{w.h}%</div>
          </div>
          <div>
            <div style={s('font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-3)')}>UV</div>
            <div style={s(`${NUMERAL};font-size:28px;margin-top:6px;color:${st.uvColor}`)}>{w.uv}</div>
          </div>
        </div>
      </div>

      {/* The three readings that decide the plan, each with what it changes.
          Showing the criteria beats an unexplained list of products. */}
      {/* The sky behind the reading changes with the sky outside: the forecast
          reports a WMO code, and four backdrops cover every value it can take.
          It runs light rather than dark — a black slab was the heaviest thing
          on the screen, and a photograph of weather is the thing this block is
          actually about. A sky nobody has photographed yet falls back to a
          flat tint, and the readings are unaffected either way. */}
      <div style={s('margin-top:14px')}>
        <PhotoBanner src={skyImage(sky)} ratio="390/260" tint="var(--accent-soft)" tone="light">
          <div style={s(EYEBROW)}>{st.basisTitle}</div>
          <div style={s('font-size:11.5px;color:var(--banner-ink-2);margin-top:7px;line-height:1.6')}>
            {st.basisHint}
          </div>

          <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:13px')}>
            {[
              { key: 'temp', v: st.bands.temp },
              { key: 'humidity', v: st.bands.humidity },
              { key: 'uv', v: st.bands.uv },
            ].map((row) => (
              <div key={row.key} style={s('min-width:0')}>
                <div style={s('font-size:12.5px;font-weight:500;color:var(--banner-ink)')}>
                  {row.v.value}
                  <span style={s('color:var(--banner-warn)')}> · {row.v.label}</span>
                </div>
                <div style={s('font-size:12px;color:var(--banner-ink-2);line-height:1.5;margin-top:2px')}>
                  {row.v.why}
                </div>
              </div>
            ))}
          </div>
        </PhotoBanner>
      </div>

      {/* The working behind the steps below. Collapsed by default — someone who
          just wants the routine should get the routine, and someone who wants to
          know why gets the measurements in the units they were taken in. */}
      <div style={s(GUTTER)}>
        <PlanBasis plan={st.plan} weather={st.weatherNow} lang={st.lang} t={st.basisT} />
      </div>

      {/* Today's progress, before the steps themselves — a customer coming
          back at 9pm wants to know what is left, not to re-read the list. */}
      <div style={s('background:var(--panel);color:var(--on-dark);padding:18px 20px;margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px')}>
        <div style={s('min-width:0')}>
          <div style={s('font-size:13px;font-weight:500')}>
            {st.todayAdherence.done === st.todayAdherence.total && st.todayAdherence.total > 0
              ? st.checkT.allDone
              : st.checkT.doneToday(st.todayAdherence.done, st.todayAdherence.total)}
          </div>
          <div style={s('font-size:11.5px;color:var(--on-dark-2);margin-top:2px')}>{st.checkT.sub}</div>
        </div>
        <div style={s('width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;background:conic-gradient(var(--accent) ' + st.todayAdherence.pct + '%, rgba(255,255,255,0.14) 0)')}>
          <div style={s('width:34px;height:34px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center')}>
            {st.todayAdherence.pct}%
          </div>
        </div>
      </div>

      <div style={s(GUTTER)}>
      {!st.isMember && (
        <div style={s('padding:14px 0;font-size:12.5px;color:var(--warn);line-height:1.6;border-bottom:1px solid var(--line)')}>
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
          style={s('cursor:pointer;text-align:center;font-size:12px;font-weight:500;color:var(--accent);margin-top:10px')}
        >
          {storiesHomeCta[st.lang]} →
        </div>
      </div>

      <div onClick={st.saveRoutine} style={s(`${BTN};margin-top:20px`)}>
        {st.a.saveRoutineCta}
        {!st.isMember && <span style={s('font-size:11px;opacity:.72')}> · {st.a.signUp}</span>}
      </div>

      {st.isMember && st.savedRoutineCount > 0 && (
        <div style={s('text-align:center;font-size:12px;color:var(--ink-3);margin-top:10px')}>
          {st.a.savedRoutines(st.savedRoutineCount)}
        </div>
      )}

      <div style={s(`${RULE};margin-top:22px`)} />
      <div onClick={st.goMissions} style={s('cursor:pointer;padding:16px 0 4px;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:10px')}>
        <span>{st.t.completeCta}</span>
        <span style={s('color:var(--ink-4);flex-shrink:0')}>→</span>
      </div>
      </div>
    </div>
  )
}
