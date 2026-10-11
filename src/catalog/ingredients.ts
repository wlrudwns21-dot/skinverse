import type { Lang, Localized } from '../data/types'

/**
 * Which ingredient list to show a reader, and what to say about it.
 *
 * ── the rule ───────────────────────────────────────────────────────────────
 *
 * Nothing here is translated. Ingredient names are regulated nomenclature,
 * not prose: a machine translation produces words that look plausible and are
 * not the substance, and this is the one block on the page a customer with an
 * allergy actually reads. So every language shows what the maker themselves
 * published, and nothing else.
 *
 * ── what a reader gets when their language is missing ──────────────────────
 *
 * INCI. That is exactly what INCI is for — one naming system, agreed across
 * jurisdictions, so that a Thai reader and a Korean reader looking at the
 * same jar can establish they are looking at the same substance. It is not a
 * perfect answer for someone who reads no Latin script, but it is a true one,
 * and the screen says plainly that this is what it is doing rather than
 * letting the reader assume the list is in their language.
 *
 * Korean is never used as a fallback. A wall of hangul in the middle of a
 * Thai page is not information, it is noise that looks like information.
 */

export interface IngredientView {
  /** The list to print. Empty when the maker published nothing at all. */
  text: string
  /** The language `text` is actually in — not necessarily the reader's. */
  shownIn: Lang
  /** True when we fell back, so the screen should say which language this is. */
  isFallback: boolean
}

/** What the maker published, per locale. Absent keys mean "never published". */
export interface IngredientSources {
  /** Korean, from `products.ingredients`. */
  ko: string
  /** INCI, from `products.inci`. This is the fallback for everyone. */
  inci: string
  /** Anything else the maker published, from `products.ingredients_l`. */
  extra?: Partial<Record<Lang, string>>
}

const clean = (v: string | undefined): string => (v ?? '').trim()

export function ingredientsFor(lang: Lang, src: IngredientSources): IngredientView | null {
  const own = lang === 'ko' ? clean(src.ko) : lang === 'en' ? clean(src.inci) : clean(src.extra?.[lang])
  if (own) return { text: own, shownIn: lang, isFallback: false }

  const inci = clean(src.inci)
  if (inci) return { text: inci, shownIn: 'en', isFallback: true }

  // No INCI either. Korean is better than nothing only for a Korean reader.
  const ko = clean(src.ko)
  if (ko && lang === 'ko') return { text: ko, shownIn: 'ko', isFallback: false }
  return null
}

/**
 * Said under the list when it is not in the reader's language.
 *
 * Worded as a statement of fact rather than an apology, and it names INCI so
 * a reader who wants to look a substance up knows what they are holding.
 */
export const INCI_NOTE: Localized = {
  ko: '제조사가 이 언어로 공개한 전성분이 없어 국제 표기(INCI)로 보여드립니다.',
  en: 'Shown in INCI, the international ingredient naming system.',
  zh: '制造商未以此语言公开全成分，故以国际命名（INCI）显示。',
  th: 'ผู้ผลิตไม่ได้เปิดเผยส่วนผสมในภาษานี้ จึงแสดงด้วยชื่อสากล (INCI)',
}

/**
 * How much of the list to show before asking.
 *
 * A full list runs to seventy-six ingredients and a thousand characters. Left
 * open it is the longest block on the page by a wide margin, and it sits
 * between the analysis and the buy buttons, so every reader scrolls past all
 * of it whether they wanted it or not. Collapsed, the people who came for it
 * are one tap away and everyone else gets a page they can reach the end of.
 *
 * The number is characters rather than ingredients because what matters is
 * the height on screen, and Chinese says in one character what Korean says in
 * four.
 */
export const INGREDIENT_PREVIEW = 160

/** Whether the list is long enough that collapsing it is worth doing. */
export const needsCollapse = (text: string): boolean => text.length > INGREDIENT_PREVIEW + 40

/** The opening slice, cut at an ingredient boundary rather than mid-word. */
export function ingredientPreview(text: string): string {
  if (!needsCollapse(text)) return text
  const cut = text.slice(0, INGREDIENT_PREVIEW)
  // Korean and INCI separate on a comma, Chinese on an ideographic comma.
  const at = Math.max(cut.lastIndexOf(','), cut.lastIndexOf('、'))
  return (at > 40 ? cut.slice(0, at) : cut).trimEnd() + '…'
}

export const moreLabel: Localized = {
  ko: '전성분 모두 보기',
  en: 'Show the full list',
  zh: '查看全部成分',
  th: 'ดูส่วนผสมทั้งหมด',
}

export const lessLabel: Localized = {
  ko: '접기',
  en: 'Collapse',
  zh: '收起',
  th: 'ย่อ',
}
