import { describe, expect, it } from 'vitest'
import { rank, scoreProduct, type Rankable, type RecommendContext } from './recommend'
import type { Ownership } from './ownership'
import type { MetricKey } from '../data/types'

/**
 * The end-to-end shape of the repurchase signal: it has to move the ranking,
 * change sign with time, and never outweigh what the skin actually measured.
 */
const METRICS: Record<MetricKey, number> = {
  hydration: 70, elasticity: 70, pores: 70, pigmentation: 70, wrinkles: 70, sensitivity: 70,
}

const SERUM: Rankable = { id: 'serum', tag: 'Hydration', metric: 'hydration' }
const CREAM: Rankable = { id: 'cream', tag: 'Soothing', metric: 'sensitivity' }

/*
 * A second hydration product, identical to the serum in every respect the
 * scoring can see. The weather treats them the same and their axes are the
 * same, so ownership is the only thing left to separate them — which is
 * exactly the job this weight is sized for.
 */
const TWIN: Rankable = { id: 'twin', tag: 'Hydration', metric: 'hydration' }

const base: RecommendContext = {
  metrics: METRICS,
  weather: { t: 18, h: 50, uv: 2 },
  focus: null,
  falling: [],
  condition: 'balanced',
}

const owned = (daysSince: number): Record<string, Ownership> => ({
  serum: { productId: 'serum', daysSince, useDays: 75 },
})

describe('what they already own', () => {
  it('changes nothing for a customer with no history', () => {
    const plain = scoreProduct(SERUM, base)
    expect(plain.reasons.some((r) => r.kind === 'hasIt' || r.kind === 'runningOut')).toBe(false)
  })

  it('pushes down a product bought last week', () => {
    const before = scoreProduct(SERUM, base).score
    const after = scoreProduct(SERUM, { ...base, owned: owned(7) }).score
    expect(after).toBeLessThan(before)
  })

  it('pushes it back up once they are due to run out', () => {
    const before = scoreProduct(SERUM, base).score
    const after = scoreProduct(SERUM, { ...base, owned: owned(75) }).score
    expect(after).toBeGreaterThan(before)
  })

  it('goes quiet again long afterwards', () => {
    const before = scoreProduct(SERUM, base).score
    const after = scoreProduct(SERUM, { ...base, owned: owned(300) }).score
    expect(after).toBe(before)
  })

  it('leaves products they never bought alone', () => {
    const before = scoreProduct(CREAM, base).score
    const after = scoreProduct(CREAM, { ...base, owned: owned(7) }).score
    expect(after).toBe(before)
  })
})

describe('it reorders, but does not overrule the skin', () => {
  it('drops a just-bought product below its identical twin', () => {
    const tie = rank([SERUM, TWIN], base)
    expect(tie[0].score).toBe(tie[1].score)

    const fresh = rank([SERUM, TWIN], { ...base, owned: owned(3) })
    expect(fresh[0].id).toBe('twin')
  })

  it('lifts it back above once it is running out', () => {
    const due = rank([SERUM, TWIN], { ...base, owned: owned(75) })
    expect(due[0].id).toBe('serum')
  })

  it('cannot bury a product the skin badly needs', () => {
    /*
     * The case worth protecting: they bought the serum yesterday, but their
     * hydration has collapsed since. An estimate about a bottle must not
     * outrank a 30-point deficit the analysis actually measured.
     */
    const parched: RecommendContext = {
      ...base,
      metrics: { ...METRICS, hydration: 35 },
      owned: owned(1),
    }
    expect(rank([SERUM, CREAM], parched)[0].id).toBe('serum')
  })
})

describe('it says why', () => {
  it('names owning it, and names running out', () => {
    const has = scoreProduct(SERUM, { ...base, owned: owned(5) })
    const due = scoreProduct(SERUM, { ...base, owned: owned(75) })
    expect(has.reasons.some((r) => r.kind === 'hasIt')).toBe(true)
    expect(due.reasons.some((r) => r.kind === 'runningOut')).toBe(true)
  })
})
