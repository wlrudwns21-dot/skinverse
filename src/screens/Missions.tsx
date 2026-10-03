import type { MissionView } from '../store/StoreContext'
import { s } from '../lib/css'
import { DISPLAY, EYEBROW, GUTTER, KICKER, NUMERAL, RULE } from '../lib/ui'
import { useStore } from '../store/StoreContext'

/**
 * One mission, as a row rather than a card.
 *
 * Six bordered boxes stacked on top of each other read as six separate
 * things to decide about. They are one list, so they get one list's shape: a
 * hairline between each, and the only thing that changes when a mission is
 * done is the box on the left and the weight of its text.
 */
function MissionRow({ m }: { m: MissionView }) {
  const done = Boolean(m.mark)
  return (
    <div
      onClick={m.claim}
      style={s('cursor:pointer;display:flex;align-items:center;gap:13px;padding:14px 0;border-top:1px solid var(--line)')}
    >
      <div
        style={s(
          'width:18px;height:18px;border-radius:2px;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
            (done
              ? 'background:var(--accent);color:var(--on-accent)'
              : 'border:1px solid var(--line-2)'),
        )}
      >
        {m.mark}
      </div>
      <div style={s(`flex:1;min-width:0;font-size:13px;line-height:1.5;${done ? 'color:var(--ink-3)' : ''}`)}>
        {m.label}
      </div>
      <div style={s(`font-size:11.5px;flex-shrink:0;letter-spacing:0.04em;color:${done ? 'var(--ink-4)' : 'var(--accent)'}`)}>
        +{m.pts} P
      </div>
    </div>
  )
}

export function Missions() {
  const st = useStore()

  return (
    <div style={s('animation:rise .4s ease both;padding-bottom:4px')}>
      {/* The balance, full bleed. It is the one number anyone opens this screen
          for, so it gets the width of the screen and the weight of a reading
          rather than a card's worth of padding around it. */}
      <div style={s('background:var(--ink);color:var(--on-dark);padding:24px 20px 22px')}>
        <div style={s('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
          <div style={s('min-width:0')}>
            <div style={s(EYEBROW)}>{st.t.glowPts}</div>
            <div style={s(`${NUMERAL};font-size:46px;margin-top:10px`)}>
              {st.pointsS} <span style={s('font-size:18px;letter-spacing:0.08em')}>P</span>
            </div>
          </div>
          <div style={s('text-align:right;flex-shrink:0')}>
            <div style={s('font-size:11px;letter-spacing:0.08em;color:var(--on-dark)')}>Lv. {st.levelName}</div>
            <div style={s('font-size:11px;color:var(--warn-on-dark);margin-top:6px')}>🔥 {st.streakLine}</div>
          </div>
        </div>

        {/* How far to the next level, as a line rather than a pill. */}
        <div style={s('margin-top:20px;display:flex;justify-content:space-between;font-size:10px;letter-spacing:0.08em;color:var(--on-dark-2)')}>
          <span>{st.levelName}</span>
          <span>{st.nextLevelS}</span>
        </div>
        <div style={s('height:1px;background:rgba(255,255,255,0.22);margin-top:7px')}>
          <div style={s(`height:1px;width:${st.levelPct};background:var(--on-dark)`)} />
        </div>
      </div>

      <div style={s(`${GUTTER};padding-top:26px`)}>
        <div style={s('display:flex;align-items:baseline;justify-content:space-between;padding-bottom:4px')}>
          <span style={s(KICKER)}>{st.t.daily}</span>
          <span style={s('font-size:11px;color:var(--ink-3);letter-spacing:0.06em')}>{st.dailyDoneS}</span>
        </div>
        {st.dailyList.map((m) => <MissionRow key={m.label} m={m} />)}

        <div style={s('display:flex;align-items:baseline;justify-content:space-between;padding:28px 0 4px')}>
          <span style={s(KICKER)}>{st.t.weekly}</span>
        </div>
        {st.weeklyList.map((m) => <MissionRow key={m.label} m={m} />)}

        <div style={s('padding:28px 0 14px')}>
          <span style={s(KICKER)}>{st.t.redeem}</span>
        </div>
      </div>

      {/* What the points are for. Two across, with the cost under the name the
          way a price sits under a product, because that is what this is. */}
      <div style={s(`${GUTTER};display:grid;grid-template-columns:1fr 1fr;gap:22px 13px`)}>
        {st.rewardList.map((r) => (
          <div key={r.label}>
            <div style={s(RULE)} />
            <div style={s(`${DISPLAY};font-size:14px;line-height:1.45;padding:12px 0 11px;min-height:40px`)}>
              {r.label}
            </div>
            <div
              onClick={r.redeem}
              style={s(`text-align:center;border-radius:3px;padding:9px;font-size:11.5px;font-weight:500;letter-spacing:0.04em;${r.btnStyle}`)}
            >
              {r.btn}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
