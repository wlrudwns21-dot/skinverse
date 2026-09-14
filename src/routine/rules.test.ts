import { describe, expect, it } from 'vitest'
import { conditions } from '../data/skin'
import type { Weather } from '../data/types'
import { buildPlan, tempBand, uvBand } from './rules'
import { drynessBand } from './climate'

const weather = (t: number, h: number, uv: number): Weather => ({ t, h, uv })

/** Balanced skin keeps the weather as the only variable under test. */
const balanced = conditions.balanced.m
/** hydration 42 — below the 60 threshold that pushes the routine richer. */
const dehydrated = conditions.dehydrated.m

describe('band boundaries', () => {
  // Each band is checked at its edges, since off-by-one here silently changes
  // what thousands of customers are told.
  it('classifies dryness by what the air does, not by the percentage', () => {
    // The same relative humidity at two temperatures is two different days,
    // which is the whole reason this is not banded on the percentage.
    expect(drynessBand(weather(30, 84, 1))).toBe('humid')
    expect(drynessBand(weather(22, 50, 1))).toBe('mild')
    expect(drynessBand(weather(14, 62, 1))).toBe('drying')
    expect(drynessBand(weather(22, 20, 1))).toBe('harsh')
    expect(drynessBand(weather(-2, 40, 1))).toBe('severe')
  })

  it('follows the WHO UV index exactly', () => {
    expect(uvBand(0)).toBe('low')
    expect(uvBand(2)).toBe('low')
    expect(uvBand(3)).toBe('moderate')
    expect(uvBand(5)).toBe('moderate')
    expect(uvBand(6)).toBe('high')
    expect(uvBand(7)).toBe('high')
    expect(uvBand(8)).toBe('veryHigh')
    expect(uvBand(10)).toBe('veryHigh')
    expect(uvBand(11)).toBe('extreme')
    expect(uvBand(15)).toBe('extreme')
  })

  it('classifies temperature', () => {
    expect(tempBand(-5)).toBe('cold')
    expect(tempBand(9)).toBe('cold')
    expect(tempBand(10)).toBe('cool')
    expect(tempBand(17)).toBe('cool')
    expect(tempBand(18)).toBe('mild')
    expect(tempBand(24)).toBe('mild')
    expect(tempBand(25)).toBe('warm')
    expect(tempBand(29)).toBe('warm')
    expect(tempBand(30)).toBe('hot')
    expect(tempBand(40)).toBe('hot')
  })
})

describe('temperature actually changes the plan', () => {
  // This is what the rules rewrite existed to fix: temperature used to be
  // displayed and then ignored.
  it('softens the morning cleanse on a cold dry day', () => {
    const cold = buildPlan(weather(2, 35, 1), balanced, 'hydration')
    const mild = buildPlan(weather(22, 35, 1), balanced, 'hydration')
    expect(cold.am.cleanse).toBe('gentle')
    expect(mild.am.cleanse).toBe('gel')
  })

  it('requires a double cleanse once it is warm, whatever the humidity', () => {
    expect(buildPlan(weather(31, 50, 1), balanced, 'hydration').pm.cleanse).toBe('double')
    expect(buildPlan(weather(5, 50, 1), balanced, 'hydration').pm.cleanse).toBe('single')
  })

  it('goes richest when cold meets dehydrated skin', () => {
    const plan = buildPlan(weather(3, 50, 1), dehydrated, 'hydration')
    expect(plan.am.moisturiser).toBe('richOil')
    expect(plan.pm.night).toBe('maskHumidifier')
  })
})

describe('the air drives texture', () => {
  it('moves from oil-sealed to gel as the pull on the skin eases', () => {
    const at = (t: number, h: number) =>
      buildPlan(weather(t, h, 1), balanced, 'hydration').am.moisturiser
    expect(at(-2, 40)).toBe('richOil')  // Seoul winter: 1.7 g/m³ in the air
    expect(at(22, 20)).toBe('rich')     // heated room, very low absolute humidity
    expect(at(22, 50)).toBe('standard') // comfortable
    expect(at(30, 84)).toBe('gel')      // tropics: nothing heavy will absorb
  })

  it('switches to a gel whenever sweat cannot evaporate, whatever the scan said', () => {
    // A dew point past 24°C is the rule, and it outranks a dehydrated reading:
    // a ceramide cream in that air sits on the surface instead of absorbing.
    const plan = buildPlan(weather(31, 78, 8), dehydrated, 'hydration')
    expect(plan.basis.occlusive).toBe(true)
    expect(plan.am.moisturiser).toBe('gel')
    expect(plan.pm.night).toBe('barrier')
  })

  it('layers toner when the air pulls and mists it when the air is saturated', () => {
    const at = (t: number, h: number) => buildPlan(weather(t, h, 1), balanced, 'hydration').am.toner
    expect(at(22, 20)).toBe('layered')
    expect(at(14, 62)).toBe('layered')
    expect(at(22, 50)).toBe('standard')
    expect(at(30, 84)).toBe('mist')
  })

  it('reports the numbers it decided from', () => {
    const { basis } = buildPlan(weather(-2, 40, 1), dehydrated, 'hydration')
    // Cold air holds almost nothing, which is what makes a Korean winter the
    // most desiccating condition in the model.
    expect(basis.absoluteHumidity).toBeLessThan(2)
    expect(basis.vpd).toBeGreaterThan(40)
    expect(basis.hydration).toBe(dehydrated.hydration)
    expect(basis.dehydratedBelow).toBe(60)
  })
})

describe('UV drives sun protection', () => {
  it('tightens reapplication as the index climbs', () => {
    const at = (uv: number) => buildPlan(weather(22, 55, uv), balanced, 'hydration').am.spf
    expect(at(1)).toBe('spf50')
    expect(at(4)).toBe('spf50')
    expect(at(6)).toBe('reapply3h')
    expect(at(9)).toBe('reapply3h')
    expect(at(12)).toBe('reapply2h')
  })

  it('still protects on a low-UV day, because photoageing accumulates', () => {
    expect(buildPlan(weather(5, 55, 0), balanced, 'hydration').am.spf).toBe('spf50')
  })
})

describe('humidity outranks the scan when choosing texture', () => {
  // Regression: dehydrated skin used to be handed a ceramide cream at 78%
  // humidity, because the scan check ran before the humidity check. A rich
  // cream in saturated air sits on the surface instead of absorbing.
  it('keeps dehydrated skin on gel in humid air', () => {
    const plan = buildPlan(weather(31, 78, 8), dehydrated, 'hydration')
    expect(plan.am.moisturiser).toBe('gel')
    expect(plan.pm.night).toBe('barrier')
  })

  it('still goes rich for the same skin once the air is dry', () => {
    const plan = buildPlan(weather(22, 35, 8), dehydrated, 'hydration')
    expect(plan.am.moisturiser).toBe('rich')
    expect(plan.pm.night).toBe('creamOil')
  })
})

describe('the scan result overrides comfortable weather', () => {
  it('goes richer for dehydrated skin even in ideal air', () => {
    const ideal = weather(22, 55, 1)
    expect(buildPlan(ideal, balanced, 'hydration').am.moisturiser).toBe('standard')
    expect(buildPlan(ideal, dehydrated, 'hydration').am.moisturiser).toBe('rich')
    expect(buildPlan(ideal, dehydrated, 'hydration').pm.night).toBe('creamOil')
  })

  it('carries the weakest axis through to the treatment step', () => {
    expect(buildPlan(weather(22, 55, 1), balanced, 'pores').weakest).toBe('pores')
  })
})

describe('the plan is a pure function', () => {
  it('returns the same result for the same inputs', () => {
    const a = buildPlan(weather(31, 78, 8), dehydrated, 'hydration')
    const b = buildPlan(weather(31, 78, 8), dehydrated, 'hydration')
    expect(a).toEqual(b)
  })

  it('never leaves a slot unfilled, across the whole grid', () => {
    for (const t of [-5, 5, 15, 22, 27, 35]) {
      for (const h of [10, 35, 55, 70, 95]) {
        for (const uv of [0, 4, 7, 9, 13]) {
          for (const cond of [balanced, dehydrated, conditions.oily.m]) {
            const plan = buildPlan(weather(t, h, uv), cond, 'hydration')
            expect(plan.am.cleanse).toBeTruthy()
            expect(plan.am.toner).toBeTruthy()
            expect(plan.am.moisturiser).toBeTruthy()
            expect(plan.am.spf).toBeTruthy()
            expect(plan.pm.cleanse).toBeTruthy()
            expect(plan.pm.night).toBeTruthy()
          }
        }
      }
    }
  })
})
