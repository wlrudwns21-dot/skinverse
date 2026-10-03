import { useState } from 'react'
import { metricDefs } from '../data/skin'
import type { Lang, MetricKey, Weather } from '../data/types'
import type { RoutinePlan } from '../routine/rules'
import { s } from '../lib/css'
import { KICKER, RULE } from '../lib/ui'

/**
 * What the routine was actually decided from.
 *
 * A routine that says "rich cream" is an instruction, and an instruction from
 * software is easy to ignore. The same routine showing the deficit it measured,
 * the dew point it checked and the hydration score it read is a position the
 * customer can examine — and, if they disagree, argue with.
 *
 * Everything shown here comes off `plan.basis`, which the rules fill in as they
 * decide. Nothing is recomputed for display, so the panel cannot drift away
 * from the routine it is explaining.
 */

export interface PlanBasisStrings {
  title: string
  sub: string
  weatherTitle: string
  faceTitle: string
  derivedTitle: string

  temp: string
  humidity: string
  uv: string

  vpd: string
  vpdHelp: string
  absHumidity: string
  absHumidityHelp: string
  dewPoint: string
  dewPointHelp: string
  occlusiveYes: string
  occlusiveNo: string

  drynessLoad: string
  sebumLoad: string
  coldStress: string
  loadHelp: string

  weakest: string
  weakestHelp: (axis: string) => string
  hydrationRead: (score: number, threshold: number) => string
  hydrationOk: (score: number, threshold: number) => string

  show: string
  hide: string
}

export interface PlanBasisProps {
  plan: RoutinePlan
  weather: Weather
  lang: Lang
  t: PlanBasisStrings
}

const axisName = (axis: MetricKey, lang: Lang) =>
  metricDefs.find((d) => d.k === axis)?.n[lang] ?? axis

/** A measured quantity with its unit and, underneath, what it is for. */
function Figure({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div style={s('flex:1;min-width:104px')}>
      <div style={s('font-size:10.5px;color:var(--ink-4)')}>{label}</div>
      <div style={s('font-size:16px;font-weight:500;color:var(--ink-2);margin-top:1px')}>{value}</div>
      {help && (
        <div style={s('font-size:10.5px;color:var(--ink-4);line-height:1.45;margin-top:3px')}>{help}</div>
      )}
    </div>
  )
}

function Load({ label, value }: { label: string; value: number }) {
  // Three ranks that have to be told apart at a glance, so they take three
  // different tokens rather than two shades of the same warm tone.
  const colour = value < 35 ? 'var(--accent)' : value < 65 ? 'var(--warn-mid)' : 'var(--danger)'
  return (
    <div style={s('flex:1;min-width:88px')}>
      <div style={s('display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:3px')}>
        <span style={s('color:var(--ink-4)')}>{label}</span>
        <span style={s(`font-weight:500;color:${colour}`)}>{value}</span>
      </div>
      <div style={s('height:4px;background:var(--surface-2);border-radius:99px;overflow:hidden')}>
        <div style={s(`height:100%;width:${value}%;background:${colour};border-radius:99px`)} />
      </div>
    </div>
  )
}

export function PlanBasis({ plan, weather, lang, t }: PlanBasisProps) {
  const [open, setOpen] = useState(false)
  const b = plan.basis

  return (
    <div>
      <div style={s(RULE)} />
      <div
        onClick={() => setOpen(!open)}
        style={s('cursor:pointer;display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:16px 0')}
      >
        <div style={s('min-width:0')}>
          <div style={s('font-size:13.5px')}>{t.title}</div>
          <div style={s('font-size:11.5px;color:var(--ink-3);margin-top:4px;line-height:1.5')}>{t.sub}</div>
        </div>
        <div style={s('font-size:11px;letter-spacing:0.06em;color:var(--accent);flex-shrink:0')}>
          {open ? t.hide : t.show}
        </div>
      </div>

      {open && (
        <div style={s('animation:rise .25s ease both')}>
          {/* What was measured outside. */}
          <div style={s(`${KICKER};margin-top:16px`)}>
            {t.weatherTitle}
          </div>
          <div style={s('display:flex;flex-wrap:wrap;gap:12px;margin-top:8px')}>
            <Figure label={t.temp} value={`${weather.t}°C`} />
            <Figure label={t.humidity} value={`${weather.h}%`} />
            <Figure label={t.uv} value={String(weather.uv)} />
          </div>

          {/* And what that actually means for skin — the part a weather app
              cannot tell you, because a percentage is not a force. */}
          <div style={s(`${KICKER};margin-top:16px`)}>
            {t.derivedTitle}
          </div>
          <div style={s('display:flex;flex-wrap:wrap;gap:12px;margin-top:8px')}>
            <Figure label={t.vpd} value={`${b.vpd} hPa`} help={t.vpdHelp} />
            <Figure label={t.absHumidity} value={`${b.absoluteHumidity} g/m³`} help={t.absHumidityHelp} />
            <Figure label={t.dewPoint} value={`${b.dewPoint}°C`} help={t.dewPointHelp} />
          </div>

          <div style={s(
            'font-size:11.5px;line-height:1.55;margin-top:10px;border-radius:4px;padding:9px 12px;' +
              (b.occlusive
                ? 'background:var(--surface-2);color:var(--accent)'
                : 'background:var(--surface);color:var(--ink-2)'),
          )}>
            {b.occlusive ? t.occlusiveYes : t.occlusiveNo}
          </div>

          <div style={s('display:flex;flex-wrap:wrap;gap:12px;margin-top:14px')}>
            <Load label={t.drynessLoad} value={b.drynessLoad} />
            <Load label={t.sebumLoad} value={b.sebumLoad} />
            <Load label={t.coldStress} value={b.coldStress} />
          </div>
          <div style={s('font-size:10.5px;color:var(--ink-4);line-height:1.5;margin-top:6px')}>
            {t.loadHelp}
          </div>

          {/* And what the scan contributed. */}
          <div style={s(`${KICKER};margin-top:18px`)}>
            {t.faceTitle}
          </div>
          <div style={s('margin-top:10px')}>
            <div style={s('font-size:12.5px;line-height:1.6;color:var(--ink-2)')}>
              <b>{t.weakest}</b> — {t.weakestHelp(axisName(plan.weakest, lang))}
            </div>
            <div style={s('font-size:12.5px;line-height:1.6;color:var(--ink-2);margin-top:8px;padding-top:8px;border-top:1px solid var(--line-2)')}>
              {b.hydration < b.dehydratedBelow
                ? t.hydrationRead(b.hydration, b.dehydratedBelow)
                : t.hydrationOk(b.hydration, b.dehydratedBelow)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
