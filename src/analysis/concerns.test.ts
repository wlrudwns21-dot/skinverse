import { describe, expect, it } from 'vitest'
import type { Lang } from '../data/types'
import {
  CONCERNS,
  concernOf,
  GROUP_ORDER,
  groupNames,
  regionName,
  regionNames,
  zoneHelp,
} from './concerns'

const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']

/**
 * The exact list the edge function asks Perfect Corp for.
 *
 * Kept in step by this test rather than by memory: a concern requested but not
 * described shows the customer a score with no word beside it, which is the
 * thing this whole module exists to prevent.
 */
const REQUESTED_SD = [
  'moisture', 'oiliness', 'firmness', 'pore', 'wrinkle', 'age_spot', 'redness',
  'texture', 'acne', 'radiance', 'dark_circle_v2', 'eye_bag', 'tear_trough',
  'droopy_upper_eyelid', 'droopy_lower_eyelid',
]

describe('coverage', () => {
  it('explains every concern the function actually requests', () => {
    for (const key of REQUESTED_SD) {
      expect(concernOf(key), `no definition for ${key}`).toBeDefined()
    }
  })

  it('resolves both the SD and the HD name of each concern', () => {
    for (const def of CONCERNS) {
      expect(concernOf(def.sd)?.sd).toBe(def.sd)
      expect(concernOf(def.hd)?.sd).toBe(def.sd)
    }
  })

  it('does not map two concerns onto one key', () => {
    const keys = CONCERNS.flatMap((c) => [c.sd, c.hd])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('files every concern under a group the report renders', () => {
    for (const def of CONCERNS) {
      expect(GROUP_ORDER, `${def.sd} is in an unrendered group`).toContain(def.group)
    }
  })
})

describe('wording', () => {
  it('names and explains every concern in every language', () => {
    for (const def of CONCERNS) {
      for (const lang of LANGS) {
        expect(def.name[lang], `${def.sd} name ${lang}`).toBeTruthy()
        expect(def.means[lang], `${def.sd} means ${lang}`).toBeTruthy()
        expect(def.low[lang], `${def.sd} low ${lang}`).toBeTruthy()
      }
    }
  })

  it('says what sensitivity is, rather than just naming it', () => {
    // The reading the customer asked about by name. A score labelled
    // "sensitivity" and nothing else is what prompted this.
    const redness = concernOf('redness')!
    expect(redness.means.ko).toContain('붉')
    expect(redness.means.ko.length).toBeGreaterThan(40)
    expect(redness.means.en.toLowerCase()).toContain('barrier')
  })

  it('names every group and region in every language', () => {
    for (const lang of LANGS) {
      for (const group of GROUP_ORDER) expect(groupNames[group][lang]).toBeTruthy()
      for (const region of Object.keys(regionNames)) {
        expect(regionName(region, lang), `${region} ${lang}`).toBeTruthy()
      }
      expect(zoneHelp[lang]).toBeTruthy()
    }
  })

  it('spells out what the T and U zones are', () => {
    // Standard vocabulary in Korea, meaningless most places else.
    expect(regionNames.t_zone.ko).toContain('이마')
    expect(regionNames.u_zone.ko).toContain('볼')
    expect(regionNames.t_zone.en.toLowerCase()).toContain('forehead')
    expect(regionNames.u_zone.en.toLowerCase()).toContain('cheek')
  })

  it('shows an unrecognised region verbatim rather than dropping it', () => {
    expect(regionName('chin', 'ko')).toBe('chin')
  })
})
