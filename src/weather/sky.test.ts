import { describe, expect, it } from 'vitest'
import { skyFor, skyImage } from './sky'

describe('skyFor', () => {
  it('reads a clear sky', () => {
    expect(skyFor(0)).toBe('clear')
    expect(skyFor(1)).toBe('clear')
  })

  it('puts overcast and fog together, because both are a grey sky', () => {
    expect(skyFor(2)).toBe('cloud')
    expect(skyFor(3)).toBe('cloud')
    expect(skyFor(45)).toBe('cloud')
    expect(skyFor(48)).toBe('cloud')
  })

  it('covers every form of falling water, drizzle through thunderstorm', () => {
    for (const code of [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]) {
      expect(skyFor(code), `code ${code}`).toBe('rain')
    }
  })

  it('covers snowfall and snow showers', () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(skyFor(code), `code ${code}`).toBe('snow')
    }
  })

  it('leaves no code in the published table unclassified', () => {
    const published = [
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
      71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
    ]
    for (const code of published) {
      expect(['clear', 'cloud', 'rain', 'snow']).toContain(skyFor(code))
    }
  })

  it('falls back to a plain sky when the reading has no code at all', () => {
    // The sample weather predates this field, and a partial payload is normal.
    expect(skyFor(undefined)).toBe('clear')
    expect(skyFor(NaN)).toBe('clear')
  })

  it('shows grey for a code the table does not list, never sunshine', () => {
    // Of the four skies, "clear" is the only one that misleads when we cannot
    // place the reading: it claims sunshine over what might be a storm.
    expect(skyFor(4)).toBe('cloud')
    expect(skyFor(30)).toBe('cloud')
    expect(skyFor(999)).toBe('cloud')
    expect(skyFor(-1)).toBe('cloud')
  })

  it('names a file per sky', () => {
    expect(skyImage('rain')).toBe('/banner/sky-rain.webp')
    expect(skyImage('clear')).toBe('/banner/sky-clear.webp')
  })
})
