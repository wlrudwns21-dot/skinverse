import { describe, expect, it } from 'vitest'
import type { MetricKey, ProductTag, Weather } from '../data/types'
import { fallingAxes, rank, scoreProduct, WEIGHTS, type Rankable, type RecommendContext } from './recommend'

const M = (over: Partial<Record<MetricKey, number>> = {}): Record<MetricKey, number> => ({
  hydration: 70, elasticity: 70, pores: 70, pigmentation: 70, wrinkles: 70, sensitivity: 70, ...over,
})

const w = (t: number, h: number, uv: number): Weather => ({ t, h, uv })

/** Comfortable humidity, mild temperature, low UV — nothing the weather can argue. */
const NEUTRAL = w(22, 55, 1)

const ctx = (over: Partial<RecommendContext> = {}): RecommendContext => ({
  metrics: M(),
  weather: NEUTRAL,
  focus: null,
  falling: [],
  condition: 'balanced',
  ...over,
})

const product = (id: string, tag: ProductTag, metric: MetricKey | 'uv'): Rankable => ({ id, tag, metric })

const hydrator = product('hyd', 'Hydration', 'hydration')
const poreCare = product('pore', 'Pore', 'pores')
const soother = product('sooth', 'Soothing', 'sensitivity')
const brightener = product('bright', 'Brightening', 'pigmentation')
const sunscreen = product('spf', 'SPF', 'uv')

const points = (id: string, list: ReturnType<typeof rank>) =>
  list.find((r) => r.id === id)!.score

describe('the axis a product targets drives its score', () => {
  it('scores on how far behind that axis is', () => {
    const low = scoreProduct(hydrator, ctx({ metrics: M({ hydration: 40 }) }))
    const high = scoreProduct(hydrator, ctx({ metrics: M({ hydration: 90 }) }))
    expect(low.score).toBe(60)
    expect(high.score).toBe(10)
  })

  it('never claims a perfect match', () => {
    // A hydration score of 1, in very dry air, on dehydrated skin.
    const best = scoreProduct(hydrator, ctx({
      metrics: M({ hydration: 1 }), weather: w(5, 20, 1), condition: 'dehydrated', focus: 'hydration',
    }))
    expect(best.score).toBe(99)
  })

  it('never drops to zero either', () => {
    const worst = scoreProduct(hydrator, ctx({
      metrics: M({ hydration: 100 }), weather: w(28, 85, 1), condition: 'oily',
    }))
    expect(worst.score).toBeGreaterThanOrEqual(1)
  })
})

describe('the report’s focus and trend', () => {
  it('lifts the product that answers the axis the report singled out', () => {
    const plain = scoreProduct(poreCare, ctx({ metrics: M({ pores: 50 }) }))
    const focused = scoreProduct(poreCare, ctx({ metrics: M({ pores: 50 }), focus: 'pores' }))
    expect(focused.score - plain.score).toBe(WEIGHTS.focusAxis)
    expect(focused.reasons.some((r) => r.kind === 'focusAxis')).toBe(true)
  })

  it('lifts an axis that is getting worse, even at the same score', () => {
    const steady = scoreProduct(poreCare, ctx({ metrics: M({ pores: 60 }) }))
    const falling = scoreProduct(poreCare, ctx({ metrics: M({ pores: 60 }), falling: ['pores'] }))
    expect(falling.score - steady.score).toBe(WEIGHTS.axisFalling)
  })
})

describe('the weather reorders products of similar need', () => {
  it('favours hydration when the air is pulling water out', () => {
    const dry = scoreProduct(hydrator, ctx({ weather: w(5, 25, 1) }))
    const comfortable = scoreProduct(hydrator, ctx({ weather: NEUTRAL }))
    expect(dry.score - comfortable.score).toBe(WEIGHTS.dryAir)
    expect(dry.reasons.some((r) => r.kind === 'dryAir')).toBe(true)
  })

  it('argues against heavy hydration when the air is already saturated', () => {
    // Same rule the routine follows: at 85% humidity a rich cream sits on the
    // surface instead of absorbing.
    const humid = scoreProduct(hydrator, ctx({ weather: w(28, 85, 1) }))
    const comfortable = scoreProduct(hydrator, ctx({ weather: NEUTRAL }))
    expect(humid.score - comfortable.score).toBe(WEIGHTS.humidAir)
    expect(humid.reasons.find((r) => r.kind === 'humidAir')?.points).toBeLessThan(0)
  })

  it('favours pore care in heat, when sebum output is up', () => {
    const hot = scoreProduct(poreCare, ctx({ weather: w(32, 55, 1) }))
    expect(hot.score - scoreProduct(poreCare, ctx()).score).toBe(WEIGHTS.sebum)
    expect(hot.reasons.some((r) => r.kind === 'heat')).toBe(true)
  })

  it('favours soothing in the cold', () => {
    const cold = scoreProduct(soother, ctx({ weather: w(2, 55, 1) }))
    expect(cold.score - scoreProduct(soother, ctx()).score).toBe(WEIGHTS.cold)
  })

  it('favours brightening when UV is high, since UV drives pigmentation', () => {
    const sunny = scoreProduct(brightener, ctx({ weather: w(28, 55, 9) }))
    expect(sunny.score - scoreProduct(brightener, ctx()).score).toBe(WEIGHTS.uvPigment)
  })
})

describe('sunscreen', () => {
  it('climbs with the WHO index', () => {
    const at = (uv: number) => scoreProduct(sunscreen, ctx({ weather: w(22, 55, uv) })).score
    expect(at(1)).toBeLessThan(at(4))
    expect(at(4)).toBeLessThan(at(7))
    expect(at(7)).toBeLessThan(at(9))
    expect(at(9)).toBeLessThan(at(12))
  })

  it('stays prominent even in winter', () => {
    // Daily sun protection is the highest-value step in any routine. Burying it
    // at UV 0 would be bad advice dressed up as personalisation.
    expect(scoreProduct(sunscreen, ctx({ weather: w(-5, 40, 0) })).score).toBeGreaterThanOrEqual(55)
  })

  it('does not depend on the six axes at all', () => {
    const perfect = scoreProduct(sunscreen, ctx({ metrics: M({ pigmentation: 99 }) })).score
    const poor = scoreProduct(sunscreen, ctx({ metrics: M({ pigmentation: 20 }) })).score
    expect(perfect).toBe(poor)
  })
})

describe('the skin type the vendor reported', () => {
  it('pushes pore care up and heavy hydration down for oily skin', () => {
    const base = ctx()
    const oily = ctx({ condition: 'oily' })
    expect(scoreProduct(poreCare, oily).score - scoreProduct(poreCare, base).score).toBe(WEIGHTS.oilySkin)
    expect(scoreProduct(hydrator, oily).score - scoreProduct(hydrator, base).score).toBe(-WEIGHTS.oilySkin)
  })

  it('pushes hydration up for dry skin', () => {
    const dry = ctx({ condition: 'dehydrated' })
    expect(scoreProduct(hydrator, dry).score - scoreProduct(hydrator, ctx()).score).toBe(WEIGHTS.drySkin)
  })
})

describe('reasons', () => {
  it('records every contribution, biggest first', () => {
    const { reasons } = scoreProduct(hydrator, ctx({
      metrics: M({ hydration: 45 }), weather: w(3, 22, 1), condition: 'dehydrated', focus: 'hydration',
    }))
    expect(reasons[0].kind).toBe('axisNeed')
    expect(reasons.map((r) => r.kind)).toEqual(
      expect.arrayContaining(['axisNeed', 'focusAxis', 'dryAir', 'drySkin']),
    )
    // The score is exactly the sum of what it reports.
    expect(reasons.reduce((sum, r) => sum + r.points, 0)).toBe(55 + 12 + 10 + 8)
  })

  it('reports nothing it did not actually apply', () => {
    const { reasons } = scoreProduct(hydrator, ctx())
    expect(reasons.map((r) => r.kind)).toEqual(['axisNeed'])
  })
})

describe('ranking a catalogue', () => {
  const catalogue = [hydrator, poreCare, soother, brightener, sunscreen]

  it('puts the worst axis first when the weather is neutral', () => {
    const list = rank(catalogue, ctx({ metrics: M({ pores: 30 }), focus: 'pores' }))
    expect(list[0].id).toBe('pore')
  })

  it('lets a dry winter lift hydration past a similar pore need', () => {
    const scores = ctx({ metrics: M({ hydration: 55, pores: 55 }), weather: w(2, 25, 1) })
    const list = rank(catalogue, scores)
    expect(points('hyd', list)).toBeGreaterThan(points('pore', list))
  })

  it('lets a humid summer flip that same pair the other way', () => {
    const scores = ctx({ metrics: M({ hydration: 55, pores: 55 }), weather: w(31, 85, 1) })
    const list = rank(catalogue, scores)
    expect(points('pore', list)).toBeGreaterThan(points('hyd', list))
  })

  it('orders ties by id so the shelf does not reshuffle between renders', () => {
    const a = rank(catalogue, ctx())
    const b = rank([...catalogue].reverse(), ctx())
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id))
  })
})

describe('fallingAxes', () => {
  it('finds only the axes that dropped by at least the threshold', () => {
    const now = M({ hydration: 50, pores: 68, wrinkles: 80 })
    const before = M({ hydration: 70, pores: 70, wrinkles: 70 })
    expect(fallingAxes(now, before, 5)).toEqual(['hydration'])
  })

  it('returns nothing when there is no earlier scan to compare with', () => {
    expect(fallingAxes(M(), null, 5)).toEqual([])
  })
})
