import { describe, expect, it } from 'vitest'
import type { Lang, Localized } from './types'
import {
  categoryNames,
  coreTip,
  coreTipLabel,
  minutesLabel,
  otherStories,
  readMore,
  stories,
  storiesAll,
  storiesEmpty,
  storiesHomeCta,
  storiesSub,
  storiesTitle,
  storiesToRoutine,
} from './stories'

const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']

/**
 * The stories are shown in four languages with no runtime fallback: an empty
 * string is a blank card, not a graceful degradation. These tests are the only
 * thing standing between a half-translated entry and a customer reading it.
 */

const expectComplete = (where: string, text: Localized) => {
  for (const lang of LANGS) {
    expect(text[lang], `${where} · ${lang}`).toBeTruthy()
    expect(text[lang].trim(), `${where} · ${lang}`).not.toBe('')
  }
}

describe('stories', () => {
  it('translates every title and both paragraphs', () => {
    for (const story of stories) {
      expectComplete(`${story.id} title`, story.title)
      expectComplete(`${story.id} body[0]`, story.body[0])
      expectComplete(`${story.id} body[1]`, story.body[1])
    }
  })

  it('names every category it uses', () => {
    for (const story of stories) {
      expect(categoryNames[story.category], story.category).toBeDefined()
      expectComplete(`category ${story.category}`, categoryNames[story.category])
    }
  })

  it('translates the surrounding chrome', () => {
    expectComplete('title', storiesTitle)
    expectComplete('sub', storiesSub)
    expectComplete('coreTipLabel', coreTipLabel)
    expectComplete('readMore', readMore)
    expectComplete('all', storiesAll)
    expectComplete('empty', storiesEmpty)
    expectComplete('homeCta', storiesHomeCta)
    expectComplete('toRoutine', storiesToRoutine)
  })

  it('gives every story a distinct id', () => {
    const ids = stories.map((story) => story.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries a reading time on every story', () => {
    for (const story of stories) {
      expect(story.minutes, story.id).toBeGreaterThan(0)
      for (const lang of LANGS) expect(minutesLabel(story.minutes, lang)).toContain(String(story.minutes))
    }
  })
})

describe('the core tip', () => {
  /**
   * The routine screen shows exactly one of these inline. Two would make the
   * choice arbitrary; none would fall back to whichever story happens to be
   * first, which is how a list reorder silently changes the advice.
   */
  it('is marked on exactly one story', () => {
    expect(stories.filter((story) => story.coreTip)).toHaveLength(1)
  })

  it('is left out of the list beneath it', () => {
    expect(otherStories).not.toContain(coreTip)
    expect(otherStories).toHaveLength(stories.length - 1)
  })
})
