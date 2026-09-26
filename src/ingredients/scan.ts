import { readLimit, restrictsChildren, type Fact } from './plainKorean'

/**
 * A scan's results, assembled for a customer.
 *
 * The pieces arrive separately — the label parser proposes names, the register
 * says what they are, our own copy says what they do, 식약처 says what is
 * restricted — and this is where they become one answer.
 *
 * ── The line this file will not cross ───────────────────────────────────────
 *
 * There is no score, no grade, and no 순함 rating. Three reasons, and each one
 * alone is enough:
 *
 *   ∙ A limit is per concentration and per product type. An ingredient list
 *     states the order of ingredients, not their amounts, so "0.5% 한도" and
 *     "this product is within it" are different claims and only the first is
 *     knowable from a label.
 *   ∙ Whether a product suits a particular child is a medical judgement. The
 *     register says what the Ministry restricted; it does not say what is safe.
 *   ∙ A number invites comparison. Two products scoring 82 and 76 would be
 *     ranked by customers as though the difference meant something.
 *
 * So what comes out is a count and a quotation: how many ingredients 식약처 has
 * restricted for children, which ones, and its own words for each.
 */

/** How sure the match is. `ambiguous` and `unknown` carry no ingredient. */
export type MatchStatus = 'exact' | 'likely' | 'ambiguous' | 'unknown'

export interface Restriction {
  country: string | null
  category: string | null
  limitText: string | null
  provision: string | null
  noticeName: string | null
}

/** One row as the database returns it. */
export interface ScanRow {
  inputName: string
  status: MatchStatus
  korName: string | null
  engName: string | null
  role: string | null
  blurb: Record<string, string> | null
  origin: string | null
  score: number | null
  candidates: { korName: string; engName: string | null; role: string | null; score: number }[]
  restrictions: Restriction[]
}

export interface ScannedIngredient extends ScanRow {
  /** Our own description in the reader's language, or null if unwritten. */
  description: string | null
  /** 식약처's restrictions, read into plain sentences. Empty when unrestricted. */
  facts: Fact[]
  /** True when the Ministry restricted use on infants or children. */
  childRestricted: boolean
  /** The sentence to show first, or null when there is nothing to lead with. */
  headline: string | null
}

export interface ScanSummary {
  /** Every name from the label, in the order it was printed. */
  items: ScannedIngredient[]
  /** How many names were identified with confidence. */
  identified: number
  /** How many could be one of several ingredients — the label was not legible. */
  ambiguous: number
  /** How many matched nothing in the register. */
  unknown: number
  /** Ingredients 식약처 restricts for infants or children, in label order. */
  childRestricted: ScannedIngredient[]
  /** Ingredients carrying any restriction at all. */
  restricted: ScannedIngredient[]
  /** How many carry our own description. The rest are identified but undescribed. */
  described: number
}

/**
 * Pick the reader's language, falling back rather than showing nothing.
 *
 * Korean is the fallback because it is the language the copy is written in and
 * the one always present when any is. A missing translation shows the Korean,
 * which a reader can at least paste into a translator; a blank tells them the
 * ingredient has no description, which would be false.
 */
export function describe(
  blurb: Record<string, string> | null | undefined,
  locale: string,
): string | null {
  if (!blurb) return null
  const order = [locale, 'ko', 'en', 'zh', 'th']
  for (const key of order) {
    const text = blurb[key]
    if (typeof text === 'string' && text.trim()) return text.trim()
  }
  return null
}

/** Read one row into something a screen can render. */
export function readRow(row: ScanRow, locale: string): ScannedIngredient {
  /*
   * Every restriction is read, and their facts concatenated.
   *
   * One ingredient can carry several rulings in one market — 살리실릭애씨드 is
   * limited as a 보존제 and again under 기타배합한도 — and dropping any of them
   * would drop whichever child clause happened to be in the one dropped.
   */
  const facts = row.restrictions.flatMap((r) => readLimit(r.limitText))

  return {
    ...row,
    description: describe(row.blurb, locale),
    facts,
    childRestricted: restrictsChildren(facts),
    // The lead sentence comes from the Ministry when it has something to say,
    // and from our own copy otherwise — in that order, because a restriction
    // matters more to a reader than a description of benefits.
    headline: facts.length > 0
      ? (facts.find((f) => f.kind === 'childBan') ?? facts.find((f) => f.kind === 'ban') ?? null)
          ?.text ?? null
      : null,
  }
}

/**
 * Assemble the whole scan.
 *
 * `identified` counts `exact` and `likely` together and `ambiguous` separately,
 * because an ambiguous reading is not a partial success — the label could not be
 * read well enough to name the ingredient, and counting it as found would
 * overstate what the scan knows.
 */
export function summarise(rows: ScanRow[], locale: string): ScanSummary {
  const items = rows.map((r) => readRow(r, locale))

  return {
    items,
    identified: items.filter((i) => i.status === 'exact' || i.status === 'likely').length,
    ambiguous: items.filter((i) => i.status === 'ambiguous').length,
    unknown: items.filter((i) => i.status === 'unknown').length,
    childRestricted: items.filter((i) => i.childRestricted),
    restricted: items.filter((i) => i.facts.length > 0),
    described: items.filter((i) => i.description !== null).length,
  }
}

/**
 * The one-line verdict on children — which is a count, not a judgement.
 *
 * Returns null when nothing was restricted, and the caller must render that as
 * "제한 성분이 없습니다" rather than "안전합니다". The register recording no
 * restriction for an ingredient is not the Ministry approving it for a child,
 * and a scan that says otherwise is making a medical claim on our behalf.
 */
export function childSummary(scan: ScanSummary): string | null {
  const n = scan.childRestricted.length
  if (n === 0) return null
  const names = scan.childRestricted.map((i) => i.korName).filter(Boolean).join(', ')
  return `식약처가 영유아·어린이용 제품에 사용을 제한한 성분이 ${n}개 있습니다: ${names}`
}

/** Ingredients grouped by what they are for, in label order within each group. */
export function byRole(scan: ScanSummary): { role: string; items: ScannedIngredient[] }[] {
  const groups = new Map<string, ScannedIngredient[]>()
  for (const item of scan.items) {
    // An unidentified name has no role, and inventing '기타' for it would file it
    // beside ingredients we did recognise.
    if (!item.role) continue
    const list = groups.get(item.role) ?? []
    list.push(item)
    groups.set(item.role, list)
  }
  // Largest group first: it is the one that describes what kind of product this
  // is, which is the first thing a reader wants.
  return [...groups.entries()]
    .map(([role, items]) => ({ role, items }))
    .sort((a, b) => b.items.length - a.items.length || a.role.localeCompare(b.role, 'ko'))
}
