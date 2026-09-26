import { describe, expect, it } from 'vitest'
import { byRole, childSummary, describe as pick, readRow, summarise, type ScanRow } from './scan'

/** The Ministry's real text for 살리실릭애씨드, which carries a child clause. */
const SALICYLIC_LIMIT = `* 배합한도 : <보존제>
∙ 살리실릭애씨드로서 0.5%
∙ 영유아용 제품류 또는 만 13세 이하 어린이가 사용할 수 있음을 특정하여 표시하는 제품에는 사용금지(다만, 샴푸는 제외)`

function row(over: Partial<ScanRow> = {}): ScanRow {
  return {
    inputName: '글리세린',
    status: 'exact',
    korName: '글리세린',
    engName: 'Glycerin',
    role: '보습',
    blurb: { ko: '가장 널리 쓰이는 보습 성분입니다.' },
    origin: '이 원료는 …',
    score: 1,
    candidates: [],
    restrictions: [],
    ...over,
  }
}

describe('describe', () => {
  it('prefers the reader’s language', () => {
    expect(pick({ ko: '한국어', en: 'English' }, 'en')).toBe('English')
    expect(pick({ ko: '한국어', en: 'English' }, 'ko')).toBe('한국어')
  })

  it('falls back to Korean rather than showing nothing', () => {
    // A blank would tell the reader the ingredient has no description, which is
    // false. Korean they can at least paste into a translator.
    expect(pick({ ko: '한국어' }, 'th')).toBe('한국어')
  })

  it('ignores a language present but empty', () => {
    expect(pick({ ko: '한국어', en: '   ' }, 'en')).toBe('한국어')
  })

  it('returns null when nothing is written', () => {
    expect(pick(null, 'ko')).toBeNull()
    expect(pick({}, 'ko')).toBeNull()
  })
})

describe('readRow', () => {
  it('carries our description through', () => {
    const r = readRow(row(), 'ko')
    expect(r.description).toBe('가장 널리 쓰이는 보습 성분입니다.')
    expect(r.facts).toEqual([])
    expect(r.childRestricted).toBe(false)
  })

  it('reads the Ministry’s restriction into facts', () => {
    const r = readRow(
      row({
        inputName: '살리실릭애씨드',
        korName: '살리실릭애씨드',
        role: '각질관리',
        restrictions: [{
          country: '한국', category: '한도', limitText: SALICYLIC_LIMIT,
          provision: null, noticeName: null,
        }],
      }),
      'ko',
    )
    expect(r.childRestricted).toBe(true)
    expect(r.facts.some((f) => f.kind === 'limit' && f.percent === 0.5)).toBe(true)
    expect(r.headline).toContain('어린이용으로 표시된 제품에는 쓸 수 없습니다')
  })

  it('reads every ruling, not just the first', () => {
    // One ingredient carries several rulings in one market. Dropping any of them
    // would drop whichever child clause happened to be in the one dropped.
    const r = readRow(
      row({
        restrictions: [
          { country: '한국', category: '한도', limitText: '* 배합한도 : 0.5%', provision: null, noticeName: null },
          { country: '한국', category: '한도', limitText: SALICYLIC_LIMIT, provision: null, noticeName: null },
        ],
      }),
      'ko',
    )
    expect(r.childRestricted).toBe(true)
    expect(r.facts.filter((f) => f.kind === 'limit').length).toBeGreaterThanOrEqual(2)
  })

  it('leaves an ambiguous row without an ingredient', () => {
    // The database already withholds the name; this checks nothing here puts it
    // back. A child warning beside a guess is worse than no answer.
    const r = readRow(
      row({
        inputName: '폴리솔베이트2O',
        status: 'ambiguous',
        korName: null, engName: null, role: null, blurb: null, origin: null,
        score: 0.636,
        candidates: [
          { korName: '폴리솔베이트20', engName: 'Polysorbate 20', role: null, score: 0.636 },
          { korName: '폴리솔베이트21', engName: 'Polysorbate 21', role: null, score: 0.636 },
        ],
      }),
      'ko',
    )
    expect(r.korName).toBeNull()
    expect(r.description).toBeNull()
    expect(r.childRestricted).toBe(false)
    expect(r.candidates).toHaveLength(2)
  })
})

describe('summarise', () => {
  const rows: ScanRow[] = [
    row({ inputName: '정제수', korName: '정제수', role: '용제' }),
    row(),
    row({ inputName: '나이아신아마이트', korName: '나이아신아마이드', status: 'likely', role: '미백 고시성분', score: 0.636 }),
    row({
      inputName: '살리실릭애씨드', korName: '살리실릭애씨드', role: '각질관리',
      restrictions: [{ country: '한국', category: '한도', limitText: SALICYLIC_LIMIT, provision: null, noticeName: null }],
    }),
    row({
      inputName: '페녹시에탄올', korName: '페녹시에탄올', role: '보존',
      restrictions: [{ country: '한국', category: '한도', limitText: '* 배합한도 : 1%', provision: null, noticeName: null }],
    }),
    row({ inputName: '폴리솔베이트2O', status: 'ambiguous', korName: null, role: null, blurb: null, score: 0.636 }),
    row({ inputName: '엘제이바이오', status: 'unknown', korName: null, role: null, blurb: null, score: null }),
  ]

  it('counts a likely match as identified and an ambiguous one as not', () => {
    const s = summarise(rows, 'ko')
    // An ambiguous reading is not a partial success: the label could not be read
    // well enough to name the ingredient.
    expect(s.identified).toBe(5)
    expect(s.ambiguous).toBe(1)
    expect(s.unknown).toBe(1)
    expect(s.identified + s.ambiguous + s.unknown).toBe(rows.length)
  })

  it('collects the child restrictions in label order', () => {
    const s = summarise(rows, 'ko')
    expect(s.childRestricted.map((i) => i.korName)).toEqual(['살리실릭애씨드'])
  })

  it('counts every restricted ingredient, not only the child ones', () => {
    const s = summarise(rows, 'ko')
    expect(s.restricted.map((i) => i.korName)).toEqual(['살리실릭애씨드', '페녹시에탄올'])
  })

  it('counts how many carry our own description', () => {
    const s = summarise(rows, 'ko')
    expect(s.described).toBe(5)
  })

  it('keeps the label’s order', () => {
    // 화장품법 lists ingredients above 1% by descending quantity, so the order is
    // information. Reordering throws it away.
    const s = summarise(rows, 'ko')
    expect(s.items.map((i) => i.inputName)).toEqual(rows.map((r) => r.inputName))
  })
})

describe('childSummary', () => {
  it('names the restricted ingredients and counts them', () => {
    const s = summarise(
      [row({
        inputName: '살리실릭애씨드', korName: '살리실릭애씨드',
        restrictions: [{ country: '한국', category: '한도', limitText: SALICYLIC_LIMIT, provision: null, noticeName: null }],
      })],
      'ko',
    )
    expect(childSummary(s)).toBe(
      '식약처가 영유아·어린이용 제품에 사용을 제한한 성분이 1개 있습니다: 살리실릭애씨드',
    )
  })

  it('returns null rather than saying a product is safe', () => {
    // The caller renders this as "제한 성분이 없습니다". The register holding no
    // restriction is not the Ministry approving the product for a child, and
    // saying so would be a medical claim made on our behalf.
    const s = summarise([row()], 'ko')
    expect(childSummary(s)).toBeNull()
  })
})

describe('byRole', () => {
  it('groups by purpose, largest group first', () => {
    const s = summarise(
      [
        row({ inputName: '글리세린', role: '보습' }),
        row({ inputName: '판테놀', korName: '판테놀', role: '보습' }),
        row({ inputName: '페녹시에탄올', korName: '페녹시에탄올', role: '보존' }),
      ],
      'ko',
    )
    const groups = byRole(s)
    expect(groups[0].role).toBe('보습')
    expect(groups[0].items).toHaveLength(2)
    expect(groups[1].role).toBe('보존')
  })

  it('leaves unidentified names out of the groups', () => {
    // Filing them under '기타' would put them beside ingredients we recognised.
    const s = summarise(
      [row(), row({ inputName: '???', status: 'unknown', korName: null, role: null, blurb: null })],
      'ko',
    )
    expect(byRole(s).flatMap((g) => g.items)).toHaveLength(1)
  })
})
