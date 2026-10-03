import { useState } from 'react'
import { legalDocs, type LegalDoc } from '../data/legal'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/**
 * 이용약관과 개인정보처리방침.
 *
 * Korean only, and deliberately so: these are legal instruments under Korean
 * law, and a machine translation of one is not the same document. Translating
 * them properly is a job for whoever reviews the Korean text first.
 */
export function Legal() {
  const st = useStore()
  const [which, setWhich] = useState<LegalDoc['id']>(st.state.legalDoc)

  const doc = legalDocs.find((d) => d.id === which) ?? legalDocs[0]

  return (
    <div style={s('padding:24px 20px 40px;animation:rise .4s ease both')}>
      <div onClick={st.leaveLegal} style={s('cursor:pointer;font-size:13px;color:var(--ink-3);margin-bottom:12px')}>
        ← 뒤로
      </div>

      <div style={s('display:flex;gap:6px;background:var(--surface-2);border-radius:3px;padding:4px')}>
        {legalDocs.map((d) => (
          <div
            key={d.id}
            onClick={() => setWhich(d.id)}
            style={s(
              'cursor:pointer;flex:1;text-align:center;border-radius:3px;padding:10px 0;font-size:13px;font-weight:500;' +
                (which === d.id
                  ? 'background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(60,45,25,0.12)'
                  : 'color:var(--ink-3)'),
            )}
          >
            {d.title}
          </div>
        ))}
      </div>

      {/* The one thing a reader must not miss. These are drafts written from
          what the code does; nobody has signed off on them as law yet. */}
      <div style={s('background:var(--surface-2);border:1px solid var(--warn-mid);border-radius:4px;padding:14px 16px;margin-top:16px;font-size:12px;color:var(--warn);line-height:1.6')}>
        <b>검토 중인 초안입니다.</b>
        <br />
        이 문서는 법률 전문가의 검토를 받지 않았으며, 대괄호 <b>[ ]</b>로 표시된 항목은 아직
        채워지지 않았습니다. 정식 게시 전까지는 법적 효력이 없습니다.
      </div>

      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:24px;margin-top:20px')}>{doc.title}</div>
      <div style={s('font-size:11.5px;color:var(--ink-4);margin-top:4px')}>{doc.effective}</div>
      <div style={s('font-size:13px;color:var(--ink-2);margin-top:12px;line-height:1.7')}>{doc.intro}</div>

      {doc.sections.map((section) => (
        <div key={section.heading} style={s('margin-top:24px')}>
          <div style={s('font-size:14px;font-weight:500;color:var(--ink);padding-bottom:8px;border-bottom:1px solid var(--line-2)')}>
            {section.heading}
          </div>

          {section.body.map((p, i) => (
            <p
              key={i}
              style={s(
                'font-size:13px;color:var(--ink-2);line-height:1.75;margin:10px 0 0;' +
                  // A paragraph the reader is told not to skip gets to look like one.
                  (p.startsWith('⚠️')
                    ? 'background:var(--surface-2);border-radius:4px;padding:10px 12px;color:var(--warn);font-weight:500'
                    : ''),
              )}
            >
              {p}
            </p>
          ))}

          {section.table && (
            <div style={s('margin-top:12px;overflow-x:auto;-webkit-overflow-scrolling:touch')}>
              <div style={s('min-width:420px;border:1px solid var(--line-2);border-radius:4px;overflow:hidden')}>
                <div
                  style={s(
                    `display:grid;grid-template-columns:repeat(${section.table.head.length},1fr);background:var(--surface-2);font-size:11px;font-weight:500;color:var(--ink-2)`,
                  )}
                >
                  {section.table.head.map((h) => (
                    <div key={h} style={s('padding:9px 10px')}>{h}</div>
                  ))}
                </div>
                {section.table.rows.map((row, ri) => (
                  <div
                    key={ri}
                    style={s(
                      `display:grid;grid-template-columns:repeat(${section.table!.head.length},1fr);font-size:11.5px;color:var(--ink-2);line-height:1.55;background:${ri % 2 ? 'var(--surface-2)' : 'var(--surface)'};border-top:1px solid var(--line)`,
                    )}
                  >
                    {row.map((cell, ci) => (
                      <div key={ci} style={s('padding:9px 10px;word-break:keep-all')}>{cell}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div onClick={st.leaveLegal} style={s('cursor:pointer;margin-top:28px;background:var(--accent);color:var(--on-dark);border-radius:3px;padding:14px;text-align:center;font-size:14px;font-weight:500')}>
        확인
      </div>
    </div>
  )
}
