import type { Lang } from '../data/types'
import type { Strings } from './types'
import { en } from './en'
import { ko } from './ko'
import { zh } from './zh'
import { th } from './th'

export type { Strings }

export const dictionaries: Record<Lang, Strings> = { en, ko, zh, th }

export function strings(lang: Lang): Strings {
  return dictionaries[lang] ?? en
}

/** Language picker options, in the order the prototype lists them. */
export const langOptions: { value: Lang; short: string; full: string }[] = [
  { value: 'en', short: '🌐 EN', full: 'English' },
  { value: 'ko', short: '🌐 한국어', full: '한국어' },
  { value: 'zh', short: '🌐 中文', full: '中文' },
  { value: 'th', short: '🌐 ไทย', full: 'ไทย' },
]
