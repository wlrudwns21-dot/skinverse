import { describe as suite, expect, it } from 'vitest'
import type { Lang } from '../data/types'
import { insightT } from '../i18n/insights'
import { describe as describeInsight, describeAll, skinTypeLabel } from './describe'
import type { Insight } from './report'

const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']

/** One of every finding the report can produce. */
const ALL: Insight[] = [
  { kind: 'weakest', axis: 'pores', score: 42, gap: 14 },
  { kind: 'even', spread: 4, lowest: 68 },
  { kind: 'strongest', axis: 'wrinkles', score: 88 },
  { kind: 'overallMove', direction: 'up', delta: 9, days: 21 },
  { kind: 'overallMove', direction: 'down', delta: 9, days: 21 },
  { kind: 'axisMove', axis: 'hydration', direction: 'up', delta: 11 },
  { kind: 'axisMove', axis: 'hydration', direction: 'down', delta: 11 },
  { kind: 'weatherDriven', axis: 'hydration', direction: 'down', delta: 20, humidityDelta: -45 },
  { kind: 'weatherDriven', axis: 'hydration', direction: 'up', delta: 20, humidityDelta: 45 },
  { kind: 'skinAge', age: 34, direction: null, delta: 0 },
  { kind: 'skinAge', age: 31, direction: 'up', delta: 4 },
  { kind: 'skinAge', age: 38, direction: 'down', delta: 3 },
  { kind: 'zoneContrast', tZone: 'Oily', uZone: 'Dry' },
  { kind: 'vendorType', label: 'Combination' },
  { kind: 'oilinessMove', direction: 'up', delta: 7 },
  { kind: 'oilinessMove', direction: 'down', delta: 7 },
  { kind: 'firstScan' },
]

suite('every finding can be said in every language', () => {
  for (const lang of LANGS) {
    it(`renders all of them in ${lang}`, () => {
      for (const insight of ALL) {
        const said = describeInsight(insight, lang)
        expect(said, `${insight.kind} in ${lang}`).not.toBeNull()
        expect(said!.text.length, `${insight.kind} in ${lang}`).toBeGreaterThan(0)
        // A sentence that still has a placeholder in it means a broken template.
        expect(said!.text).not.toContain('undefined')
        expect(said!.text).not.toContain('NaN')
      }
    })
  }

  it('does not leave Korean readers reading English axis names', () => {
    const ko = describeInsight({ kind: 'weakest', axis: 'pores', score: 42, gap: 14 }, 'ko')
    expect(ko!.text).toContain('모공')
    expect(ko!.text).not.toContain('Pores')
  })
})

suite('tone', () => {
  const toneOf = (insight: Insight) => describeInsight(insight, 'en')!.tone

  it('reads a rising score as good and a falling one as bad', () => {
    expect(toneOf({ kind: 'overallMove', direction: 'up', delta: 9, days: 10 })).toBe('good')
    expect(toneOf({ kind: 'overallMove', direction: 'down', delta: 9, days: 10 })).toBe('bad')
  })

  it('treats a falling skin age as the good direction', () => {
    expect(toneOf({ kind: 'skinAge', age: 31, direction: 'up', delta: 4 })).toBe('good')
    expect(toneOf({ kind: 'skinAge', age: 38, direction: 'down', delta: 3 })).toBe('bad')
  })

  it('stays neutral about anything the weather explains', () => {
    // Neither a failure to apologise for nor an achievement to congratulate.
    expect(toneOf({ kind: 'weatherDriven', axis: 'hydration', direction: 'down', delta: 20, humidityDelta: -45 })).toBe('neutral')
    expect(toneOf({ kind: 'weatherDriven', axis: 'hydration', direction: 'up', delta: 20, humidityDelta: 45 })).toBe('neutral')
  })
})

suite('skin type labels', () => {
  it('translates all eight of their labels in every language', () => {
    const vendorLabels = [
      'Normal', 'Oily', 'Dry', 'Combination', 'Redness',
      'Dry & Redness', 'Oily & Redness', 'Combination & Redness',
    ]
    for (const lang of LANGS) {
      const s = insightT(lang)
      for (const label of vendorLabels) {
        expect(s.skinTypeLabel[label], `${label} in ${lang}`).toBeTruthy()
      }
    }
  })

  it('shows an unrecognised label verbatim rather than dropping it', () => {
    // If they add a ninth type, seeing their English beats seeing nothing.
    expect(skinTypeLabel('Combination & Oily', insightT('ko'))).toBe('Combination & Oily')
  })
})

suite('every reason for a recommendation has a chip in every language', () => {
  const kinds = [
    'axisNeed', 'focusAxis', 'axisFalling', 'dryAir', 'humidAir',
    'heat', 'cold', 'uvLoad', 'oilySkin', 'drySkin',
  ] as const

  for (const lang of LANGS) {
    it(`covers all of them in ${lang}`, () => {
      const s = insightT(lang)
      for (const kind of kinds) expect(s.reason[kind], `${kind} in ${lang}`).toBeTruthy()
    })
  }
})

suite('describeAll', () => {
  it('keeps the order the report produced', () => {
    const said = describeAll(
      [{ kind: 'firstScan' }, { kind: 'strongest', axis: 'wrinkles', score: 88 }],
      'en',
    )
    expect(said.map((d) => d.kind)).toEqual(['firstScan', 'strongest'])
  })
})
