import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/**
 * What the routine actually added up to, day by day, with the scans on it.
 *
 * Two facts on one timeline, because separately neither settles anything. A
 * column of adherence bars says a customer was diligent; a line of scan scores
 * says their skin improved; only the two together suggest the first had
 * anything to do with the second — and only the two together let a customer see
 * that the fortnight they skipped is the fortnight the score stalled.
 *
 * The bars split morning from evening rather than averaging them. A routine
 * half-done every day is a specific, fixable habit, and an overall percentage
 * hides which half is being dropped.
 */

/** Bar heights are a share of the day's own total, so a fuller routine is not punished. */
const BAR_H = 66

export function RoutineAdherence() {
  const st = useStore()
  const c = st.checkT
  const days = st.adherenceDays
  const scans = st.adherenceScans

  const anything = days.some((day) => day.done > 0)

  return (
    <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px;margin-top:14px')}>
      <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
        <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:16px')}>{c.historyTitle}</div>
        <div style={s('font-size:11px;color:var(--ink-4);flex-shrink:0')}>{c.rate(st.routineRate)}</div>
      </div>
      <div style={s('font-size:11.5px;color:var(--ink-4);margin-top:2px')}>{c.historySub}</div>

      <div style={s('display:flex;gap:8px;margin-top:11px;flex-wrap:wrap')}>
        <span style={s('font-size:11.5px;font-weight:500;background:var(--surface-2);color:var(--accent);border-radius:3px;padding:4px 10px')}>
          🔥 {c.streak(st.routineStreak.current)}
        </span>
        <span style={s('font-size:11.5px;font-weight:500;background:var(--surface-2);color:var(--ink-3);border-radius:3px;padding:4px 10px')}>
          {c.bestStreak(st.routineStreak.best)}
        </span>
      </div>

      {anything || scans.length > 0 ? (
        <>
          {/* The chart. Morning sits under evening in one column so a day reads
              as a single mark, and the scan dot floats over the day it was
              taken rather than beside it. */}
          <div style={s(`position:relative;display:flex;align-items:flex-end;gap:2px;height:${BAR_H + 22}px;margin-top:14px;overflow-x:auto;padding-top:16px`)}>
            {days.map((day) => {
              const scan = scans.find((entry) => entry.day === day.day)
              const amH = day.am.total ? (day.am.done / day.am.total) * (BAR_H / 2) : 0
              const pmH = day.pm.total ? (day.pm.done / day.pm.total) * (BAR_H / 2) : 0
              return (
                <div
                  key={day.day}
                  style={s(`flex:1;min-width:7px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:${BAR_H}px;position:relative`)}
                >
                  {scan && (
                    <div
                      title={`${day.day} · ${scan.overall}`}
                      style={s(`position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:7px;height:7px;border-radius:50%;background:${scan.colour};box-shadow:0 0 0 2px var(--line)`)}
                    />
                  )}
                  {/* Evening on top, morning below — the order of the day read
                      upwards, so the stack matches the routine it describes. */}
                  <div style={s(`width:100%;height:${pmH}px;background:var(--viz-4);border-radius:3px 3px 0 0`)} />
                  <div style={s(`width:100%;height:${amH}px;background:var(--accent);margin-top:1px;border-radius:${pmH ? '0' : '3px 3px 0 0'}`)} />
                  <div style={s('width:100%;height:2px;background:var(--surface-2);margin-top:1px;border-radius:99px')} />
                </div>
              )
            })}
          </div>

          <div style={s('display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:10.5px;color:var(--ink-3)')}>
            <span><b style={s('color:var(--accent)')}>■</b> {st.t.morning}</span>
            <span><b style={s('color:var(--viz-4)')}>■</b> {st.t.evening}</span>
            <span style={s('color:var(--ink-4)')}>{c.scanDot}</span>
          </div>
        </>
      ) : (
        <div style={s('border:1px dashed var(--line-2);border-radius:4px;padding:16px;margin-top:12px;font-size:12px;color:var(--ink-3);text-align:center;line-height:1.5')}>
          {c.noHistory}
        </div>
      )}
    </div>
  )
}
