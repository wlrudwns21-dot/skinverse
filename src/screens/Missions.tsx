import { SectionHead } from '../components/SectionHead'
import type { MissionView } from '../store/StoreContext'
import { s } from '../lib/css'
import { CARD, DISPLAY, EYEBROW, GUTTER, NUMERAL, SECTION } from '../lib/ui'
import { useStore } from '../store/StoreContext'

const countDone = (list: MissionView[]): number => list.filter((m) => m.mark).length

/**
 * What is still on the table in this block.
 *
 * Shown rather than the total because the total never moves — it is the same
 * number on the day you clear everything as on the day you clear nothing,
 * which makes it decoration. What is left does move, and goes quiet at zero.
 */
function pointsLeft(list: MissionView[]): { text: string; dim?: boolean } | undefined {
  const left = list.reduce((n, m) => (m.mark ? n : n + m.pts), 0)
  if (!list.length) return undefined
  return { text: '+' + left + ' P', dim: left === 0 }
}

/**
 * One mission, as a row rather than a card.
 *
 * Six bordered boxes stacked on top of each other read as six separate
 * things to decide about. They are one list, so they get one list's shape: a
 * hairline between each, and the only thing that changes when a mission is
 * done is the box on the left and the weight of its text.
 */
function MissionRow({ m, first }: { m: MissionView; first: boolean }) {
  const done = Boolean(m.mark)
  return (
    <div
      onClick={m.claim}
      style={s(
        'cursor:pointer;display:flex;align-items:center;gap:13px;padding:14px 16px' +
          (first ? '' : ';border-top:1px solid var(--line)'),
      )}
    >
      <div
        style={s(
          'width:18px;height:18px;border-radius:var(--radius-sm);font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
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
      <div style={s(`font-size:11.5px;flex-shrink:0;letter-spacing:0.04em;color:${done ? 'var(--ink-4)' : 'var(--link)'}`)}>
        +{m.pts} P
      </div>
    </div>
  )
}

export function Missions() {
  const st = useStore()

  return (
    <div style={s('animation:rise .4s ease both;padding-bottom:28px')}>
      {/* The balance, full bleed. It is the one number anyone opens this screen
          for, so it gets the width of the screen and the weight of a reading
          rather than a card's worth of padding around it. */}
      <div style={s('background:var(--panel);color:var(--on-panel);padding:24px 20px 26px')}>
        <div style={s('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
          <div style={s('min-width:0')}>
            <div style={s(EYEBROW)}>{st.t.glowPts}</div>
            <div style={s(`${NUMERAL};font-size:46px;margin-top:10px`)}>
              {st.pointsS} <span style={s('font-size:18px;letter-spacing:0.08em')}>P</span>
            </div>
          </div>
          <div style={s('text-align:right;flex-shrink:0')}>
            <div style={s('font-size:11px;letter-spacing:0.08em;color:var(--on-panel)')}>Lv. {st.levelName}</div>
            <div style={s('font-size:11px;color:var(--warn);margin-top:6px')}>🔥 {st.streakLine}</div>
          </div>
        </div>

        {/* How far to the next level. This was a 1px fill on a 1px track,
            which on a dark panel is indistinguishable from the rule it sits
            on — the one number people come here to watch was invisible. */}
        <div style={s('margin-top:20px;display:flex;justify-content:space-between;font-size:10px;letter-spacing:0.08em;color:var(--on-panel-2)')}>
          <span>{st.levelName}</span>
          <span>{st.nextLevelS}</span>
        </div>
        <div style={s('height:4px;border-radius:var(--radius-sm);background:var(--on-panel-track);margin-top:8px;overflow:hidden')}>
          <div style={s(`height:4px;border-radius:var(--radius-sm);width:${st.levelPct};background:var(--on-panel);transition:width .35s ease`)} />
        </div>
      </div>

      <div style={s(`${GUTTER};${SECTION}`)}>
        {/* Each block says how far through it you are, and draws it. The
            points still to be had sit on the right, because that is the
            question someone opening this screen is actually asking. The rows
            then sit inside one card, so a block is visibly one list rather
            than four lines that happen to follow a heading. */}
        <SectionHead
          label={st.t.daily}
          done={countDone(st.dailyList)}
          total={st.dailyList.length}
          meta={pointsLeft(st.dailyList)}
        />
        <div style={s(`margin-top:10px;overflow:hidden;${CARD}`)}>
          {st.dailyList.map((m, i) => <MissionRow key={m.label} m={m} first={i === 0} />)}
        </div>
      </div>

      <div style={s(`${GUTTER};${SECTION}`)}>
        <SectionHead
          label={st.t.weekly}
          done={countDone(st.weeklyList)}
          total={st.weeklyList.length}
          meta={pointsLeft(st.weeklyList)}
        />
        <div style={s(`margin-top:10px;overflow:hidden;${CARD}`)}>
          {st.weeklyList.map((m, i) => <MissionRow key={m.label} m={m} first={i === 0} />)}
        </div>
      </div>

      {/* What the points are for. Two across, each one a card with the cost
          under the name the way a price sits under a product, because that is
          what this is. They used to be four names under four hairlines, which
          read as a table of contents rather than as things you can have. */}
      <div style={s(`${GUTTER};${SECTION}`)}>
        <SectionHead label={st.t.redeem} />
        <div style={s('margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          {st.rewardList.map((r) => (
            <div key={r.label} style={s(`padding:14px;display:flex;flex-direction:column;${CARD}`)}>
              <div style={s(`${DISPLAY};font-size:14px;line-height:1.45;flex:1;min-height:40px`)}>
                {r.label}
              </div>
              <div
                onClick={r.redeem}
                style={s(`margin-top:12px;text-align:center;border-radius:var(--radius-sm);padding:10px;font-size:11.5px;font-weight:500;letter-spacing:0.04em;${r.btnStyle}`)}
              >
                {r.btn}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
