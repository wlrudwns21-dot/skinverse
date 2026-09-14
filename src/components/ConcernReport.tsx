import { useState } from 'react'
import {
  concernOf,
  GROUP_ORDER,
  groupNames,
  regionName,
  zoneHelp,
  type ConcernGroup,
  type ConcernDef,
} from '../analysis/concerns'
import type { AnalysisVisuals, SkinTypeReading } from '../analysis/perfectcorp'
import type { Lang } from '../data/types'
import { s } from '../lib/css'

/**
 * Everything the engine measured, grouped and explained.
 *
 * The summary screen draws six bars. The analysis produces sixteen readings,
 * several of them per region, and the six were only ever a headline. A customer
 * who has just paid for a measurement of their face should be able to see all
 * of it — and, more to the point, find out what "sensitivity 50" is supposed to
 * mean without leaving the app.
 *
 * Each row expands into what was measured and what a low score calls for; the
 * wording lives in src/analysis/concerns.ts alongside the vocabulary itself.
 */

export interface ConcernReportStrings {
  title: string
  sub: string
  skinType: string
  tapForMore: string
  measured: string
  whatToDo: string
}

export interface ConcernReportProps {
  visuals: AnalysisVisuals
  skinType: SkinTypeReading | null
  lang: Lang
  t: ConcernReportStrings
}

const colourFor = (score: number) => (score < 50 ? '#C25E43' : score < 70 ? '#B08133' : '#2E6B58')

interface Row {
  key: string
  def: ConcernDef
  /** Whole-face score, which is the headline for the concern. */
  score: number
  /** The per-region breakdown, when they reported one. */
  regions: { region: string; score: number }[]
}

export function ConcernReport({ visuals, skinType, lang, t }: ConcernReportProps) {
  const [open, setOpen] = useState<string | null>(null)

  // Fold the flat list of readings into one row per concern, keeping any
  // per-region detail underneath it rather than as separate top-level entries.
  const rows = new Map<string, Row>()
  for (const reading of visuals.concerns) {
    const def = concernOf(reading.key)
    if (!def) continue

    const row = rows.get(def.sd) ?? { key: def.sd, def, score: -1, regions: [] }
    if (reading.region === 'whole') row.score = reading.score
    else row.regions.push({ region: reading.region, score: reading.score })
    rows.set(def.sd, row)
  }

  // A concern with only regional readings still deserves a headline, so take
  // the worst region rather than dropping it.
  for (const row of rows.values()) {
    if (row.score < 0 && row.regions.length) {
      row.score = Math.min(...row.regions.map((r) => r.score))
    }
  }

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    rows: [...rows.values()]
      .filter((row) => row.def.group === group && row.score >= 0)
      .sort((a, b) => a.score - b.score),
  })).filter((entry) => entry.rows.length > 0)

  if (grouped.length === 0) return null

  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:12px')}>
      <div style={s('font-family:Marcellus,serif;font-size:16px')}>{t.title}</div>
      <div style={s('font-size:11.5px;color:#A2957F;margin-top:2px')}>{t.sub}</div>

      {/* The vendor's own classification, per zone. T-zone and U-zone are
          standard here and meaningless to most people elsewhere, so the
          explanation sits with the reading rather than in a help page. */}
      {skinType && (skinType.whole || skinType.tZone || skinType.uZone) && (
        <div style={s('background:#F1EEE6;border-radius:12px;padding:12px 14px;margin-top:12px')}>
          <div style={s('font-size:11.5px;color:#8A7D6C;font-weight:600')}>{t.skinType}</div>
          <div style={s('display:flex;flex-wrap:wrap;gap:10px;margin-top:6px')}>
            {([
              ['whole', skinType.whole],
              ['t_zone', skinType.tZone],
              ['u_zone', skinType.uZone],
            ] as const)
              .filter(([, label]) => !!label)
              .map(([region, label]) => (
                <div key={region}>
                  <div style={s('font-size:10.5px;color:#A2957F')}>{regionName(region, lang)}</div>
                  <div style={s('font-size:13px;font-weight:700;color:#4A4234')}>{label}</div>
                </div>
              ))}
          </div>
          <div style={s('font-size:11.5px;color:#8A7D6C;line-height:1.55;margin-top:8px')}>
            {zoneHelp[lang]}
          </div>
        </div>
      )}

      {grouped.map(({ group, rows: groupRows }) => (
        <div key={group} style={s('margin-top:16px')}>
          <div style={s('font-size:11px;color:#A2957F;letter-spacing:0.08em;font-weight:700;margin-bottom:8px')}>
            {groupNames[group as ConcernGroup][lang]}
          </div>

          <div style={s('display:flex;flex-direction:column;gap:10px')}>
            {groupRows.map((row) => {
              const expanded = open === row.key
              return (
                <div key={row.key} onClick={() => setOpen(expanded ? null : row.key)} style={s('cursor:pointer')}>
                  <div style={s('display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;margin-bottom:4px;gap:8px')}>
                    <span style={s('font-weight:600')}>
                      {row.def.name[lang]}
                      <span style={s('color:#C6BBA8;font-weight:400;margin-left:5px')}>
                        {expanded ? '−' : '+'}
                      </span>
                    </span>
                    <span style={s(`font-weight:700;color:${colourFor(row.score)};flex-shrink:0`)}>
                      {row.score}
                    </span>
                  </div>

                  <div style={s('height:6px;background:#EFE9DD;border-radius:99px;overflow:hidden')}>
                    <div style={s(`height:100%;border-radius:99px;width:${row.score}%;background:${colourFor(row.score)};transition:width .8s ease`)} />
                  </div>

                  {expanded && (
                    <div style={s('background:#F8F5EF;border-radius:12px;padding:12px 14px;margin-top:8px')}>
                      <div style={s('font-size:11px;color:#A2957F;font-weight:700;letter-spacing:0.06em')}>
                        {t.measured}
                      </div>
                      <div style={s('font-size:12.5px;line-height:1.6;color:#4A4234;margin-top:4px')}>
                        {row.def.means[lang]}
                      </div>

                      {row.regions.length > 0 && (
                        <div style={s('display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #E7E1D4')}>
                          {row.regions
                            .sort((a, b) => a.score - b.score)
                            .map((r) => (
                              <div key={r.region}>
                                <div style={s('font-size:10.5px;color:#A2957F')}>
                                  {regionName(r.region, lang)}
                                </div>
                                <div style={s(`font-size:13px;font-weight:700;color:${colourFor(r.score)}`)}>
                                  {r.score}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {row.score < 70 && (
                        <div style={s('margin-top:10px;padding-top:10px;border-top:1px solid #E7E1D4')}>
                          <div style={s('font-size:11px;color:#A2957F;font-weight:700;letter-spacing:0.06em')}>
                            {t.whatToDo}
                          </div>
                          <div style={s('font-size:12.5px;line-height:1.6;color:#2C4A3E;margin-top:4px')}>
                            {row.def.low[lang]}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
