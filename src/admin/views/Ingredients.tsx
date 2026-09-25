import { useCallback, useEffect, useState } from 'react'
import { s } from '../../lib/css'
import {
  findIngredient,
  ingredientStats,
  syncIngredients,
  type IngredientStats,
} from '../adminRemote'

/**
 * The ingredient dictionary, and the button that fills it.
 *
 * What this screen is for is the unglamorous half of the ingredient feature:
 * before a label can be read, there has to be a list of real ingredient names
 * to read it against, and that list comes from 식약처 rather than from us.
 *
 * The two numbers that matter most are the English-name and CAS coverage. The
 * register leaves both blank for a large share of its entries, and an operator
 * who does not know that will assume a search by English name simply works.
 * They are shown as percentages for that reason, not as decoration.
 */
export function Ingredients() {
  const [stats, setStats] = useState<IngredientStats | null>(null)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [resume, setResume] = useState<number | null>(null)

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Awaited<ReturnType<typeof findIngredient>>>([])
  const [searched, setSearched] = useState(false)

  const refresh = useCallback(async () => {
    setStats(await ingredientStats())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const say = (line: string) => setLog((prev) => [line, ...prev].slice(0, 8))

  const run = async (opts: { pages?: number; from?: number }) => {
    setBusy(true)
    const label = opts.pages === 1 ? '1페이지 시험' : opts.from ? `${opts.from}페이지부터 이어받기` : '전체 동기화'
    const r = await syncIngredients(opts)
    setBusy(false)

    if (r.ok) {
      setResume(null)
      say(`${label} 완료 — ${r.pages}페이지 / ${r.fetched.toLocaleString()}건 읽음, 저장 ${r.stored.toLocaleString()}건`)
    } else {
      // A failed run has usually written something. Say how far it got and
      // offer the page to carry on from, rather than making the operator guess.
      setResume(r.pages > 0 ? r.resumeFrom : null)
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

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>성분 사전</div>
      <div style={s('font-size:12px;color:#8A7D6C;margin-top:4px;line-height:1.6')}>
        식품의약품안전처 화장품 원료성분정보(공공데이터포털 15111774)의 사본입니다.
        전성분 표기를 표준 성분명과 대조할 때 쓰입니다.
        <b style={s('color:#B4622F')}> 효능 정보는 포함되어 있지 않습니다</b> — 성분명·영문명·CAS번호·기원뿐입니다.
      </div>

      {/* ── coverage ───────────────────────────────────────────────────── */}
      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px')}>
        {([
          ['저장된 성분', stored.toLocaleString() + '건', ''],
          ['영문명 있음', pct(stats?.withEnglish ?? 0), (stats?.withEnglish ?? 0).toLocaleString() + '건'],
          ['CAS번호 있음', pct(stats?.withCas ?? 0), (stats?.withCas ?? 0).toLocaleString() + '건'],
          ['설명 작성됨', pct(stats?.withBlurb ?? 0), (stats?.withBlurb ?? 0).toLocaleString() + '건'],
        ] as [string, string, string][]).map(([label, value, sub]) => (
          <div key={label} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px')}>
            <div style={s('font-size:11.5px;color:#8A7D6C')}>{label}</div>
            <div style={s('font-family:Marcellus,serif;font-size:22px;margin-top:4px')}>{value}</div>
            {sub && <div style={s('font-size:11px;color:#A89B87;margin-top:2px')}>{sub}</div>}
          </div>
        ))}
      </div>

      {stats?.syncedAt && (
        <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:8px')}>
          마지막 동기화 {new Date(stats.syncedAt).toLocaleString('ko-KR')}
        </div>
      )}

      {/* ── sync ───────────────────────────────────────────────────────── */}
      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px;margin-top:16px')}>
        <b style={s('font-size:14px')}>식약처에서 가져오기</b>
        <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:4px;line-height:1.6')}>
          일일 호출 한도는 10,000회입니다. 한 번에 1,000건씩 읽으므로 전체를 가져와도 수십 회면 끝납니다.
          이미 있는 성분은 갱신되고, 직접 작성한 설명은 지워지지 않습니다.
        </div>

        <div style={s('display:flex;gap:8px;flex-wrap:wrap;margin-top:12px')}>
          {/* One page first. Proving the key works should not cost a full run,
              and the first look at real data usually changes something. */}
          <button
            onClick={() => void run({ pages: 1 })}
            disabled={busy}
            style={s('border:1px solid #D3C9B7;background:#FFFFFF;color:#4A4234;border-radius:9px;padding:9px 16px;font-size:12.5px;font-weight:700;cursor:' + (busy ? 'default' : 'pointer') + ';opacity:' + (busy ? '.5' : '1'))}
          >
            1페이지만 시험
          </button>
          <button
            onClick={() => void run({})}
            disabled={busy}
            style={s('border:none;background:#2E2A24;color:#F5F0E6;border-radius:9px;padding:9px 18px;font-size:12.5px;font-weight:700;cursor:' + (busy ? 'default' : 'pointer') + ';opacity:' + (busy ? '.5' : '1'))}
          >
            {busy ? '가져오는 중…' : '전체 동기화'}
          </button>
          {resume !== null && (
            <button
              onClick={() => void run({ from: resume })}
              disabled={busy}
              style={s('border:1px solid #D9B48F;background:#FBF3E8;color:#8A5A28;border-radius:9px;padding:9px 16px;font-size:12.5px;font-weight:700;cursor:' + (busy ? 'default' : 'pointer') + ';opacity:' + (busy ? '.5' : '1'))}
            >
              {resume}페이지부터 이어받기
            </button>
          )}
        </div>

        {log.length > 0 && (
          <div style={s('margin-top:12px;border-top:1px solid #F0EAE0;padding-top:10px;display:flex;flex-direction:column;gap:5px')}>
            {log.map((line, i) => (
              <div key={i} style={s('font-size:11.5px;color:' + (i === 0 ? '#4A4234' : '#A89B87') + ';line-height:1.5')}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

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
          <button
            onClick={() => void search()}
            style={s('border:1px solid #D3C9B7;background:#F8F5EF;color:#4A4234;border-radius:9px;padding:9px 18px;font-size:12.5px;font-weight:700;cursor:pointer')}
          >
            찾기
          </button>
        </div>

        {searched && hits.length === 0 && (
          <div style={s('font-size:12px;color:#A64B32;margin-top:10px')}>
            사전에 없는 성분명입니다. 표기가 다르거나, 아직 동기화되지 않았을 수 있습니다.
          </div>
        )}

        {hits.map((h, i) => (
          <div key={i} style={s('border-top:1px solid #F0EAE0;padding-top:10px;margin-top:10px')}>
            <b style={s('font-size:13.5px')}>{h.korName}</b>
            {/* Blanks are said out loud rather than left as gaps: an empty row
                is the register's own answer, not a loading state. */}
            <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:3px;line-height:1.7')}>
              영문명 {h.engName ?? '(없음)'}<br />
              CAS {h.casNo ?? '(없음)'}<br />
              기원 {h.origin ?? '(없음)'}
              {h.synonym && <><br />이명 {h.synonym}</>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
