import { describe, expect, it } from 'vitest'
import type { Weather } from '../data/types'
import {
  absoluteHumidity,
  coldStress,
  dewPoint,
  drynessBand,
  drynessLoad,
  readClimate,
  saturationVapourPressure,
  sebumBand,
  sebumLoad,
  vapourPressureDeficit,
} from './climate'

const w = (t: number, h: number, uv = 5): Weather => ({ t, h, uv })

/** Real places, so the bands can be sanity-checked against somewhere that exists. */
const SEOUL_WINTER = w(-2, 40)
const SEOUL_SUMMER = w(29, 75)
const DUBAI_SUMMER = w(41, 20)
const SINGAPORE = w(30, 84)
const LONDON_SPRING = w(14, 62)
const OFFICE = w(22, 50)

describe('meteorological formulae', () => {
  it('matches the published saturation vapour pressure at 0°C and 30°C', () => {
    // Bolton 1980: 6.112 hPa at 0°C, ~42.4 hPa at 30°C.
    expect(saturationVapourPressure(0)).toBeCloseTo(6.112, 3)
    expect(saturationVapourPressure(30)).toBeCloseTo(42.43, 1)
  })

  it('puts the dew point at the air temperature when the air is saturated', () => {
    expect(dewPoint(20, 100)).toBeCloseTo(20, 1)
    expect(dewPoint(30, 100)).toBeCloseTo(30, 1)
  })

  it('reports a dew point below the air temperature whenever it is not', () => {
    expect(dewPoint(30, 50)).toBeLessThan(30)
    expect(dewPoint(30, 50)).toBeCloseTo(18.4, 0)
  })

  it('measures absolute humidity, not the percentage', () => {
    // Same relative humidity, wildly different amounts of actual water.
    expect(absoluteHumidity(35, 20)).toBeGreaterThan(absoluteHumidity(0, 20) * 3)
  })
})

describe('what relative humidity cannot tell you', () => {
  it('gives the same percentage two different answers at two temperatures', () => {
    // 20% RH in both. Read as a percentage these are the same day; they are not.
    expect(drynessLoad(w(-2, 20))).toBeGreaterThan(drynessLoad(w(41, 20)) + 40)
  })

  it('finds the Korean winter more desiccating than the desert', () => {
    // Counterintuitive and correct: cold air holds almost nothing. Seoul in
    // winter carries ~1.7 g/m³ of water against Dubai's ~10.8, so the gradient
    // pulling water out of skin is far steeper there.
    expect(absoluteHumidity(-2, 40)).toBeLessThan(absoluteHumidity(41, 20) / 5)
    expect(drynessLoad(SEOUL_WINTER)).toBeGreaterThan(drynessLoad(DUBAI_SUMMER))
    expect(drynessBand(SEOUL_WINTER)).toBe('severe')
  })

  it('still catches hot dry air that absolute humidity alone calls damp', () => {
    // The desert carries more water than a comfortable room, so the humidity
    // axis alone scores it zero. The deficit is what stops it reading as benign.
    expect(absoluteHumidity(41, 20)).toBeGreaterThan(absoluteHumidity(22, 50))
    expect(drynessLoad(DUBAI_SUMMER)).toBeGreaterThan(0)
  })

  it('does not call a cold humid day severe just because it is cold', () => {
    expect(drynessBand(w(4, 88))).not.toBe('severe')
  })

  it('ranks real places by how hard the air pulls', () => {
    const wetToDry = [SINGAPORE, SEOUL_SUMMER, OFFICE, LONDON_SPRING, SEOUL_WINTER]
    const loads = wetToDry.map(drynessLoad)
    for (let i = 1; i < loads.length; i++) {
      expect(loads[i], `step ${i} should be drier`).toBeGreaterThan(loads[i - 1])
    }
  })

  it('bands the humid tropics as humid and a heated winter as severe', () => {
    expect(drynessBand(SINGAPORE)).toBe('humid')
    expect(drynessBand(SEOUL_WINTER)).toBe('severe')
    expect(drynessBand(OFFICE)).toBe('mild')
  })

  it('never reports a negative deficit, however wet the air', () => {
    expect(vapourPressureDeficit(w(45, 100))).toBeGreaterThanOrEqual(0)
  })

  it('stays inside 0-100 at both extremes', () => {
    expect(drynessLoad(w(-40, 5))).toBeLessThanOrEqual(100)
    expect(drynessLoad(w(45, 100))).toBeGreaterThanOrEqual(0)
  })
})

describe('sebum load ignores relative humidity, by design', () => {
  it('does not move when only the humidity changes at a fixed temperature', () => {
    // Sunwoo 2006: with temperature held constant, humidity does not change
    // sebum output. What it changes is whether sweat evaporates — the dew point
    // term — so the two must not both carry humidity.
    const dry = sebumLoad(w(30, 30))
    const damp = sebumLoad(w(30, 60))
    // The oil component is identical; only the sweat term may differ.
    expect(damp).toBeGreaterThanOrEqual(dry)
    expect(damp - dry).toBeLessThan(20)
  })

  it('rises with temperature, then plateaus', () => {
    expect(sebumLoad(w(12, 50))).toBeLessThan(sebumLoad(w(25, 50)))
    expect(sebumLoad(w(25, 50))).toBeLessThan(sebumLoad(w(33, 50)))
    // Thermoregulation caps output — 45°C is not meaningfully oilier than 40°C.
    expect(sebumLoad(w(45, 50)) - sebumLoad(w(40, 50))).toBeLessThan(3)
  })

  it('separates sticky heat from dry heat', () => {
    // Both hot; only one of them stops sweat evaporating.
    expect(sebumLoad(SINGAPORE)).toBeGreaterThan(sebumLoad(w(30, 20)))
  })

  it('bands a tropical day high and a cold one low', () => {
    expect(sebumBand(SINGAPORE)).toBe('veryHigh')
    expect(sebumBand(SEOUL_WINTER)).toBe('low')
  })
})

describe('cold stress', () => {
  it('is nothing in mild weather and total in deep cold', () => {
    expect(coldStress(w(20, 50))).toBe(0)
    expect(coldStress(w(15, 50))).toBe(0)
    expect(coldStress(w(-10, 50))).toBe(100)
  })

  it('climbs steadily below 15°C', () => {
    expect(coldStress(w(10, 50))).toBeGreaterThan(0)
    expect(coldStress(w(0, 50))).toBeGreaterThan(coldStress(w(10, 50)))
  })
})

describe('readClimate', () => {
  it('flags occlusion only once sweat stops evaporating freely', () => {
    // A dew point of 24°C is the meteorological "sticky" threshold.
    expect(readClimate(SINGAPORE).occlusive).toBe(true)
    expect(readClimate(DUBAI_SUMMER).occlusive).toBe(false)
    expect(readClimate(SEOUL_WINTER).occlusive).toBe(false)
  })

  it('tells the two hot climates apart by what they do to skin', () => {
    // Both above 30°C, opposite routines: the tropics need nothing heavy
    // because sweat already cannot evaporate; the desert needs hydration.
    const desert = readClimate(DUBAI_SUMMER)
    const tropics = readClimate(SINGAPORE)
    expect(desert.occlusive).toBe(false)
    expect(tropics.occlusive).toBe(true)
    expect(drynessLoad(DUBAI_SUMMER)).toBeGreaterThan(drynessLoad(SINGAPORE))
    expect(tropics.sebum).toBe('veryHigh')
  })
})
