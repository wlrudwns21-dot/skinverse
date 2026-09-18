import { describe, expect, it } from 'vitest'
import { rank, scoreProduct, type Rankable, type RecommendContext } from './recommend'
import type { MetricKey } from '../data/types'

/**
 * Dust has to actually move the ranking, and only when there is a reading.
 * These pin the end-to-end effect rather than the weight table, so a change to
 * either has to be deliberate.
 */
const METRICS: Record<MetricKey, number> = {
  hydration: 70, elasticity: 70, pores: 70, pigmentation: 70, wrinkles: 70, sensitivity: 70,
}

const PRODUCTS: Rankable[] = [
  { id: 'pore', tag: 'Pore', metric: 'pores' },
  { id: 'hydra', tag: 'Hydration', metric: 'hydration' },
]

const base: RecommendContext = {
  metrics: METRICS,
  // Mild day: nothing else should be pushing the ranking around.
  weather: { t: 18, h: 50, uv: 2 },
  focus: null,
  falling: [],
  condition: 'balanced',
}

describe('particulates in the ranking', () => {
  it('does nothing when there is no reading', () => {
    const quiet = scoreProduct(PRODUCTS[0], base)
    expect(quiet.reasons.some((r) => r.kind === 'polluted')).toBe(false)
  })

  it('does nothing on a clean or ordinary day', () => {
    const clean = scoreProduct(PRODUCTS[0], { ...base, air: 'good', pollution: 10 })
    const ok = scoreProduct(PRODUCTS[0], { ...base, air: 'moderate', pollution: 40 })
    expect(clean.reasons.some((r) => r.kind === 'polluted')).toBe(false)
    expect(ok.reasons.some((r) => r.kind === 'polluted')).toBe(false)
  })

  it('lifts a pore product on a bad day', () => {
    const before = scoreProduct(PRODUCTS[0], base).score
    const after = scoreProduct(PRODUCTS[0], { ...base, air: 'bad', pollution: 80 }).score
    expect(after).toBeGreaterThan(before)
  })

  it('scales with how bad the air actually is', () => {
    const bad = scoreProduct(PRODUCTS[0], { ...base, air: 'bad', pollution: 55 }).score
    const worse = scoreProduct(PRODUCTS[0], { ...base, air: 'veryBad', pollution: 100 }).score
    expect(worse).toBeGreaterThan(bad)
  })

  it('leaves a hydration product alone — dust is not a moisture problem', () => {
    const before = scoreProduct(PRODUCTS[1], base).score
    const after = scoreProduct(PRODUCTS[1], { ...base, air: 'veryBad', pollution: 100 }).score
    expect(after).toBe(before)
  })

  it('narrows the gap without overriding a real deficit', () => {
    /*
     * At 18°C and 50% RH the air is already drying, so the hydration product
     * carries a +10 head start before dust is considered at all. Severe
     * particulates close most of that gap but do not erase it — which is the
     * intended shape: weather reorders products of similar need, it does not
     * outrank what the skin actually measured or what the air is doing to
     * moisture.
     */
    const quiet = rank(PRODUCTS, base)
    const dusty = rank(PRODUCTS, { ...base, air: 'veryBad', pollution: 100 })

    const gapOf = (r: ReturnType<typeof rank>) =>
      (r.find((x) => x.id === 'hydra')?.score ?? 0) - (r.find((x) => x.id === 'pore')?.score ?? 0)

    expect(gapOf(quiet)).toBeGreaterThan(gapOf(dusty))
    expect(gapOf(dusty)).toBeGreaterThanOrEqual(0)
  })

  it('does reorder once the pore axis is the weaker one', () => {
    // The case that matters: a customer with pore trouble on a dusty day.
    const poreTrouble: RecommendContext = {
      ...base,
      metrics: { ...METRICS, pores: 52 },
    }
    const dusty = rank(PRODUCTS, { ...poreTrouble, air: 'bad', pollution: 80 })
    expect(dusty[0].id).toBe('pore')
  })

  it('names the reason so the screen can print it', () => {
    const r = scoreProduct(PRODUCTS[0], { ...base, air: 'bad', pollution: 80 })
    expect(r.reasons.find((x) => x.kind === 'polluted')?.points).toBeGreaterThan(0)
  })
})
