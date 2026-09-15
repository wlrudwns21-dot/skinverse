import { describe, expect, it } from 'vitest'
import {
  adherenceFor,
  checkId,
  dayOffset,
  isOpen,
  localDay,
  openSlot,
  overallRate,
  streakOf,
  type CheckLog,
  type Checkable,
  type DayAdherence,
} from './checklist'
import { extraPresets, presetsFor, presetById } from './extras'
import type { Lang } from '../data/types'

/** A local Date, built from local parts so the test means the same everywhere. */
const at = (hour: number, minute = 0) => new Date(2026, 8, 15, hour, minute)

const steps: Checkable[] = [
  { slot: 'am', key: 'cleanse' },
  { slot: 'am', key: 'toner' },
  { slot: 'am', key: 'spf' },
  { slot: 'pm', key: 'cleanse' },
  { slot: 'pm', key: 'night' },
]

const log = (entries: Record<string, string[]>): CheckLog =>
  Object.fromEntries(Object.entries(entries).map(([day, ids]) => [day, new Set(ids)]))

describe('the windows', () => {
  it('opens the morning from 4am to noon', () => {
    expect(isOpen('am', at(3, 59))).toBe(false)
    expect(isOpen('am', at(4))).toBe(true)
    expect(isOpen('am', at(11, 59))).toBe(true)
    expect(isOpen('am', at(12))).toBe(false)
  })

  it('opens the evening from 5pm to the end of the day', () => {
    expect(isOpen('pm', at(16, 59))).toBe(false)
    expect(isOpen('pm', at(17))).toBe(true)
    expect(isOpen('pm', at(23, 59))).toBe(true)
  })

  /**
   * The afternoon belongs to neither on purpose. Letting 2pm count for both
   * would turn a twice-a-day habit into something anyone can clear in one go.
   */
  it('leaves the afternoon out of both', () => {
    expect(openSlot(at(14))).toBeNull()
    expect(isOpen('am', at(14))).toBe(false)
    expect(isOpen('pm', at(14))).toBe(false)
  })

  it('names whichever window is open', () => {
    expect(openSlot(at(8))).toBe('am')
    expect(openSlot(at(21))).toBe('pm')
    expect(openSlot(at(2))).toBeNull()
  })
})

describe('the local day', () => {
  /**
   * `toISOString` would convert to UTC first and file a 9pm routine in Seoul
   * under tomorrow — the evening a customer just finished, recorded as a day
   * they have not lived yet.
   */
  it('reads off the local calendar, not UTC', () => {
    expect(localDay(new Date(2026, 8, 15, 23, 30))).toBe('2026-09-15')
    expect(localDay(new Date(2026, 8, 15, 0, 15))).toBe('2026-09-15')
  })

  it('pads months and days', () => {
    expect(localDay(new Date(2026, 0, 3))).toBe('2026-01-03')
  })

  it('steps backwards across a month boundary', () => {
    expect(dayOffset(new Date(2026, 8, 2), -3)).toBe('2026-08-30')
  })
})

describe('a day of adherence', () => {
  it('counts each half separately as well as the whole', () => {
    const day = adherenceFor(
      '2026-09-15',
      steps,
      log({ '2026-09-15': [checkId('am', 'cleanse'), checkId('am', 'spf'), checkId('pm', 'night')] }),
    )
    expect(day).toMatchObject({
      done: 3,
      total: 5,
      pct: 60,
      am: { done: 2, total: 3 },
      pm: { done: 1, total: 2 },
    })
  })

  it('reads a day with no record as nothing done, not as nothing asked', () => {
    const day = adherenceFor('2026-09-14', steps, {})
    expect(day).toMatchObject({ done: 0, total: 5, pct: 0 })
  })

  it('returns zero rather than NaN when the routine asks for nothing', () => {
    expect(adherenceFor('2026-09-15', [], {}).pct).toBe(0)
  })

  it('ignores a tick for a step that is no longer in the routine', () => {
    const day = adherenceFor('2026-09-15', steps, log({ '2026-09-15': [checkId('pm', 'removed')] }))
    expect(day.done).toBe(0)
  })

  /** Same key, different half of the day — these are two separate steps. */
  it('keeps the morning and evening cleanse apart', () => {
    const day = adherenceFor('2026-09-15', steps, log({ '2026-09-15': [checkId('am', 'cleanse')] }))
    expect(day.am.done).toBe(1)
    expect(day.pm.done).toBe(0)
  })
})

describe('streaks', () => {
  const day = (d: string, done: number, total = 5): DayAdherence => ({
    day: d,
    done,
    total,
    pct: Math.round((done / total) * 100),
    am: { done: 0, total: 3 },
    pm: { done: 0, total: 2 },
  })

  it('counts back from today while the days are cleared', () => {
    const streak = streakOf([
      day('2026-09-15', 5),
      day('2026-09-14', 5),
      day('2026-09-13', 5),
      day('2026-09-12', 2),
    ])
    expect(streak.current).toBe(3)
  })

  /**
   * Today being unfinished is not a broken streak — it is still early. Ending
   * the run at midnight every night would zero it before anyone woke up.
   */
  it('does not break the streak on a day that is still in progress', () => {
    const streak = streakOf([day('2026-09-15', 1), day('2026-09-14', 5), day('2026-09-13', 5)])
    expect(streak.current).toBe(2)
  })

  it('does break it on a missed day that has already ended', () => {
    const streak = streakOf([day('2026-09-15', 5), day('2026-09-14', 0), day('2026-09-13', 5)])
    expect(streak.current).toBe(1)
  })

  it('remembers the best run even after it is broken', () => {
    const streak = streakOf([
      day('2026-09-15', 5),
      day('2026-09-14', 0),
      day('2026-09-13', 5),
      day('2026-09-12', 5),
      day('2026-09-11', 5),
    ])
    expect(streak).toEqual({ current: 1, best: 3 })
  })

  it('does not count a day the routine asked nothing of as cleared', () => {
    expect(streakOf([day('2026-09-15', 0, 0), day('2026-09-14', 0, 0)]).best).toBe(0)
  })

  it('sorts the days itself rather than trusting the order it was given', () => {
    const streak = streakOf([day('2026-09-13', 5), day('2026-09-15', 5), day('2026-09-14', 5)])
    expect(streak.current).toBe(3)
  })
})

describe('the overall rate', () => {
  const day = (d: string, done: number, total: number): DayAdherence => ({
    day: d,
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    am: { done: 0, total: 0 },
    pm: { done: 0, total: 0 },
  })

  /**
   * Steps, not days. Averaging the daily percentages would let a day that
   * asked for two steps outweigh one that asked for eight.
   */
  it('weighs every step equally, not every day', () => {
    expect(overallRate([day('a', 1, 2), day('b', 0, 8)])).toBe(10)
  })

  it('is zero, not NaN, with nothing to measure', () => {
    expect(overallRate([])).toBe(0)
  })
})

describe('the extras a member may add', () => {
  const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']

  it('translates every preset', () => {
    for (const preset of extraPresets) {
      for (const lang of LANGS) {
        expect(preset.name[lang], `${preset.id} name ${lang}`).toBeTruthy()
        expect(preset.note[lang], `${preset.id} note ${lang}`).toBeTruthy()
      }
    }
  })

  it('gives every preset a distinct id', () => {
    const ids = extraPresets.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('offers the both-halves steps in both halves', () => {
    expect(presetsFor('am').some((p) => p.id === 'lipMask')).toBe(true)
    expect(presetsFor('pm').some((p) => p.id === 'lipMask')).toBe(true)
  })

  it('keeps night-only steps out of the morning', () => {
    expect(presetsFor('am').some((p) => p.id === 'retinal')).toBe(false)
    expect(presetsFor('pm').some((p) => p.id === 'retinal')).toBe(true)
  })

  it('looks a preset up by id, and admits when there is none', () => {
    expect(presetById('lipMask')?.slot).toBe('any')
    expect(presetById('nonsense')).toBeUndefined()
  })
})
