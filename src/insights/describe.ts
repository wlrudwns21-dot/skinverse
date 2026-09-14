import type { Lang, MetricKey } from '../data/types'
import { metricDefs } from '../data/skin'
import { insightT, type InsightStrings } from '../i18n/insights'
import type { Insight } from './report'

/**
 * Turn findings into sentences.
 *
 * The split is deliberate: report.ts decides *what is true*, this decides *how
 * to say it*. Nothing here may change a verdict — if a sentence is missing for
 * a finding, that is a translation gap and the finding is dropped rather than
 * papered over with English in a Korean screen.
 */

export interface DescribedInsight {
  kind: Insight['kind']
  text: string
  /** How it reads: good news, bad news, or neither. Drives the accent colour. */
  tone: 'good' | 'bad' | 'neutral'
}

const axisName = (axis: MetricKey, lang: Lang) =>
  metricDefs.find((d) => d.k === axis)?.n[lang] ?? axis

/**
 * Their label in the reader's language, falling back to their own wording.
 *
 * An unfamiliar label is shown verbatim rather than hidden: if Perfect Corp
 * adds a ninth type, a customer seeing "Combination & Oily" in English beats a
 * customer seeing nothing at all.
 */
export const skinTypeLabel = (label: string, strings: InsightStrings) =>
  strings.skinTypeLabel[label] ?? label

export function describe(insight: Insight, lang: Lang): DescribedInsight | null {
  const s = insightT(lang)

  switch (insight.kind) {
    case 'weakest':
      return {
        kind: insight.kind,
        text: s.weakest(axisName(insight.axis, lang), insight.score),
        tone: 'bad',
      }

    case 'even':
      return { kind: insight.kind, text: s.even(insight.spread), tone: 'neutral' }

    case 'strongest':
      return {
        kind: insight.kind,
        text: s.strongest(axisName(insight.axis, lang), insight.score),
        tone: 'good',
      }

    case 'overallMove':
      return {
        kind: insight.kind,
        text:
          insight.direction === 'up'
            ? s.overallUp(insight.delta, insight.days)
            : s.overallDown(insight.delta, insight.days),
        tone: insight.direction === 'up' ? 'good' : 'bad',
      }

    case 'axisMove':
      return {
        kind: insight.kind,
        text:
          insight.direction === 'up'
            ? s.axisUp(axisName(insight.axis, lang), insight.delta)
            : s.axisDown(axisName(insight.axis, lang), insight.delta),
        tone: insight.direction === 'up' ? 'good' : 'bad',
      }

    case 'weatherDriven':
      return {
        kind: insight.kind,
        text:
          insight.direction === 'down'
            ? s.weatherDriedOut(insight.delta, insight.humidityDelta)
            : s.weatherHelped(insight.delta, insight.humidityDelta),
        // Neutral in both directions on purpose. A drop the weather explains is
        // not the customer's failure, and a rise the weather explains is not
        // their achievement — calling either one would be flattery.
        tone: 'neutral',
      }

    case 'skinAge':
      if (insight.direction === null) {
        return { kind: insight.kind, text: s.skinAgeFlat(insight.age), tone: 'neutral' }
      }
      return {
        kind: insight.kind,
        text:
          insight.direction === 'up'
            ? s.skinAgeBetter(insight.age, insight.delta)
            : s.skinAgeWorse(insight.age, insight.delta),
        tone: insight.direction === 'up' ? 'good' : 'bad',
      }

    case 'zoneContrast':
      return {
        kind: insight.kind,
        text: s.zoneContrast(skinTypeLabel(insight.tZone, s), skinTypeLabel(insight.uZone, s)),
        tone: 'neutral',
      }

    case 'vendorType':
      return {
        kind: insight.kind,
        text: s.vendorType(skinTypeLabel(insight.label, s)),
        tone: 'neutral',
      }

    case 'oilinessMove':
      return {
        kind: insight.kind,
        text: insight.direction === 'up' ? s.oilinessUp(insight.delta) : s.oilinessDown(insight.delta),
        tone: insight.direction === 'up' ? 'good' : 'bad',
      }

    case 'firstScan':
      return { kind: insight.kind, text: s.firstScan, tone: 'neutral' }
  }
}

export function describeAll(insights: Insight[], lang: Lang): DescribedInsight[] {
  return insights.map((i) => describe(i, lang)).filter((d): d is DescribedInsight => d !== null)
}
