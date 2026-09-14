import { describe, expect, it } from 'vitest'
import type { MetricKey, Weather } from '../data/types'
import type { ScanRecord } from '../store/state'
import {
  buildReport,
  trendSeries,
  weakestAxis,
  type Insight,
  type ReportInput,
} from './report'

const M = (overrides: Partial<Record<MetricKey, number>> = {}): Record<MetricKey, number> => ({
  hydration: 70,
  elasticity: 70,
  pores: 70,
  pigmentation: 70,
  wrinkles: 70,
  sensitivity: 70,
  ...overrides,
})

const DAY = 86_400_000
const at = (daysAgo: number) => new Date(Date.parse('2026-06-01T00:00:00Z') - daysAgo * DAY).toISOString()

const scan = (over: Partial<ScanRecord> = {}): ScanRecord => ({
  skinCondition: 'balanced',
  overall: 70,
  createdAt: at(14),
  metrics: M(),
  skinAge: null,
  oiliness: null,
  skinType: null,
  weather: null,
  ...over,
})

const report = (over: Partial<ReportInput> = {}) =>
  buildReport({
    metrics: M(),
    overall: 70,
    skinAge: null,
    oiliness: null,
    skinType: null,
    weather: null,
    at: at(0),
    previous: [],
    ...over,
  })

const find = <K extends Insight['kind']>(insights: Insight[], kind: K) =>
  insights.find((i) => i.kind === kind) as Extract<Insight, { kind: K }> | undefined

describe('where the skin stands', () => {
  it('names the weakest axis when it is clearly behind', () => {
    const { insights, focus } = report({ metrics: M({ pores: 44 }) })
    const weakest = find(insights, 'weakest')
    expect(weakest?.axis).toBe('pores')
    expect(weakest?.score).toBe(44)
    expect(weakest?.gap).toBe(26)
    expect(focus).toBe('pores')
  })

  it('refuses to invent a priority when every axis is level', () => {
    // Six axes within 3 points is measurement noise, not a finding.
    const { insights } = report({ metrics: M({ pores: 68, hydration: 71 }) })
    expect(find(insights, 'weakest')).toBeUndefined()
    expect(find(insights, 'even')?.spread).toBe(3)
  })

  it('still flags a low axis even when the others are equally low', () => {
    // Everything at 45 is level, but level and bad is worth saying.
    const { insights } = report({ metrics: M({ hydration: 45, elasticity: 45, pores: 45, pigmentation: 45, wrinkles: 45, sensitivity: 45 }) })
    expect(find(insights, 'weakest')?.score).toBe(45)
  })

  it('says what is going well, but only when it is genuinely good', () => {
    expect(find(report({ metrics: M({ wrinkles: 88 }) }).insights, 'strongest')?.axis).toBe('wrinkles')
    // A best axis of 70 is unremarkable; praising it would be noise.
    expect(find(report({ metrics: M() }).insights, 'strongest')).toBeUndefined()
  })

  it('breaks ties deterministically so the focus never flickers', () => {
    expect(weakestAxis(M({ pores: 40, wrinkles: 40 }))).toBe('pores')
    expect(weakestAxis(M({ wrinkles: 40, pores: 40 }))).toBe('pores')
  })
})

describe('the vendor’s own classification', () => {
  it('reports their label verbatim rather than paraphrasing it', () => {
    const { insights } = report({ skinType: { whole: 'Dry & Redness', tZone: null, uZone: null } })
    expect(find(insights, 'vendorType')?.label).toBe('Dry & Redness')
  })

  it('flags zones that disagree', () => {
    const { insights } = report({ skinType: { whole: 'Combination', tZone: 'Oily', uZone: 'Dry' } })
    expect(find(insights, 'zoneContrast')).toEqual({ kind: 'zoneContrast', tZone: 'Oily', uZone: 'Dry' })
  })

  it('says nothing about zones that agree', () => {
    const { insights } = report({ skinType: { whole: 'Oily', tZone: 'Oily', uZone: 'Oily' } })
    expect(find(insights, 'zoneContrast')).toBeUndefined()
  })
})

describe('what changed', () => {
  it('says so plainly when there is nothing to compare against', () => {
    expect(find(report().insights, 'firstScan')).toBeDefined()
  })

  it('ignores a scan too old to be a fair comparison', () => {
    // Six months and a season apart is not "since last time".
    const { insights } = report({ previous: [scan({ createdAt: at(200), overall: 40 })] })
    expect(find(insights, 'firstScan')).toBeDefined()
    expect(find(insights, 'overallMove')).toBeUndefined()
  })

  it('reports the overall move and how long it took', () => {
    const { insights } = report({ overall: 78, previous: [scan({ overall: 66, createdAt: at(21) })] })
    expect(find(insights, 'overallMove')).toEqual({
      kind: 'overallMove', direction: 'up', delta: 12, days: 21,
    })
  })

  it('treats a small wobble as noise, not progress', () => {
    const { insights } = report({ overall: 73, previous: [scan({ overall: 70 })] })
    expect(find(insights, 'overallMove')).toBeUndefined()
  })

  it('picks out the axis that moved most', () => {
    const { insights } = report({
      metrics: M({ pores: 82, hydration: 73 }),
      previous: [scan({ metrics: M({ pores: 62, hydration: 70 }) })],
    })
    expect(find(insights, 'axisMove')).toEqual({
      kind: 'axisMove', axis: 'pores', direction: 'up', delta: 20,
    })
  })

  it('compares against a previous scan that predates per-axis history', () => {
    // Early rows have no metrics. Skip them rather than crash or invent zeros.
    const { insights } = report({
      overall: 80,
      previous: [scan({ metrics: null, overall: 50 }), scan({ overall: 66, createdAt: at(30) })],
    })
    expect(find(insights, 'overallMove')?.delta).toBe(14)
  })
})

describe('telling the weather apart from the routine', () => {
  const dry: Weather = { t: 5, h: 25, uv: 1 }
  const humid: Weather = { t: 24, h: 70, uv: 5 }

  it('attributes a hydration drop to the air when the air dried out with it', () => {
    const { insights } = report({
      metrics: M({ hydration: 52 }),
      weather: dry,
      previous: [scan({ metrics: M({ hydration: 72 }), weather: humid })],
    })
    const finding = find(insights, 'weatherDriven')
    expect(finding).toEqual({
      kind: 'weatherDriven', axis: 'hydration', direction: 'down', delta: 20, humidityDelta: -45,
    })
    // And does not also blame the customer for the same 20 points.
    expect(find(insights, 'axisMove')?.axis).not.toBe('hydration')
  })

  it('blames nothing on the weather when the weather held steady', () => {
    const steady: Weather = { t: 22, h: 68, uv: 5 }
    const { insights } = report({
      metrics: M({ hydration: 52 }),
      weather: steady,
      previous: [scan({ metrics: M({ hydration: 72 }), weather: humid })],
    })
    expect(find(insights, 'weatherDriven')).toBeUndefined()
    expect(find(insights, 'axisMove')?.axis).toBe('hydration')
  })

  it('does not credit the weather when the two moved opposite ways', () => {
    // Hydration improved while the air got drier — that is the routine working,
    // and handing the credit to the weather would be exactly backwards.
    const { insights } = report({
      metrics: M({ hydration: 80 }),
      weather: dry,
      previous: [scan({ metrics: M({ hydration: 60 }), weather: humid })],
    })
    expect(find(insights, 'weatherDriven')).toBeUndefined()
    expect(find(insights, 'axisMove')).toEqual({
      kind: 'axisMove', axis: 'hydration', direction: 'up', delta: 20,
    })
  })

  it('says nothing about weather it never recorded', () => {
    const { insights } = report({
      metrics: M({ hydration: 52 }),
      weather: null,
      previous: [scan({ metrics: M({ hydration: 72 }), weather: humid })],
    })
    expect(find(insights, 'weatherDriven')).toBeUndefined()
  })
})

describe('skin age', () => {
  it('reports it on a first scan with no direction to give', () => {
    const { insights } = report({ skinAge: 34 })
    expect(find(insights, 'skinAge')).toEqual({ kind: 'skinAge', age: 34, direction: null, delta: 0 })
  })

  it('counts a falling skin age as an improvement', () => {
    const { insights } = report({ skinAge: 31, previous: [scan({ skinAge: 35 })] })
    expect(find(insights, 'skinAge')).toEqual({ kind: 'skinAge', age: 31, direction: 'up', delta: 4 })
  })

  it('counts a rising skin age as a decline', () => {
    const { insights } = report({ skinAge: 38, previous: [scan({ skinAge: 35 })] })
    expect(find(insights, 'skinAge')?.direction).toBe('down')
  })

  it('gives no direction when the age did not move', () => {
    const { insights } = report({ skinAge: 35, previous: [scan({ skinAge: 35 })] })
    expect(find(insights, 'skinAge')?.direction).toBeNull()
  })
})

describe('oiliness', () => {
  it('reports a drift even though it is never drawn as an axis', () => {
    const { insights } = report({ oiliness: 48, previous: [scan({ oiliness: 66 })] })
    expect(find(insights, 'oilinessMove')).toEqual({
      kind: 'oilinessMove', direction: 'down', delta: 18,
    })
  })

  it('stays quiet when the previous scan never measured it', () => {
    const { insights } = report({ oiliness: 48, previous: [scan({ oiliness: null })] })
    expect(find(insights, 'oilinessMove')).toBeUndefined()
  })
})

describe('trendSeries', () => {
  it('runs oldest first, whatever order the history arrived in', () => {
    const series = trendSeries([
      scan({ createdAt: at(1), overall: 80 }),
      scan({ createdAt: at(30), overall: 60 }),
      scan({ createdAt: at(15), overall: 70 }),
    ])
    expect(series.map((p) => p.overall)).toEqual([60, 70, 80])
  })

  it('carries humidity alongside each point so a dip can be explained', () => {
    const series = trendSeries([scan({ weather: { t: 3, h: 28, uv: 1 } }), scan({ weather: null })])
    expect(series.map((p) => p.humidity)).toEqual([28, null])
  })

  it('does not mutate the history it was given', () => {
    const history = [scan({ createdAt: at(1) }), scan({ createdAt: at(30) })]
    trendSeries(history)
    expect(history[0].createdAt).toBe(at(1))
  })
})
