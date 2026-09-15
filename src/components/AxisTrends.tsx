import { useState } from 'react'
import type { AxisChange } from '../insights/report'
import type { Lang } from '../data/types'
import { metricDefs } from '../data/skin'
import { s } from '../lib/css'

/**
 * How each measurement has moved, on the report itself.
 *
 * The bars above this say where the skin stands today. That is the less useful
 * half: a customer who has been following the routine for a month wants to know
 * whether the thing they were working on actually moved, and the overall score
 * cannot answer it — hydration can climb eleven points while the average sits
 * still because the other five did not budge.
 *
 * Two numbers per row, because they answer different questions. "Since your
 * first scan" is whether any of this is working; "on last time" is whether the
 * last fortnight specifically did. A row can honestly show a rise on one and a
 * fall on the other, and that is a real finding rather than a contradiction.
 *
 * Sorted worst-first. Good news that scrolls off the bottom is fine; bad news
 * that does is a report that flatters.
 */

export interface AxisTrendStrings {
  title: string
  sub: string
  range: (readings: number, worst: number, best: number) => string
  firstToLatest: (first: number, latest: number) => string
  totalUp: (delta: number) => string
  totalDown: (delta: number) => string
  totalFlat: string
  stepUp: (delta: number) => string
  stepDown: (delta: number) => string
  stepFlat: string
  needsTwo: string
  scopeNote: string
}

const UP = '#2E6B58'
const DOWN = '#C25E43'
const FLAT = '#8A7D6C'

/**
 * The series as a line.
 *
 * Scaled to the range this axis actually reached, not to 0–100: a real
 * eight-point climb drawn against a full scale is a flat line, which is the
 * opposite of what the reader came for. The floor and ceiling are written
 * beside it so nobody mistakes a steep line for a big number.
 */
function Spark({ series, colour }: { series: number[]; colour: string }) {
  const w = 96
  const h = 28
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = Math.max(max - min, 1)

  const points = series
    .map((value, i) => {
      const x = series.length === 1 ? w / 2 : (i / (series.length - 1)) * w
      // 3px of padding top and bottom so the extremes are not clipped by the viewBox.
      const y = h - 3 - ((value - min) / span) * (h - 6)
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
    })
    .join(' ')

  const lastX = w
  const lastY = h - 3 - ((series[series.length - 1] - min) / span) * (h - 6)

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ flexShrink: 0, overflow: 'visible' }}>
      <polyline
        points={points}
        fill="none"
        stroke={colour}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Where it stands now, so the eye lands on the latest reading. */}
      <circle cx={lastX} cy={lastY} r="2.8" fill={colour} />
    </svg>
  )
}

function Row({ change, lang, t }: { change: AxisChange; lang: Lang; t: AxisTrendStrings }) {
  const [open, setOpen] = useState(false)
  const name = metricDefs.find((d) => d.k === change.axis)?.n[lang] ?? change.axis

  const totalColour = change.direction === 'up' ? UP : change.direction === 'down' ? DOWN : FLAT
  const totalText =
    change.direction === 'up'
      ? t.totalUp(change.delta)
      : change.direction === 'down'
        ? t.totalDown(Math.abs(change.delta))
        : t.totalFlat

  const stepColour = change.stepDirection === 'up' ? UP : change.stepDirection === 'down' ? DOWN : FLAT
  const stepText =
    change.stepDirection === 'up'
      ? t.stepUp(change.step)
      : change.stepDirection === 'down'
        ? t.stepDown(Math.abs(change.step))
        : t.stepFlat

  return (
    <div
      onClick={() => setOpen(!open)}
      style={s('cursor:pointer;border-top:1px solid #F1EEE6;padding:12px 0')}
    >
      <div style={s('display:flex;align-items:center;gap:12px')}>
        <div style={s('flex:1;min-width:0')}>
          <div style={s('display:flex;align-items:baseline;gap:7px;flex-wrap:wrap')}>
            <span style={s('font-size:13px;font-weight:700;color:#221C15')}>{name}</span>
            <span style={s('font-size:12px;color:#8A7D6C')}>
              {t.firstToLatest(change.first, change.latest)}
            </span>
          </div>
          <div style={s(`font-size:11.5px;font-weight:700;color:${totalColour};margin-top:3px`)}>
            {totalText}
          </div>
        </div>
        <Spark series={change.series} colour={totalColour} />
      </div>

      {open && (
        <div style={s('animation:rise .2s ease both;margin-top:9px;background:#F8F5EF;border-radius:10px;padding:9px 12px')}>
          <div style={s(`font-size:12px;font-weight:600;color:${stepColour}`)}>{stepText}</div>
          <div style={s('font-size:11px;color:#A2957F;margin-top:3px')}>
            {t.range(change.readings, change.worst, change.best)}
          </div>
        </div>
      )}
    </div>
  )
}

export function AxisTrends({
  changes,
  lang,
  t,
}: {
  changes: AxisChange[]
  lang: Lang
  t: AxisTrendStrings
}) {
  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:12px')}>
      <div style={s('font-family:Marcellus,serif;font-size:16px')}>{t.title}</div>
      <div style={s('font-size:11.5px;color:#A2957F;margin-top:2px')}>{t.sub}</div>

      {changes.length === 0 ? (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:16px;margin-top:12px;font-size:12.5px;color:#8A7D6C;text-align:center;line-height:1.5')}>
          {t.needsTwo}
        </div>
      ) : (
        <>
          <div style={s('margin-top:6px')}>
            {changes.map((change) => (
              <Row key={change.axis} change={change} lang={lang} t={t} />
            ))}
          </div>
          {/* Only six measurements survive into the history; the sixteen
              concerns below come back with each scan and are not stored, so
              saying which is which here prevents the obvious wrong inference. */}
          <div style={s('font-size:10.5px;color:#B9AC93;line-height:1.5;margin-top:10px')}>
            {t.scopeNote}
          </div>
        </>
      )}
    </div>
  )
}
