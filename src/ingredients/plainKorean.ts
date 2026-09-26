/**
 * Turn 식약처's restriction text into sentences a shopper can act on.
 *
 * The Ministry writes for manufacturers, and it writes densely:
 *
 *   * 배합한도 : <보존제>
 *   ∙ 살리실릭애씨드로서 0.5%
 *   ∙ 영유아용 제품류 또는 만 13세 이하 어린이가 사용할 수 있음을 특정하여
 *     표시하는 제품에는 사용금지(다만, 샴푸는 제외)
 *   <기타배합한도>
 *   ∙ 인체세정용 제품류에 살리실릭애씨드로서 2%
 *
 * Every clause there matters to a customer, and none of it reads as an answer to
 * the question they actually have — can my child use this, and how much of it is
 * allowed. So this splits the block into one fact per clause, labels each, and
 * writes it again plainly.
 *
 * ── What this is not ────────────────────────────────────────────────────────
 *
 * It does not judge. There is no score, no 순함 rating, no "safe" flag. A limit
 * is per concentration and per product type, and an ingredient list states
 * neither the concentration nor always the product type — so any verdict built
 * from this would be a guess presented as a citation.
 *
 * It also never drops a clause it cannot classify. An unrecognised bullet comes
 * back as `other` carrying the Ministry's own words, because a restriction that
 * silently disappears because the parser did not recognise its shape is worse
 * than one shown in officialese. Every fact keeps `source` for the same reason:
 * the original is always one tap away.
 */

export type FactKind =
  /** Which category of use the ingredient is approved under, e.g. 보존제. */
  | 'purpose'
  /** A permitted concentration, possibly for one kind of product. */
  | 'limit'
  /** Forbidden in products for infants or children. Singled out on purpose. */
  | 'childBan'
  /** Forbidden in some other kind of product. */
  | 'ban'
  /** Permitted *only* in certain products, e.g. 염모용 화장품에만 사용. */
  | 'onlyFor'
  /** A requirement that is neither a ceiling nor a ban — pH, purity, labelling. */
  | 'condition'
  /** Understood well enough to keep, not well enough to rewrite. */
  | 'other'

export interface Fact {
  kind: FactKind
  /** The products it applies to, in the Ministry's words. Null means all. */
  scope: string | null
  /** The permitted percentage, when the clause names one. */
  percent: number | null
  /** Plain Korean, for a customer. */
  text: string
  /** The Ministry's own words. Always kept, never paraphrased away. */
  source: string
}

/** `* 배합한도 :` and friends — the header, not a fact. */
const HEADER = /^\s*\*?\s*(배합한도|사용한도|기타배합한도|제한사항)\s*[:：]?\s*/

/** A section label the Ministry puts in angle brackets, e.g. `<보존제>`. */
const SECTION = /^\s*[<〈［[]\s*([^>〉］\]]+?)\s*[>〉］\]]\s*$/

/**
 * The bullets in use.
 *
 * The data uses U+2219 (∙). The others appear in neighbouring datasets and in
 * text people paste in by hand, and accepting all of them costs nothing.
 */
const BULLET = /^\s*[∙•·▪◦‧・\-–—]\s*/

/** A percentage anywhere in a clause. Captures the number. */
const PERCENT = /(\d+(?:[.,]\d+)?)\s*%/

/** Infants and children, however the Ministry spells it. */
const CHILD = /영유아|영·?유아|만\s*13\s*세\s*이하|어린이|소아/

/** A prohibition. */
const BAN = /사용\s*금지|사용할\s*수\s*없|금지/

/**
 * Any parenthetical. What is inside decides what it means.
 *
 * `(다만, 샴푸는 제외)` narrows a prohibition, and a parent holding a bottle of
 * shampoo needs it. `(3세 이하 어린이 사용 금지)` does the opposite — it adds a
 * restriction the clause outside the brackets says nothing about. Treating both
 * as "the exception" is how a ceiling gets lost, so they are separated below by
 * whether they forbid or excuse.
 */
const PAREN = /[(（]([^)）]*)[)）]/g

/** A leading 다만/단, which is glue between clauses rather than part of one. */
const LEADING_BUT = /^\s*(?:다만|단)\s*[,，]?\s*/

/**
 * Phrases worth translating, longest first.
 *
 * Longest first matters: '사용 후 씻어내지 않는 제품' contains '사용 후 씻어내는
 * 제품' as a substring, and replacing the shorter one first would turn "leave-on"
 * into "rinse-off 지 않는" — an inversion of the meaning, in the direction that
 * tells someone a limit is laxer than it is.
 */
const PLAIN: [RegExp, string][] = [
  [/사용\s*후\s*씻어내지\s*않는\s*제품(류)?/g, '바르고 그대로 두는 제품'],
  [/사용\s*후\s*씻어내는\s*제품(류)?/g, '씻어내는 제품'],
  [/인체\s*세정용\s*제품(류)?/g, '바디워시·클렌저 등 세정 제품'],
  [/두발\s*용\s*제품(류)?/g, '헤어 제품'],
  [/영유아용\s*제품(류)?/g, '영유아용 제품'],
  [/기능성화장품의\s*유효성분/g, '기능성화장품의 주성분'],
  [/점막\s*에\s*닿는/g, '입·눈 등 점막에 닿는'],
]

function plain(text: string): string {
  let out = text
  for (const [pattern, replacement] of PLAIN) out = out.replace(pattern, replacement)
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * What kind of product a clause is about.
 *
 * The Ministry writes the scope before `에` or `에는`: "인체세정용 제품류에
 * 살리실릭애씨드로서 2%". Anything longer than a short phrase is almost
 * certainly a sentence rather than a scope, and is left alone — a wrong scope
 * reads as a confident statement about the wrong products.
 */
function scopeOf(clause: string): string | null {
  const m = /^(.{2,40}?)\s*에(?:는|서)?\s/.exec(clause)
  if (!m) return null
  const scope = m[1].trim()
  // '살리실릭애씨드로서' is the substance, not a scope.
  if (/로서$/.test(scope)) return null
  return scope
}

/**
 * Every percentage in a clause.
 *
 * One bullet can carry two: "사용 후 씻어내는 …에 2.5%, 사용 후 씻어내지 않는
 * …에 1.0%". Taking only the first would state the laxer of the two as if it
 * were the whole rule.
 */
function percentsIn(clause: string): number[] {
  const out: number[] = []
  for (const m of clause.matchAll(new RegExp(PERCENT, 'g'))) {
    const n = Number(m[1].replace(',', '.'))
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

/**
 * Does this syllable end in a consonant? Decides 은 against 는.
 *
 * Hangul syllables are laid out so that the final consonant is the remainder
 * modulo 28, with 0 meaning none. Anything that is not a Hangul syllable — a
 * digit, a Latin letter — gets 는, which is wrong about as often as any other
 * guess and never produces a word that does not exist.
 */
function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1)
  if (!ch) return false
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

/**
 * The body of `(다만, 샴푸는 제외)`, reduced to the thing being excepted.
 *
 * The Ministry's phrasing already carries its own particle and verb, so keeping
 * it and appending '예외입니다' yields '샴푸는 제외는 예외입니다'. Stripping both
 * and re-attaching the particle by the word's own ending gives '샴푸는' and
 * '어린이용 제품은' correctly, which matters because this sentence is the one a
 * parent reads to decide whether a bottle is usable.
 */
function exceptionOf(body: string): string | null {
  const core = plain(body)
    .replace(LEADING_BUT, '')
    .replace(/\s*(?:은|는|이|가)?\s*제외(?:한다|됩니다|임|됨)?\.?$/, '')
    .trim()
  if (!core) return null
  return core + (hasFinalConsonant(core) ? '은' : '는')
}



/** A prohibition, worded plainly. Children are singled out on purpose. */
function banFact(text: string, source: string, suffix: string): Fact {
  if (CHILD.test(text)) {
    return {
      kind: 'childBan',
      scope: null,
      percent: null,
      text: (/3\s*세/.test(text) && !/13\s*세/.test(text)
        ? '만 3세 이하 어린이에게는 쓸 수 없습니다.'
        : '영유아용 제품과 만 13세 이하 어린이용으로 표시된 제품에는 쓸 수 없습니다.') + suffix,
      source,
    }
  }
  const scope = scopeOf(text)
  return {
    kind: 'ban',
    scope,
    percent: null,
    text: scope ? `${plain(scope)}에는 쓸 수 없습니다.${suffix}` : `이 용도로는 쓸 수 없습니다.${suffix}`,
    source,
  }
}

/**
 * One clause into one or more facts.
 *
 * More than one, because the Ministry routinely puts two rules in a sentence:
 *
 *   ∙ 다만, 데오드란트에 배합할 경우에는 0.0075% (3세 이하 어린이 사용 금지)
 *
 * is a ceiling and a child restriction. Reading it as a single fact meant the
 * prohibition in the brackets won the classification and the 0.0075% ceiling was
 * dropped — the customer saw the warning and never the number, and nothing said
 * a number had gone missing.
 *
 * So the brackets are separated from the rest first, and sorted by what they do:
 * one that forbids becomes a fact of its own, one that excuses becomes the
 * trailing "단, … 예외입니다" on the fact it qualifies.
 */
function classify(clause: string): Fact[] {
  const source = clause.trim()

  /*
   * What a bracket is doing, because they do four different things.
   *
   *   rule     '(3세 이하 어린이 사용 금지)', '(다만, … 10%)' — a restriction or a
   *            ceiling of its own, which must become its own fact
   *   except   '(다만, 샴푸는 제외)' — narrows the clause it sits in
   *   qualify  '(단일성분 또는 혼합사용의 합으로서)' — says how the number is
   *            measured; belongs inside the sentence
   *   inline   '(스프레이에 한함)', '(색소)', '(탈염탈색 포함)' — part of a noun
   *            phrase, not a clause at all
   *
   * Reading every bracket as a rule filled the output with bullets that forbid
   * and permit nothing: '스프레이에 한함' on its own line under a heading of
   * restrictions. Reading none of them as a rule lost real ceilings. So they are
   * sorted, and an inline one is simply left where it stands.
   */
  const bracketRole = (body: string): 'rule' | 'except' | 'qualify' | 'inline' => {
    if (BAN.test(body) || PERCENT.test(body)) return 'rule'
    if (/제외/.test(body)) return 'except'
    if (/로서|합으로|단일성분|혼합사용|합계/.test(body)) return 'qualify'
    if (LEADING_BUT.test(body)) return 'rule'
    return 'inline'
  }

  const parens: string[] = [...clause.matchAll(PAREN)].map((m) => m[1].trim()).filter(Boolean)
  const excusing = parens.filter((p) => bracketRole(p) === 'except')
  const qualifying = parens.filter((p) => bracketRole(p) === 'qualify')
  const note = qualifying.length > 0 ? `${plain(qualifying[0])} 기준. ` : ''

  /*
   * The clause with the brackets that became facts of their own taken out, and
   * the ones that are part of a phrase left in. Also without the 다만 joining it
   * to the clause before, which would otherwise be swept into a parsed scope.
   */
  const bare = clause
    .replace(PAREN, (whole, body: string) =>
      bracketRole(String(body).trim()) === 'inline' ? whole : ' ',
    )
    .replace(/\s+/g, ' ')
    .replace(LEADING_BUT, '')
    .trim()

  const except = excusing.length > 0 ? exceptionOf(excusing[0]) : null
  const suffix = except ? ` 단, ${except} 예외입니다.` : ''

  const percents = percentsIn(bare)
  const percent = percents.length > 0 ? Math.min(...percents) : null
  const banned = BAN.test(bare)

  const facts: Fact[] = []

  if (banned) {
    facts.push(banFact(bare, source, suffix))
  } else if (/^(.{2,40}?)\s*에만\s*(?:사용|허용)/.test(bare) && percent === null) {
    // '염모용 화장품에만 사용' — a permission narrow enough to read as a
    // restriction, and common in the register. It contains no prohibition word,
    // so without this it would fall through to `other`.
    const m = /^(.{2,40}?)\s*에만\s*(?:사용|허용)/.exec(bare) as RegExpExecArray
    facts.push({
      kind: 'onlyFor',
      scope: m[1].trim(),
      percent: null,
      text: `${plain(m[1].trim())}에만 쓸 수 있습니다.${suffix}`,
      source,
    })
  } else if (percent !== null && /함량|순도|원료\s*중|평균분자량|농도는/.test(bare)) {
    /*
     * A number about the raw material's own composition, not about how much of it
     * a formula may hold. '원료 중 알파 테르티에닐 함량은 0.35% 이하' is a purity
     * requirement on what the manufacturer buys; filed as a ceiling it would read
     * as "최대 0.35%까지 넣을 수 있습니다" — an allowance that does not exist, for
     * a substance that is not the one being looked up.
     */
    facts.push({ kind: 'condition', scope: null, percent: null, text: plain(bare), source })
  } else if (percents.length > 1) {
    /*
     * Several ceilings in one clause, kept together and worded as the Ministry
     * did. Rewriting "…에 2.5%, …에 1.0%" as one "최대 N%" sentence means picking
     * a number to show and a number to hide; `percent` carries the strictest so a
     * headline cannot overstate what is allowed, and the text keeps both in the
     * context that says which applies where.
     */
    facts.push({ kind: 'limit', scope: null, percent, text: plain(bare) + suffix, source })
  } else if (percent !== null) {
    const scope = scopeOf(bare)
    facts.push({
      kind: 'limit',
      scope,
      percent,
      text: scope
        ? `${plain(scope)}에는 최대 ${percent}%까지 넣을 수 있습니다.${suffix}`
        : `최대 ${percent}%까지 넣을 수 있습니다.${suffix}`,
      source,
    })
  } else if (/pH|이하|이상|초과|함량|표시|기준/.test(bare)) {
    // A requirement with no number and no prohibition: pH ceilings, labelling
    // duties. Recognisable as a condition, not safe to reword, so the Ministry's
    // sentence is shown with only the vocabulary swapped.
    facts.push({ kind: 'condition', scope: null, percent: null, text: plain(bare), source })
  } else if (bare) {
    facts.push({ kind: 'other', scope: null, percent: null, text: plain(bare), source })
  }

  /*
   * Every remaining bracket, read as the clause it is.
   *
   * Not just the prohibitions. `(다만, 염모용제품류에 용제로 사용할 경우에는 10%)`
   * is a second ceiling, and `(다만, 제품의 pH는 6을 넘어야 함)` a condition;
   * both used to be discarded silently because they were neither a ban nor a
   * 제외. Running the same classifier over the bracket's contents keeps every
   * rule and needs no separate vocabulary — the bodies contain no further
   * brackets, so this recurses exactly one level.
   */
  if (note && facts.length > 0) facts[0] = { ...facts[0], text: note + facts[0].text }

  for (const p of parens) {
    if (bracketRole(p) !== 'rule') continue
    facts.push(...classify(p))
  }

  return facts
}

/**
 * Read one `limit_text` block into facts.
 *
 * Returns an empty list for an empty block, which is a real case: entries like
 * 징크스테아레이트 carry the literal text `* 배합한도 :` and nothing after it.
 * An empty list means "the Ministry recorded no ceiling here", and the caller
 * must not render that as a reassurance.
 */
export function readLimit(limitText: string | null | undefined): Fact[] {
  if (!limitText) return []

  const facts: Fact[] = []
  let section: string | null = null
  /** The clause being built, since one bullet can wrap over several lines. */
  let pending: string | null = null

  const flush = () => {
    if (pending && pending.trim()) facts.push(...classify(pending))
    pending = null
  }

  for (const rawLine of limitText.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line) continue

    // The header may sit on its own line or share one with the first clause.
    if (HEADER.test(line)) {
      line = line.replace(HEADER, '').trim()
      if (!line) continue
    }

    const sectionMatch = SECTION.exec(line)
    if (sectionMatch) {
      flush()
      section = sectionMatch[1].trim()
      facts.push({
        kind: 'purpose',
        scope: null,
        percent: null,
        // '기타배합한도' is a filing heading, not a purpose. Saying "기타배합한도
        // 용도로 허용" would be nonsense presented as fact.
        text: /기타|그\s*외/.test(section)
          ? '아래는 그 밖의 용도에 대한 한도입니다.'
          : `${section} 용도로 허용된 성분입니다.`,
        source: line,
      })
      continue
    }

    if (BULLET.test(line)) {
      flush()
      pending = line.replace(BULLET, '')
      continue
    }

    /*
     * A line with no bullet: a wrapped fragment, or a rule of its own.
     *
     * Merging everything was wrong and quietly destructive. Given
     *
     *   * 배합한도 : 0.01%
     *   눈 주위 및 입술에 사용할 수 없음
     *
     * the two lines joined into one clause, the prohibition won the
     * classification, and the 0.01% ceiling vanished from the output entirely —
     * no warning, no `other`, just a limit the customer never saw.
     *
     * So only genuine continuations are merged: a line opening a parenthesis,
     * or one closing a parenthesis the pending clause left open. Everything else
     * starts its own clause.
     */
    const unclosed = pending !== null &&
      (pending.match(/[(（]/g) ?? []).length > (pending.match(/[)）]/g) ?? []).length
    if (pending !== null && (unclosed || /^[(（]/.test(line))) {
      pending += ' ' + line
    } else {
      flush()
      pending = line
    }
  }
  flush()

  return facts
}

/**
 * The one line a product page can show above the detail.
 *
 * Prefers the child restriction, then a ban, then the strictest ceiling, because
 * that is the order in which the facts can change somebody's mind. Returns null
 * rather than inventing a summary when there is nothing to summarise.
 */
export function headline(facts: Fact[]): string | null {
  const child = facts.find((f) => f.kind === 'childBan')
  if (child) return child.text

  const ban = facts.find((f) => f.kind === 'ban')
  if (ban) return ban.text

  const limits = facts.filter((f) => f.kind === 'limit' && f.percent !== null)
  if (limits.length === 0) return null

  // The strictest, not the first. Leading with a 3% ceiling when a 0.5% one also
  // applies would understate the restriction.
  const tightest = limits.reduce((a, b) => ((b.percent as number) < (a.percent as number) ? b : a))
  return tightest.text
}

/** The child restriction, if the Ministry recorded one. */
export function childWarning(facts: Fact[]): Fact | null {
  return facts.find((f) => f.kind === 'childBan') ?? null
}

/**
 * Whether anything here restricts use on children.
 *
 * Deliberately not the inverse: false means the Ministry recorded no such
 * restriction for this ingredient, which is not the same as it being suitable
 * for a child, and nothing in the UI may present it that way.
 */
export function restrictsChildren(facts: Fact[]): boolean {
  return facts.some((f) => f.kind === 'childBan')
}
