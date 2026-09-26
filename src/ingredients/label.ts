/**
 * Split the text off a cosmetic label into candidate ingredient names.
 *
 * This is the first step of a scan and the one that decides whether the rest
 * works. OCR hands over one blob:
 *
 *   [전성분] 정제수, 글리세린, 1,2-헥산다이올, 나이아신아마이드,
 *   부틸렌글라이콜, 향료(리모넨), 다이소듐이디티에이
 *
 * and everything downstream needs it as a list. What makes that harder than
 * `split(',')`:
 *
 *   ∙ 1,2-헥산다이올 and 2,3-뷰테인다이올 contain commas that are part of the
 *     name. Splitting on every comma turns one real ingredient into two tokens
 *     that match nothing, and the customer is told their product contains
 *     something unrecognised.
 *   ∙ OCR breaks lines mid-name, so a newline is sometimes a separator and
 *     sometimes not.
 *   ∙ Labels carry headings, weights, batch codes and marketing text that are
 *     not ingredients at all.
 *
 * Nothing here decides whether a token is a real ingredient — that is the
 * matcher's job against the register. This only proposes candidates, and errs
 * towards proposing: an extra token comes back as "인식하지 못한 성분", which is
 * honest, while a dropped one is invisible.
 */

/** Headings that introduce the list without being part of it. */
const HEADINGS = [
  /\[?\s*전\s*성\s*분\s*\]?\s*[:：]?/g,
  /\[?\s*성\s*분\s*명?\s*\]?\s*[:：]/g,
  /\[?\s*주요\s*성분\s*\]?\s*[:：]?/g,
  /ingredients?\s*[:：]/gi,
  /\[?\s*화장품법에?\s*따른?\s*전성분\s*\]?\s*[:：]?/g,
]

/**
 * Tokens that are never an ingredient.
 *
 * Deliberately narrow. The cost of wrongly dropping a token is a restriction the
 * customer never sees, so this only removes things that cannot be a name:
 * measurements, pure punctuation, batch codes, and the few words labels use to
 * end a list.
 */
const NOT_A_NAME = [
  /^\d+(\.\d+)?\s*(ml|mL|g|kg|mg|oz|fl|개|매|장|정)?$/i,
  /^[\s\-–—·•∙,./:;()[\]{}]+$/,
  /^(제조번호|사용기한|개봉후|유통기한|용량|내용량|made\s*in|kc|제조원|판매원|책임판매업자)/i,
  /^[A-Z]{1,3}\d{4,}$/,
]

/**
 * A comma that separates, as opposed to one inside a chemical name.
 *
 * `1,2-헥산다이올` and `2,4,6-트라이브로모페놀` put digits either side of the
 * comma; a separating comma never does. This is the single rule that keeps those
 * names whole, and getting it wrong is silent — the halves simply fail to match
 * and are reported as unrecognised.
 */
function splitOnCommas(text: string): string[] {
  const out: string[] = []
  let current = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === ',' || ch === '，' || ch === '、') {
      const before = text[i - 1]
      const after = text[i + 1]
      // Between digits: part of the name, keep it.
      if (/\d/.test(before ?? '') && /\d/.test(after ?? '')) {
        current += ','
        continue
      }
      out.push(current)
      current = ''
      continue
    }
    current += ch
  }
  out.push(current)
  return out
}

/**
 * Tidy one candidate.
 *
 * Trailing punctuation and stray brackets come off. A bracket with contents is
 * kept as-is: `향료(리모넨)` is how labels declare a fragrance allergen, and the
 * register holds both that and plain 향료, so the matcher is left to decide
 * rather than having the information removed here.
 */
function tidy(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—·•∙*]+/, '')
    .replace(/[\s.·•∙*]+$/, '')
    .replace(/^[)\]}]+/, '')
    .replace(/[([{]+$/, '')
    .trim()
}

/** How many letters and digits a string really has, ignoring punctuation. */
function realLength(s: string): number {
  return s.replace(/[^가-힣a-zA-Z0-9]/g, '').length
}

/** The part of a line up to its first separating comma. */
function firstToken(line: string): string {
  return splitOnCommas(line)[0] ?? ''
}

/**
 * Is this newline a break inside a name, or between two ingredients?
 *
 * Both happen, often in the same label, so the decision is per line break. Two
 * signals together, and they have to be together:
 *
 *   ∙ the line does not end in a comma — a comma is a separator regardless
 *   ∙ the next line *begins* with something too short to be an ingredient
 *
 * The second is the one that matters, and reading the current line's length
 * instead was the bug: '정제수' is three characters, so every short ingredient in
 * a newline-separated list was glued to the one after it. What marks a wrap is a
 * stub on the far side of the break — '1,2-헥산다이' / '올' — not a short name
 * before it.
 */
function isWrap(line: string, next: string): boolean {
  if (!line.trim() || !next.trim()) return false
  if (/[,，、]$/.test(line.trim())) return false
  return realLength(firstToken(next)) < 3
}

export interface ParsedLabel {
  /** Candidate names, in the order the label lists them. */
  names: string[]
  /** What was thrown away, so an operator can see the parser's decisions. */
  dropped: string[]
}

/**
 * Read a label's worth of text into candidate names.
 *
 * Order is preserved because it carries meaning: 화장품법 requires ingredients
 * above 1% to be listed by descending quantity, so the first few names are most
 * of the product and the tail is present in traces. A UI that reorders them
 * throws that away.
 */
export function parseLabel(text: string | null | undefined): ParsedLabel {
  if (!text || !text.trim()) return { names: [], dropped: [] }

  let body = text
  for (const heading of HEADINGS) body = body.replace(heading, ' ')

  /*
   * Rebuild the text with each line break resolved: joined where it split a
   * name, turned into a comma where it separated two ingredients.
   *
   * Done before splitting rather than after, because once '1,2-헥산다이' and
   * '올' are separate tokens neither matches anything and there is no way to
   * tell they belong together.
   */
  const lines = body.split(/\r?\n/).filter((l) => l.trim())
  let flat = ''
  for (let i = 0; i < lines.length; i++) {
    flat += lines[i]
    if (i + 1 < lines.length) flat += isWrap(lines[i], lines[i + 1]) ? '' : ','
  }

  const names: string[] = []
  const dropped: string[] = []
  const seen = new Set<string>()

  for (const chunk of splitOnCommas(flat)) {
    const name = tidy(chunk)
    if (!name) continue

    if (NOT_A_NAME.some((p) => p.test(name))) {
      dropped.push(name)
      continue
    }
    // A single character cannot be an ingredient name, and OCR produces plenty
    // of them from specks and borders.
    if (name.replace(/[^가-힣a-zA-Z0-9]/g, '').length < 2) {
      dropped.push(name)
      continue
    }

    // Labels repeat a name when it appears in two phases of a formula. Shown
    // once, because twice reads as two different ingredients.
    const key = name.replace(/\s+/g, '').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    names.push(name)
  }

  return { names, dropped }
}
