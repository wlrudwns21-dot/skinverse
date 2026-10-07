import { useState } from 'react'
import { s } from '../../lib/css'
import type { Lang, Localized } from '../../data/types'
import type { ProductCopy } from '../../catalog/remote'
import { useAdmin } from '../AdminContext'

const stepperStyle =
  'cursor:pointer;width:24px;height:24px;border:1px solid var(--line-2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:500'
const field =
  'width:100%;box-sizing:border-box;border:1px solid var(--line-2);border-radius:4px;padding:8px 10px;font-size:13px;margin-top:4px;outline:none;font-family:inherit'
const label = 'font-size:11px;color:var(--ink-3);font-weight:500'

const LANGS: [Lang, string][] = [['ko', '한국어'], ['en', 'English'], ['zh', '中文'], ['th', 'ไทย']]
const STEPS: [string, string][] = [
  ['cleanser', '클렌저'], ['toner', '토너 · 미스트'], ['serum', '세럼'],
  ['cream', '크림'], ['spf', '자외선차단'], ['mask', '마스크'],
]

type Row = ReturnType<typeof useAdmin>['prodList'][number]

const blank = (): Localized => ({ ko: '', en: '', zh: '', th: '' })
const fill = (l: Partial<Localized> | undefined): Localized => ({ ...blank(), ...l })

/**
 * Everything about a product that is words rather than money.
 *
 * Price, stock and the sale switch are deliberately not in here. They live on
 * the row above, where they are one click from view, because an editor you
 * scroll through is the wrong place to change what a customer is charged.
 */
function CopyEditor({ p, onDone }: { p: Row; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [c, setC] = useState<ProductCopy>({
    name: p.name,
    nameL: { ...p.nameL },
    sub: fill(p.sub),
    why: fill(p.why),
    line: p.line,
    slot: p.slot,
    step: p.step,
  })

  const set = <K extends keyof ProductCopy>(k: K, v: ProductCopy[K]) => setC((prev) => ({ ...prev, [k]: v }))
  const setL = (k: 'sub' | 'why', lang: Lang, v: string) =>
    setC((prev) => ({ ...prev, [k]: { ...prev[k], [lang]: v } }))

  const save = async () => {
    if (busy) return
    setBusy(true)
    await p.saveCopy(c)
    setBusy(false)
    onDone()
  }

  return (
    <div style={s('border-top:1px solid var(--line);margin-top:12px;padding-top:12px')}>
      <div style={s('display:flex;gap:10px;flex-wrap:wrap')}>
        <label style={s('flex:2;min-width:200px')}>
          <div style={s(label)}>영문 상품명 — 주문서에 기록되는 이름</div>
          <input value={c.name} onChange={(e) => set('name', e.target.value)} style={s(field)} />
        </label>
        <label style={s('flex:1;min-width:140px')}>
          <div style={s(label)}>라인</div>
          <input value={c.line} onChange={(e) => set('line', e.target.value)} style={s(field)} />
        </label>
      </div>

      <div style={s('display:flex;gap:10px;flex-wrap:wrap;margin-top:8px')}>
        {(['ko', 'zh'] as const).map((lang) => (
          <label key={lang} style={s('flex:1;min-width:180px')}>
            <div style={s(label)}>상품명 · {lang === 'ko' ? '한국어' : '中文'}</div>
            <input
              value={c.nameL[lang] ?? ''}
              onChange={(e) => set('nameL', { ...c.nameL, [lang]: e.target.value })}
              style={s(field)}
            />
          </label>
        ))}
      </div>
      {/* English and Thai are absent on purpose: the maker's own Thai pages
          print the English name, so both fall through to the field above. */}
      <div style={s('font-size:11px;color:var(--ink-4);margin-top:5px;line-height:1.6')}>
        English · ไทย 는 비워두면 위의 영문 상품명이 그대로 쓰입니다.
      </div>

      {(['sub', 'why'] as const).map((k) => (
        <div key={k} style={s('margin-top:12px')}>
          <div style={s(label)}>{k === 'sub' ? '한 줄 설명' : '추천 이유'}</div>
          {LANGS.map(([lang, name]) => (
            <div key={lang} style={s('display:flex;gap:8px;align-items:flex-start;margin-top:5px')}>
              <div style={s('flex-shrink:0;width:56px;font-size:11px;color:var(--ink-4);padding-top:9px')}>{name}</div>
              <textarea
                value={c[k][lang]}
                onChange={(e) => setL(k, lang, e.target.value)}
                rows={k === 'sub' ? 1 : 2}
                style={s(field + ';margin-top:0;resize:vertical;line-height:1.6')}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={s('display:flex;gap:10px;flex-wrap:wrap;margin-top:12px')}>
        <label style={s('flex:1;min-width:120px')}>
          <div style={s(label)}>사용 시간</div>
          <select value={c.slot} onChange={(e) => set('slot', e.target.value as ProductCopy['slot'])} style={s(field)}>
            <option value="both">아침 · 저녁</option>
            <option value="am">아침</option>
            <option value="pm">저녁</option>
          </select>
        </label>
        <label style={s('flex:1;min-width:120px')}>
          <div style={s(label)}>루틴 단계</div>
          <select value={c.step} onChange={(e) => set('step', e.target.value)} style={s(field)}>
            <option value="">—</option>
            {STEPS.map(([k, ko]) => <option key={k} value={k}>{ko}</option>)}
          </select>
        </label>
      </div>

      <div style={s('display:flex;gap:8px;margin-top:12px')}>
        <div
          onClick={onDone}
          style={s('flex:1;cursor:pointer;border:1px solid var(--line-2);border-radius:3px;padding:10px;text-align:center;font-size:12.5px;font-weight:500;color:var(--ink-3)')}
        >
          닫기
        </div>
        <div
          onClick={() => void save()}
          style={s(
            'flex:2;border-radius:3px;padding:10px;text-align:center;font-size:12.5px;font-weight:500;' +
              (busy ? 'background:var(--surface-2);color:var(--ink-4)' : 'cursor:pointer;background:var(--accent);color:var(--on-accent)'),
          )}
        >
          {busy ? '저장 중…' : '저장'}
        </div>
      </div>

      <VerifyRow p={p} />
    </div>
  )
}

/**
 * The switch that decides whether this product may say anything about its own
 * ingredients.
 *
 * Kept visually apart from 저장, and asking before it goes on, because it is
 * not a preference: it is a claim that somebody compared this list with the
 * maker's own label. The database enforces what it means — while it is off the
 * product may hold no ingredient list and no analysis at all — so the
 * confirmation is the only part the screen owns. It no longer stops the
 * product being sold; a listing with a name and a price claims nothing.
 */
function VerifyRow({ p }: { p: Row }) {
  const on = p.checked
  const [ing, setIng] = useState(p.ing)
  const [inci, setInci] = useState(p.inci)
  const [busy, setBusy] = useState(false)

  const act = async () => {
    if (busy) return
    if (on) {
      if (!confirm(`${p.name}\n\n확인을 해제하면 전성분 · INCI · 성분 분석이 모두 지워집니다.\n판매는 계속됩니다. 계속할까요?`)) return
      setBusy(true)
      await p.setChecked(false, '', '')
      setIng('')
      setInci('')
    } else {
      if (!ing.trim()) return alert('전성분을 먼저 입력해주세요.')
      if (!confirm(`${p.name}\n\n입력한 전성분을 제조사 표기와 직접 대조하셨나요?\n확인하면 고객 화면에 성분 분석이 표시됩니다.`)) return
      setBusy(true)
      await p.setChecked(true, ing, inci)
    }
    setBusy(false)
  }

  return (
    <div
      style={s(
        'margin-top:12px;border-radius:4px;padding:12px 13px;' +
          (on ? 'background:var(--surface-2)' : 'background:var(--warn-soft)'),
      )}
    >
      <div style={s('font-size:11.5px;line-height:1.7;' + (on ? 'color:var(--ink-2)' : 'color:var(--warn)'))}>
        {on
          ? '전성분이 제조사 표기와 대조된 상태입니다. 고객 화면에 성분 분석이 표시됩니다.'
          : '전성분이 비어 있어 고객 화면에 성분 분석이 표시되지 않습니다. 판매는 가능합니다.'}
      </div>

      {/* The list and the claim that it was checked are saved together,
          because the database will not hold one without the other. Typing it
          here and ticking the box afterwards would simply be refused — so the
          box is what saves the text. */}
      <label style={s('display:block;margin-top:10px')}>
        <div style={s(label)}>전성분 (한글) — 제조사 표기 그대로</div>
        <textarea
          value={ing}
          onChange={(e) => setIng(e.target.value)}
          rows={4}
          style={s(field + ';resize:vertical;line-height:1.6;background:var(--surface)')}
        />
      </label>
      <label style={s('display:block;margin-top:8px')}>
        <div style={s(label)}>전성분 (영문 INCI)</div>
        <textarea
          value={inci}
          onChange={(e) => setInci(e.target.value)}
          rows={4}
          style={s(field + ';resize:vertical;line-height:1.6;background:var(--surface)')}
        />
      </label>

      <div
        onClick={() => void act()}
        style={s(
          'border-radius:3px;padding:10px;margin-top:10px;text-align:center;font-size:12.5px;font-weight:500;' +
            (busy
              ? 'background:var(--surface-2);color:var(--ink-4)'
              : on
                ? 'cursor:pointer;border:1px solid var(--line-2);color:var(--ink-3)'
                : 'cursor:pointer;background:var(--ink);color:var(--on-dark)'),
        )}
      >
        {busy ? '저장 중…' : on ? '확인 해제 — 전성분과 분석을 지웁니다' : '전성분 확인하고 저장'}
      </div>
    </div>
  )
}

export function Products() {
  const admin = useAdmin()
  const [openId, setOpenId] = useState<string | null>(null)

  const waiting = admin.prodList.filter((p) => p.gaps.some((g) => g.key === 'ingredients')).length

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px')}>
        <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:24px')}>상품 관리</div>
        <div style={s('font-size:12px;color:var(--ink-3)')}>
          재고 5개 이하 <b style={s('color:var(--warn)')}>{admin.lowStockN}건</b>
          {waiting > 0 && <> · 전성분 대기 <b style={s('color:var(--warn)')}>{waiting}건</b></>}
        </div>
      </div>

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {admin.prodList.map((p) => (
          <div key={p.id} style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:12px 14px')}>
            <div style={s('display:flex;gap:14px;align-items:center;flex-wrap:wrap')}>
              {/* The real photograph when there is one: a row of identical
                  gradients tells the operator nothing about which product is
                  which, and "has a photo yet" is one of the things this screen
                  is for. */}
              {p.img ? (
                <img src={p.img} alt="" style={s('width:52px;height:65px;object-fit:cover;border-radius:4px;flex-shrink:0;display:block')} />
              ) : (
                <div style={s(`width:52px;height:65px;border-radius:4px;background:${p.grad};flex-shrink:0`)} />
              )}

              <div style={s('flex:1;min-width:160px')}>
                <div style={s('font-size:10px;color:var(--ink-3);letter-spacing:0.1em')}>{p.brand}{p.line && ' · ' + p.line}</div>
                <div style={s('font-size:13.5px;font-weight:500')}>{p.nameL?.ko || p.name}</div>
                {/* Won first: that is the price the operator set, and the
                    dollar figure is derived from it at the current rate. */}
                <div style={s('font-size:11.5px;color:var(--ink-4)')}>
                  {p.kind}{p.ml && ' · ' + p.ml} · ₩{p.priceKrw.toLocaleString('en-US')} (${p.price})
                </div>
              </div>

              <div style={s('text-align:center')}>
                <div style={s('font-size:11px;color:var(--ink-3);font-weight:500')}>재고</div>
                <div style={s('display:flex;align-items:center;gap:8px;margin-top:4px')}>
                  <div onClick={p.dec} style={s(stepperStyle)}>−</div>
                  <b style={s(`min-width:30px;text-align:center;font-size:14px;color:${p.stockColor}`)}>{p.stock}</b>
                  <div onClick={p.inc} style={s(stepperStyle)}>+</div>
                </div>
              </div>

              <div style={s('text-align:center;min-width:70px')}>
                <div style={s('font-size:11px;color:var(--ink-3);font-weight:500')}>이달 판매</div>
                <b style={s('font-size:14px')}>{p.sold}</b>
              </div>

              <div
                onClick={p.toggle}
                style={s(
                  `border-radius:3px;padding:7px 14px;font-size:12px;font-weight:500;${p.activeStyle}` +
                    (p.active || p.sellable ? ';cursor:pointer' : ';cursor:not-allowed;opacity:.55'),
                )}
              >
                {p.activeLabel}
              </div>

              <div
                onClick={() => setOpenId(openId === p.id ? null : p.id)}
                style={s('cursor:pointer;border:1px solid var(--line-2);border-radius:3px;padding:7px 12px;font-size:12px;font-weight:500;color:var(--ink-3)')}
              >
                {openId === p.id ? '닫기' : '내용'}
              </div>
            </div>

            {/* What is still missing, worded as the thing to go and do. The
                blocking one is marked because it is the only one the database
                itself will refuse. */}
            {p.gaps.length > 0 && (
              <div style={s('display:flex;gap:6px;flex-wrap:wrap;margin-top:9px')}>
                {p.gaps.map((g) => (
                  <span
                    key={g.key}
                    style={s(
                      'font-size:10.5px;border-radius:2px;padding:3px 7px;letter-spacing:0.01em;' +
                        (g.blocking
                          ? 'background:var(--warn-soft);color:var(--warn);font-weight:500'
                          : 'background:var(--surface-2);color:var(--ink-3)'),
                    )}
                  >
                    {g.label}
                  </span>
                ))}
              </div>
            )}

            {openId === p.id && <CopyEditor p={p} onDone={() => setOpenId(null)} />}
          </div>
        ))}
      </div>
    </div>
  )
}
