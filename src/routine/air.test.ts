import { describe, expect, it } from 'vitest'
import { airBand, isPolluted, pollutionLoad } from './air'

/**
 * Pinned to Korea's 미세먼지 thresholds, because the customer checks a Korean
 * forecast before leaving the house. The app saying 나쁨 on a day the forecast
 * says 보통 reads as a bug, however defensible another scale would be.
 */
describe('banding follows the Korean thresholds', () => {
  it('PM10 sits in the right band at each boundary', () => {
    expect(airBand({ pm10: 30, pm25: 0 })).toBe('good')
    expect(airBand({ pm10: 31, pm25: 0 })).toBe('moderate')
    expect(airBand({ pm10: 80, pm25: 0 })).toBe('moderate')
    expect(airBand({ pm10: 81, pm25: 0 })).toBe('bad')
    expect(airBand({ pm10: 150, pm25: 0 })).toBe('bad')
    expect(airBand({ pm10: 151, pm25: 0 })).toBe('veryBad')
  })

  it('PM2.5 sits in the right band at each boundary', () => {
    expect(airBand({ pm10: 0, pm25: 15 })).toBe('good')
    expect(airBand({ pm10: 0, pm25: 16 })).toBe('moderate')
    expect(airBand({ pm10: 0, pm25: 35 })).toBe('moderate')
    expect(airBand({ pm10: 0, pm25: 36 })).toBe('bad')
    expect(airBand({ pm10: 0, pm25: 75 })).toBe('bad')
    expect(airBand({ pm10: 0, pm25: 76 })).toBe('veryBad')
  })
})

describe('the worse reading wins', () => {
  /*
   * The case this exists for: clean coarse dust, dirty fine dust. Averaging
   * would call it moderate, and that is precisely the day the advice matters.
   */
  it('reports bad when only the fine particles are bad', () => {
    expect(airBand({ pm10: 20, pm25: 60 })).toBe('bad')
  })

  it('reports bad when only the coarse particles are bad', () => {
    expect(airBand({ pm10: 120, pm25: 10 })).toBe('bad')
  })

  it('does not average a severe reading away', () => {
    // 매우나쁨 PM2.5 against clean PM10 must not come back as moderate.
    expect(airBand({ pm10: 5, pm25: 90 })).toBe('veryBad')
  })
})

describe('the continuous load', () => {
  it('is zero for clean air and saturates rather than running away', () => {
    expect(pollutionLoad({ pm10: 0, pm25: 0 })).toBe(0)
    // A severe dust storm does not produce different advice than a bad day
    // does, so the figure has a ceiling.
    expect(pollutionLoad({ pm10: 900, pm25: 400 })).toBe(100)
  })

  it('tracks whichever pollutant is worse', () => {
    // PM2.5 at 75 is the top of 나쁨 → 100% of its scale.
    expect(pollutionLoad({ pm10: 0, pm25: 75 })).toBe(100)
    expect(pollutionLoad({ pm10: 75, pm25: 0 })).toBe(50)
    // The higher of the two, not the sum.
    expect(pollutionLoad({ pm10: 75, pm25: 37.5 })).toBe(50)
  })
})

describe('when to speak up', () => {
  it('stays quiet on ordinary days', () => {
    expect(isPolluted('good')).toBe(false)
    expect(isPolluted('moderate')).toBe(false)
  })

  it('speaks on bad ones', () => {
    expect(isPolluted('bad')).toBe(true)
    expect(isPolluted('veryBad')).toBe(true)
  })
})
