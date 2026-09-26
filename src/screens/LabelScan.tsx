import { useState } from 'react'
import { s } from '../lib/css'
import { parseLabel } from '../ingredients/label'
import { matchIngredients, readLabelPhoto } from '../ingredients/remote'
import {
  byRole,
  childSummary,
  summarise,
  type ScanSummary,
  type ScannedIngredient,
} from '../ingredients/scan'
import { useStore } from '../store/StoreContext'

/**
 * 성분 분석 — read a product's ingredient list and say what is in it.
 *
 * Two ways in. A photo goes to OCR; typing or pasting the 전성분 works whether or
 * not OCR is configured, and is how most people will use it anyway once they
 * realise the list is printed on the box in text they can copy from a website.
 *
 * ── What this screen refuses to display ─────────────────────────────────────
 *
 * No score, no grade, no 순함 rating, no traffic light. An ingredient list gives
 * the order of ingredients and not their amounts, while every limit 식약처 sets
 * is a concentration — so "0.5% 한도" is knowable from a label and "this product
 * is within it" is not. A number here would be a guess that customers would
 * compare products by.
 *
 * What it shows instead: which ingredients are in there, what each is for, and
 * where the Ministry has restricted one, its own words for the restriction. When
 * nothing is restricted it says nothing was restricted — never that the product
 * is safe.
 */

const ROLE_TINT: Record<string, string> = {
  보습: '#E8F1EC',
  에몰리언트: '#F3EEE4',
  장벽: '#EDEFF6',
  진정: '#EAF2EE',
  항산화: '#F6EFE8',
  '미백 고시성분': '#F0ECF6',
  '주름개선 고시성분': '#F6ECEF',
  '자외선차단 고시성분': '#FBF3E3',
  각질관리: '#F6F0E8',
  보존: '#F1EFEA',
  세정: '#EAF0F4',
  '점증·제형': '#F2F2EE',
  pH조절: '#F2F2EE',
  킬레이트: '#F2F2EE',
  용제: '#F2F2EE',
}

const STATUS_LABEL: Record<string, string> = {
  exact: '',
  likely: '표기가 조금 달라 추정했습니다',
  ambiguous: '글자가 흐려 성분을 특정하지 못했습니다',
  unknown: '식약처 등록부에 없는 표기입니다',
}

export function LabelScan() {
  const { state, goHome } = useStore()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scan, setScan] = useState<ScanSummary | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const analyse = async (raw: string) => {
    setError('')
    const { names } = parseLabel(raw)
    if (names.length === 0) {
      setError('성분을 찾지 못했습니다. 전성분을 쉼표로 구분해 입력해주세요.')
      return
    }
    setBusy(true)
    const { rows, error: err } = await matchIngredients(names, '한국')
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setScan(summarise(rows, state.lang))
  }

  const fromPhoto = async (file: File) => {
    setError('')
    setBusy(true)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    }).catch(() => '')

    if (!dataUrl) {
      setBusy(false)
      setError('사진을 읽지 못했습니다.')
      return
    }

    const { text: read, error: err } = await readLabelPhoto(dataUrl)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    // Shown in the box before analysing, so a bad read is visible and fixable
    // rather than silently producing a list of unrecognised names.
    setText(read)
    await analyse(read)
  }

  const childNote = scan ? childSummary(scan) : null

  return (
    <div style={s('padding:18px 16px 30px;animation:rise .35s ease both')}>
      <div style={s('display:flex;align-items:center;gap:10px')}>
        <button
          onClick={goHome}
          style={s('border:none;background:transparent;font-size:19px;cursor:pointer;color:#6B6252;padding:0')}
          aria-label="뒤로"
        >
          ‹
        </button>
        <div style={s('font-family:Marcellus,serif;font-size:22px')}>성분 분석</div>
      </div>
      <div style={s('font-size:12px;color:#8A7D6C;margin-top:6px;line-height:1.7')}>
        화장품 전성분을 식품의약품안전처 등록 정보와 대조합니다. 성분별 역할과, 식약처가 정한
        제한 사항을 원문 그대로 보여줍니다.
      </div>

      {/* ── input ──────────────────────────────────────────────────────── */}
      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:16px')}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'전성분을 붙여넣거나 입력하세요\n예: 정제수, 글리세린, 나이아신아마이드, 판테놀'}
          rows={5}
          style={s('width:100%;box-sizing:border-box;border:1px solid #E2DACB;border-radius:10px;padding:11px 12px;font-size:13px;font-family:inherit;line-height:1.7;resize:vertical;background:#FCFAF6')}
        />
        <div style={s('display:flex;gap:8px;margin-top:10px;flex-wrap:wrap')}>
          <button
            onClick={() => void analyse(text)}
            disabled={busy || !text.trim()}
            style={s('flex:1;min-width:130px;border:none;background:#2E2A24;color:#F5F0E6;border-radius:10px;padding:12px;font-size:13.5px;font-weight:700;cursor:' + (busy || !text.trim() ? 'default' : 'pointer') + ';opacity:' + (busy || !text.trim() ? '.5' : '1'))}
          >
            {busy ? '대조 중…' : '분석하기'}
          </button>
          {/* A label is a photograph away, so the camera path stays offered even
              while OCR is unconfigured — the error it returns says which, and
              points at the box above. */}
          <label
            style={s('border:1px solid #D3C9B7;background:#FFFFFF;color:#4A4234;border-radius:10px;padding:12px 16px;font-size:13px;font-weight:700;cursor:pointer;text-align:center')}
          >
            사진으로
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void fromPhoto(f)
                e.target.value = ''
              }}
              style={s('display:none')}
            />
          </label>
        </div>
        {error && (
          <div style={s('font-size:12px;color:#A64B32;margin-top:10px;line-height:1.6')}>{error}</div>
        )}
      </div>

      {scan && (
        <>
          {/* ── what was read ────────────────────────────────────────────── */}
          <div style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px')}>
            {([
              ['확인된 성분', scan.identified],
              ['특정 못 함', scan.ambiguous],
              ['등록부에 없음', scan.unknown],
            ] as [string, number][]).map(([label, n]) => (
              <div key={label} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:11px 12px;text-align:center')}>
                <div style={s('font-family:Marcellus,serif;font-size:20px')}>{n}</div>
                <div style={s('font-size:10.5px;color:#8A7D6C;margin-top:2px')}>{label}</div>
              </div>
            ))}
          </div>

          {/* ── children ─────────────────────────────────────────────────── */}
          <div style={s('background:' + (childNote ? '#FBF3E8' : '#F1F5F2') + ';border-radius:14px;padding:14px 16px;margin-top:12px')}>
            <b style={s('font-size:13px;color:' + (childNote ? '#8A5A28' : '#3C5A4C'))}>
              영유아·어린이 관련
            </b>
            <div style={s('font-size:12.5px;color:' + (childNote ? '#7A5A32' : '#42604F') + ';margin-top:5px;line-height:1.7')}>
              {/* When nothing was restricted the wording says exactly that.
                  "안전합니다" would be a medical claim we are not entitled to
                  make: the register recording no restriction is not the Ministry
                  approving the product for a child. */}
              {childNote ?? '이 목록에서 식약처가 영유아·어린이용 제품에 제한한 성분은 발견되지 않았습니다. 안전하다는 뜻은 아니며, 사용 전 제품 표시사항을 확인하세요.'}
            </div>
          </div>

          {/* ── by purpose ───────────────────────────────────────────────── */}
          {byRole(scan).length > 0 && (
            <div style={s('margin-top:16px')}>
              <div style={s('font-size:12.5px;font-weight:700;color:#4A4234')}>역할별 구성</div>
              <div style={s('display:flex;flex-wrap:wrap;gap:6px;margin-top:8px')}>
                {byRole(scan).map(({ role, items }) => (
                  <div
                    key={role}
                    style={s('background:' + (ROLE_TINT[role] ?? '#F2F2EE') + ';border-radius:20px;padding:6px 12px;font-size:11.5px;color:#4A4234')}
                  >
                    {role} {items.length}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── every ingredient, in the order the label printed them ─────── */}
          <div style={s('margin-top:16px')}>
            <div style={s('font-size:12.5px;font-weight:700;color:#4A4234')}>성분 상세</div>
            <div style={s('font-size:11px;color:#A89B87;margin-top:3px;line-height:1.6')}>
              라벨에 인쇄된 순서입니다. 화장품법상 1% 초과 성분은 많은 것부터 적습니다.
            </div>
            <div style={s('display:flex;flex-direction:column;gap:8px;margin-top:10px')}>
              {scan.items.map((item, i) => (
                <IngredientCard
                  key={i}
                  item={item}
                  expanded={open === String(i)}
                  onToggle={() => setOpen(open === String(i) ? null : String(i))}
                />
              ))}
            </div>
          </div>

          <div style={s('font-size:10.5px;color:#A89B87;margin-top:18px;line-height:1.7')}>
            제한 사항은 식품의약품안전처 「화장품 사용제한 원료정보」의 국내 기준 원문입니다.
            성분 설명은 일반적인 배합 목적을 안내하는 것으로, 특정 제품의 효과를 보장하지 않습니다.
          </div>
        </>
      )}
    </div>
  )
}

function IngredientCard({
  item,
  expanded,
  onToggle,
}: {
  item: ScannedIngredient
  expanded: boolean
  onToggle: () => void
}) {
  const named = item.status === 'exact' || item.status === 'likely'
  const note = STATUS_LABEL[item.status]

  return (
    <div style={s('background:#FFFFFF;border:1px solid ' + (item.childRestricted ? '#E8CFA8' : '#ECE6DA') + ';border-radius:13px;overflow:hidden')}>
      <button
        onClick={onToggle}
        style={s('width:100%;border:none;background:transparent;text-align:left;padding:12px 14px;cursor:pointer;font-family:inherit;display:flex;gap:10px;align-items:flex-start')}
      >
        <div style={s('flex:1;min-width:0')}>
          <div style={s('display:flex;align-items:center;gap:6px;flex-wrap:wrap')}>
            <b style={s('font-size:13.5px;color:' + (named ? '#2E2A24' : '#8A7D6C'))}>
              {item.korName ?? item.inputName}
            </b>
            {item.role && (
              <span style={s('background:' + (ROLE_TINT[item.role] ?? '#F2F2EE') + ';border-radius:12px;padding:2px 8px;font-size:10px;color:#4A4234')}>
                {item.role}
              </span>
            )}
            {item.childRestricted && (
              <span style={s('background:#F6E2C8;border-radius:12px;padding:2px 8px;font-size:10px;color:#8A5A28;font-weight:700')}>
                어린이 제한
              </span>
            )}
          </div>
          {/* The label's own spelling, when we corrected it. Hiding the
              correction would leave the customer unable to tell whether we read
              their bottle right. */}
          {named && item.korName !== item.inputName && (
            <div style={s('font-size:10.5px;color:#A89B87;margin-top:2px')}>
              라벨 표기 “{item.inputName}”
            </div>
          )}
          {note && (
            <div style={s('font-size:10.5px;color:#A64B32;margin-top:2px')}>{note}</div>
          )}
          {item.description && !expanded && (
            <div style={s('font-size:11.5px;color:#6B6252;margin-top:4px;line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical')}>
              {item.description}
            </div>
          )}
        </div>
        <span style={s('color:#B0A490;font-size:12px;flex-shrink:0;margin-top:2px')}>
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div style={s('padding:0 14px 14px;border-top:1px solid #F4F0E8')}>
          {item.description ? (
            <div style={s('font-size:12.5px;color:#4A4234;line-height:1.8;margin-top:10px')}>
              {item.description}
            </div>
          ) : (
            named && (
              <div style={s('font-size:12px;color:#A89B87;line-height:1.7;margin-top:10px')}>
                아직 설명이 작성되지 않은 성분입니다.
                {item.engName && <> 영문명 {item.engName}.</>}
              </div>
            )
          )}

          {/* Candidates for an ambiguous reading. Offered as a list because the
              scan genuinely cannot tell which — 폴리솔베이트20 and 21 score
              identically against a blurred 2O. */}
          {item.candidates.length > 0 && (
            <div style={s('background:#F8F5EF;border-radius:10px;padding:10px 12px;margin-top:10px')}>
              <div style={s('font-size:11.5px;color:#6B6252;line-height:1.6')}>
                다음 중 하나로 보입니다. 라벨을 다시 확인해주세요.
              </div>
              <div style={s('display:flex;flex-wrap:wrap;gap:6px;margin-top:7px')}>
                {item.candidates.map((c) => (
                  <span key={c.korName} style={s('background:#FFFFFF;border:1px solid #E2DACB;border-radius:14px;padding:4px 10px;font-size:11px;color:#4A4234')}>
                    {c.korName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.facts.length > 0 && (
            <div style={s('background:#FBF3E8;border-radius:10px;padding:11px 13px;margin-top:10px')}>
              <b style={s('font-size:11.5px;color:#8A5A28')}>식약처 제한 사항 (국내)</b>
              <div style={s('display:flex;flex-direction:column;gap:6px;margin-top:6px')}>
                {item.facts.map((f, j) => (
                  <div key={j} style={s('font-size:11.5px;color:#7A5A32;line-height:1.7')}>
                    {/* Our plain rewriting, with the Ministry's own sentence
                        underneath. The original is never more than one glance
                        away, because the rewriting is a convenience and the
                        original is the fact. */}
                    {f.text}
                    <div style={s('font-size:10px;color:#A88A62;margin-top:2px;white-space:pre-wrap')}>
                      원문 · {f.source}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.origin && (
            <div style={s('font-size:10.5px;color:#A89B87;margin-top:10px;line-height:1.7')}>
              식약처 기원·정의 · {item.origin}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
