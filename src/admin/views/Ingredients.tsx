import { useCallback, useEffect, useState } from 'react'
import { s } from '../../lib/css'
import {
  findIngredient,
  ingredientStats,
  syncIngredients,
  type IngredientDataset,
  type IngredientHit,
  type IngredientStats,
} from '../adminRemote'

/**
 * The ingredient dictionary, and the buttons that fill it.
 *
 * Two registers, because they answer different questions. 원료성분정보 says
 * whether a name on a label is a real ingredient and what else it is called.
 * 사용제한 원료정보 says whether the Ministry has put a limit on it, or
 * forbidden it.
 *
 * What the screen will not do is turn the second one into a verdict. A limit is
 * per concentration and per product type; a label lists neither. So the console
 * shows the Ministry's own words and no score, and the note on screen says so —
 * to the operator, before anyone is tempted to ask for a "순함 점수".
 *
 * The two numbers worth watching are English-name and CAS coverage. The register
 * leaves both blank for a large share of its entries, and an operator who does
 * not know that will assume a search by English name simply works.
 */

interface Panel {
  id: IngredientDataset
  title: string
  note: string
}

const PANELS: Panel[] = [
  {
    id: 'ingredients',
    title: '원료성분정보',
    note: '표준 성분명·영문명·CAS번호·기원. 전성분 표기를 대조할 정답지입니다.',
  },
  {
    id: 'restricted',
    title: '사용제한 원료정보',
    note: '사용금지 원료와 배합한도. 사실 조회용이며, 순함·안전성 판정에는 쓰지 않습니다.',
  },
]

export function Ingredients() {
  const [stats, setStats] = useState<IngredientStats | null>(null)
  /** Which panel is mid-sync, or null. One at a time — they share the quota. */
  const [busy, setBusy] = useState<IngredientDataset | null>(null)
  const [log, setLog] = useState<string[]>([])
  /** Per dataset: the address that answered, and the fields it really sent. */
  const [seen, setSeen] = useState<Record<string, { endpoint: string; fields: string[] }>>({})
  /** Per dataset: the page to carry on from after a failure. */
  const [resume, setResume] = useState<Record<string, number>>({})

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<IngredientHit[]>([])
  const [searched, setSearched] = useState(false)

  const refresh = useCallback(async () => {
    setStats(await ingredientStats())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const say = (line: string) => setLog((prev) => [line, ...prev].slice(0, 10))

  const run = async (panel: Panel, opts: { pages?: number; from?: number }) => {
    setBusy(panel.id)
    const what = opts.pages === 1 ? '1페이지 시험' : opts.from ? `${opts.from}페이지부터 이어받기` : '전체 동기화'
    const label = `${panel.title} ${what}`

    const r = await syncIngredients({ dataset: panel.id, ...opts })
    setBusy(null)

    if (r.endpoint || r.fields.length > 0) {
      setSeen((prev) => ({
        ...prev,
        [panel.id]: {
          endpoint: r.endpoint || prev[panel.id]?.endpoint || '',
          fields: r.fields.length > 0 ? r.fields : (prev[panel.id]?.fields ?? []),
        },
      }))
    }
    if (r.keyWasEncoded) say('인증키가 Encoding 형태였습니다 — 자동으로 디코딩해서 보냈습니다.')

    if (r.ok) {
      setResume((prev) => {
        const next = { ...prev }
        delete next[panel.id]
        return next
      })
      // `received` and `fetched` differ when a record arrived without a usable
      // name. Only shown when they do — an equal pair is noise.
      const skipped = r.received - r.fetched
      say(
        `${label} 완료 — ${r.pages}페이지, ${r.received.toLocaleString()}건 수신` +
          (skipped > 0 ? ` (${skipped.toLocaleString()}건은 이름이 없어 건너뜀)` : '') +
          `, 저장 ${r.stored.toLocaleString()}건`,
      )
    } else {
      // A failed run has usually written something. Say how far it got and
      // offer the page to carry on from, rather than making the operator guess.
      if (r.pages > 0) setResume((prev) => ({ ...prev, [panel.id]: r.resumeFrom }))
      say(`${label} 실패 — ${r.message}${r.pages > 0 ? ` (${r.pages}페이지까지 진행)` : ''}`)
    }
    await refresh()
  }

  const search = async () => {
    setHits(await findIngredient(query))
    setSearched(true)
  }

  const pct = (n: number) =>
    !stats || stats.stored === 0 ? '—' : Math.round((n / stats.stored) * 100) + '%'

  const stored = stats?.stored ?? 0
  const anyBusy = busy !== null
  const btn = (kind: 'ghost' | 'solid' | 'warn', disabled: boolean) => {
    const base = 'border-radius:9px;padding:9px 16px;font-size:12.5px;font-weight:700;' +
      'cursor:' + (disabled ? 'default' : 'pointer') + ';opacity:' + (disabled ? '.5' : '1') + ';'
    if (kind === 'solid') return s(base + 'border:none;background:#2E2A24;color:#F5F0E6')
    if (kind === 'warn') return s(base + 'border:1px solid #D9B48F;background:#FBF3E8;color:#8A5A28')
    return s(base + 'border:1px solid #D3C9B7;background:#FFFFFF;color:#4A4234')
  }

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>성분 사전</div>
      <div style={s('font-size:12px;color:#8A7D6C;margin-top:4px;line-height:1.6')}>
        식품의약품안전처 공개 데이터의 사본입니다 (공공데이터포털 15111774 · 15111772, 이용허락범위 제한 없음).
      </div>

      {/* ── coverage ───────────────────────────────────────────────────── */}
      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:16px')}>
        {([
          ['원료성분', stored.toLocaleString() + '건', ''],
          ['사용제한 원료', (stats?.restricted ?? 0).toLocaleString() + '건', ''],
          ['영문명 있음', pct(stats?.withEnglish ?? 0), (stats?.withEnglish ?? 0).toLocaleString() + '건'],
          ['CAS번호 있음', pct(stats?.withCas ?? 0), (stats?.withCas ?? 0).toLocaleString() + '건'],
          ['설명 작성됨', pct(stats?.withBlurb ?? 0), (stats?.withBlurb ?? 0).toLocaleString() + '건'],
        ] as [string, string, string][]).map(([label, value, sub]) => (
          <div key={label} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px')}>
            <div style={s('font-size:11.5px;color:#8A7D6C')}>{label}</div>
            <div style={s('font-family:Marcellus,serif;font-size:21px;margin-top:4px')}>{value}</div>
            {sub && <div style={s('font-size:11px;color:#A89B87;margin-top:2px')}>{sub}</div>}
          </div>
        ))}
      </div>

      {stats?.syncedAt && (
        <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:8px')}>
          마지막 동기화 {new Date(stats.syncedAt).toLocaleString('ko-KR')}
        </div>
      )}

      {/* ── sync, one panel per register ───────────────────────────────── */}
      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:16px')}>
        {PANELS.map((panel) => {
          const info = seen[panel.id]
          const from = resume[panel.id]
          const mine = busy === panel.id
          return (
            <div key={panel.id} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px')}>
              <b style={s('font-size:14px')}>{panel.title}</b>
              <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:4px;line-height:1.6')}>
                {panel.note}
              </div>

              <div style={s('display:flex;gap:8px;flex-wrap:wrap;margin-top:12px')}>
                {/* One page first. Proving the key works should not cost a full
                    run, and the first look at real data usually changes
                    something — for 사용제한 it settles the field names. */}
                <button onClick={() => void run(panel, { pages: 1 })} disabled={anyBusy} style={btn('ghost', anyBusy)}>
                  1페이지만 시험
                </button>
                <button onClick={() => void run(panel, {})} disabled={anyBusy} style={btn('solid', anyBusy)}>
                  {mine ? '가져오는 중…' : '전체 동기화'}
                </button>
                {from !== undefined && (
                  <button onClick={() => void run(panel, { from })} disabled={anyBusy} style={btn('warn', anyBusy)}>
                    {from}페이지부터 이어받기
                  </button>
                )}
              </div>

              {info?.endpoint && (
                <div style={s('margin-top:10px;background:#F1F5F2;border-radius:8px;padding:8px 11px;font-size:11px;color:#3C5A4C;word-break:break-all;line-height:1.5')}>
                  응답한 주소 {info.endpoint}
                </div>
              )}
              {/* The field names the API really used. On screen because the
                  restricted register's schema was a guess until now, and this is
                  the evidence for correcting it. */}
              {info?.fields && info.fields.length > 0 && (
                <div style={s('margin-top:6px;background:#F8F5EF;border-radius:8px;padding:8px 11px;font-size:11px;color:#6B6252;word-break:break-all;line-height:1.5')}>
                  응답 필드 {info.fields.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {log.length > 0 && (
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px;margin-top:12px;display:flex;flex-direction:column;gap:6px')}>
          {log.map((line, i) => (
            <div key={i} style={s('font-size:11.5px;color:' + (i === 0 ? '#4A4234' : '#A89B87') + ';line-height:1.6;white-space:pre-wrap;word-break:break-all')}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* ── lookup ─────────────────────────────────────────────────────── */}
      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px;margin-top:12px')}>
        <b style={s('font-size:14px')}>성분 찾기</b>
        <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:4px;line-height:1.6')}>
          띄어쓰기·하이픈·괄호는 무시하고 대조합니다. <span style={s('color:#A89B87')}>예: 1,2-헥산다이올 = 1,2 헥산다이올</span>
        </div>

        <div style={s('display:flex;gap:8px;margin-top:10px;flex-wrap:wrap')}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void search() }}
            placeholder="성분명 (예: 나이아신아마이드)"
            style={s('flex:1;min-width:180px;border:1px solid #D3C9B7;border-radius:9px;padding:9px 12px;font-size:13px;font-family:inherit')}
          />
          <button onClick={() => void search()} style={btn('ghost', false)}>찾기</button>
        </div>

        {searched && hits.length === 0 && (
          <div style={s('font-size:12px;color:#A64B32;margin-top:10px')}>
            사전에 없는 성분명입니다. 표기가 다르거나, 아직 동기화되지 않았을 수 있습니다.
          </div>
        )}

        {hits.map((h, i) => (
          <div key={i} style={s('border-top:1px solid #F0EAE0;padding-top:10px;margin-top:10px')}>
            <b style={s('font-size:13.5px')}>{h.korName}</b>
            {/* Blanks are said out loud rather than left as gaps: an empty field
                is the register's own answer, not a loading state. */}
            <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:3px;line-height:1.7')}>
              영문명 {h.engName ?? '(없음)'}<br />
              CAS {h.casNo ?? '(없음)'}<br />
              기원 {h.origin ?? '(없음)'}
              {h.synonym && <><br />이명 {h.synonym}</>}
            </div>

            {h.restrictions.length > 0 && (
              <div style={s('background:#FBF3E8;border-radius:10px;padding:10px 12px;margin-top:8px')}>
                <b style={s('font-size:11.5px;color:#8A5A28')}>식약처 사용제한</b>
                {h.restrictions.map((r, j) => (
                  <div key={j} style={s('font-size:11.5px;color:#7A5A32;margin-top:5px;line-height:1.6')}>
                    {r.category ?? '(구분 없음)'}
                    {r.limitText && <><br />한도 {r.limitText}</>}
                    {r.otherText && <><br />{r.otherText}</>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
