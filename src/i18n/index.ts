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
 * Japanese is deliberately absent. The app's own wording is fully translated
 * — `ja.ts` is complete, as are the auth, routine and report dictionaries —
 * but the 37 products in the database have no Japanese `sub`, `why`, pros or
 * cons, and `p.sub[lang]` reads the locale straight out with no fallback. A
 * reader who picked Japanese today would get a shop whose chrome is in
 * Japanese and whose products say nothing at all, which is worse than a
 * language that is not offered yet.
 *
 * `LANGS` still carries it, so every test, every `Localized` literal and the
 * admin console's readiness check all cover Japanese already. The only thing
 * standing between here and the picker is the product copy.
 */
export const langOptions: { value: Lang; short: string; full: string }[] = [
  { value: 'en', short: '🌐 EN', full: 'English' },
  { value: 'ko', short: '🌐 한국어', full: '한국어' },
  { value: 'zh', short: '🌐 中文', full: '中文' },
  { value: 'th', short: '🌐 ไทย', full: 'ไทย' },
]
