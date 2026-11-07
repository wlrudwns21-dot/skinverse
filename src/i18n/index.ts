import type { Lang } from '../data/types'
import type { Strings } from './types'
import { en } from './en'
import { ko } from './ko'
import { zh } from './zh'
import { th } from './th'
import { ja } from './ja'

export type { Strings }

export const dictionaries: Record<Lang, Strings> = { en, ko, zh, th, ja }

export function strings(lang: Lang): Strings {
  return dictionaries[lang] ?? en
}

/**
 * Language picker options, in the order the prototype lists them.
 *
 * A language belongs here only once the products can speak it. `p.sub[lang]`
 * reads the locale straight out with no fallback, so offering a language
 * whose product copy is missing gives a reader Japanese chrome wrapped around
 * products that say nothing — worse than a language not yet offered. Japanese
 * waited here for exactly that reason, and is in the list now because all 410
 * of the strings behind the 34 live products have a Japanese reading.
 *
 * What it still lacks is the maker's own detail artwork, which exists for
 * four products out of thirty-four. That is a gap this list does not need to
 * wait on: `DetailPage` renders nothing when a locale has no artwork, so the
 * page is everything we wrote ourselves, minus a brand's marketing images at
 * the bottom of it.
 */
export const langOptions: { value: Lang; short: string; full: string }[] = [
  { value: 'en', short: '🌐 EN', full: 'English' },
  { value: 'ko', short: '🌐 한국어', full: '한국어' },
  { value: 'zh', short: '🌐 中文', full: '中文' },
  { value: 'ja', short: '🌐 日本語', full: '日本語' },
  { value: 'th', short: '🌐 ไทย', full: 'ไทย' },
]
