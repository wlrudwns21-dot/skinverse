import { describe, expect, it } from 'vitest'
import { hasFinalConsonant, obj, sub, top } from './korean'
import { metricDefs } from '../data/skin'

describe('final consonant detection', () => {
  it('reads the six axis names correctly', () => {
    // 수분·탄력·모공·색소침착·주름 end in a consonant; 민감도 ends in a vowel.
    expect(hasFinalConsonant('수분')).toBe(true)
    expect(hasFinalConsonant('탄력')).toBe(true)
    expect(hasFinalConsonant('모공')).toBe(true)
    expect(hasFinalConsonant('색소침착')).toBe(true)
    expect(hasFinalConsonant('주름')).toBe(true)
    expect(hasFinalConsonant('민감도')).toBe(false)
  })

  it('handles an empty string without throwing', () => {
    expect(hasFinalConsonant('')).toBe(false)
  })

  it('reads a trailing digit the way it is said aloud', () => {
    expect(hasFinalConsonant('1')).toBe(true)   // 일
    expect(hasFinalConsonant('2')).toBe(false)  // 이
    expect(hasFinalConsonant('5')).toBe(false)  // 오
    expect(hasFinalConsonant('6')).toBe(true)   // 육
  })
})

describe('particles', () => {
  it('picks the right subject particle', () => {
    expect(sub('수분')).toBe('수분이')
    expect(sub('민감도')).toBe('민감도가')
  })

  it('picks the right topic particle', () => {
    expect(top('주름')).toBe('주름은')
    expect(top('민감도')).toBe('민감도는')
  })

  it('picks the right object particle', () => {
    expect(obj('수분')).toBe('수분을')
    expect(obj('민감도')).toBe('민감도를')
  })

  it('never leaves the form-letter brackets in a sentence', () => {
    for (const def of metricDefs) {
      const name = def.n.ko
      expect(sub(name)).not.toContain('(')
      expect(top(name)).not.toContain('(')
    }
  })
})
