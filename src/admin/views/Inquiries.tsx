import { useEffect, useState } from 'react'
import type { Lang } from '../../data/types'
import { s } from '../../lib/css'
import * as support from '../../support/remote'

const STATUS_STYLE: Record<support.ThreadStatus, [string, string]> = {
  bot: ['자동 응답', 'background:#F1EAF3;color:#6B4B78'],
  open: ['답변 대기', 'background:#FBF3E4;color:#9A8455'],
  answered: ['답변 완료', 'background:#EAF1EC;color:#2E6B58'],
  closed: ['종료', 'background:#F1EEE6;color:#8A7D6C'],
}

const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']
const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English', zh: '中文', th: 'ไทย' }

/** Keywords and the four translations of one canned answer. */
function FaqEditor({ faq, onSaved }: { faq: support.Faq; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [keywords, setKeywords] = useState(faq.keywords.join(', '))
  const [lang, setLang] = useState<Lang>('ko')
  const [answer, setAnswer] = useState<Record<string, string>>({ ...faq.answer })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await support.saveFaq(faq.id, {
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      answer: answer as support.Faq['answer'],
    })
    setSaving(false)
    onSaved()
  }

  const toggle = async () => {
    await support.saveFaq(faq.id, { active: !faq.active })
    onSaved()
  }

  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px')}>
      <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap')}>
        <div onClick={() => setOpen(!open)} style={s('cursor:pointer;flex:1;min-width:200px')}>
          <div style={s('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
            <span style={s('background:#EAF1EC;color:#2E6B58;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700')}>{faq.category}</span>
            <b style={s('font-size:13.5px;' + (faq.active ? '' : 'color:#B0A490'))}>{faq.title.ko}</b>
          </div>
          <div style={s('font-size:11.5px;color:#A2957F;margin-top:6px')}>
            키워드 {faq.keywords.length}개 · {open ? '접기' : '펼쳐서 수정'}
          </div>
        </div>
        <div onClick={toggle} style={s('cursor:pointer;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;white-space:nowrap;' + (faq.active ? 'background:#EAF1EC;color:#2E6B58' : 'background:#EFE9DD;color:#8A7D6C'))}>
          {faq.active ? '사용중' : '사용안함'}
        </div>
      </div>

      {open && (
        <div style={s('margin-top:14px;border-top:1px solid #F1ECE2;padding-top:14px')}>
          <div style={s('font-size:11px;font-weight:700;color:#6E6252;margin-bottom:5px')}>
            매칭 키워드 (쉼표로 구분 · 하나라도 포함되면 이 답변이 나갑니다)
          </div>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:10px;padding:10px 12px;font-size:13px;background:#FFFFFF;outline:none')}
          />

          <div style={s('display:flex;gap:6px;margin:12px 0 6px;flex-wrap:wrap')}>
            {LANGS.map((l) => (
              <div
                key={l}
                onClick={() => setLang(l)}
                style={s('cursor:pointer;border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:700;' + (lang === l ? 'background:#221C15;color:#F5F0E6' : 'background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234'))}
              >
                {LANG_LABEL[l]}
              </div>
            ))}
          </div>

          <textarea
            value={answer[lang] ?? ''}
            onChange={(e) => setAnswer({ ...answer, [lang]: e.target.value })}
            rows={5}
            style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.55;background:#FFFFFF;outline:none;resize:vertical;font-family:inherit')}
          />

          <div
            onClick={saving ? undefined : save}
            style={s('cursor:' + (saving ? 'default' : 'pointer') + ';margin-top:10px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:10px;text-align:center;font-size:13px;font-weight:700;opacity:' + (saving ? '.6' : '1'))}
          >
            {saving ? '저장 중…' : '저장'}
          </div>
        </div>
      )}
    </div>
  )
}

export function Inquiries() {
  const [tab, setTab] = useState<'threads' | 'faq'>('threads')
  const [threads, setThreads] = useState<support.AdminThread[]>([])
  const [faqs, setFaqs] = useState<support.Faq[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [messages, setMessages] = useState<support.SupportMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<support.ThreadStatus | 'all'>('all')

  const reload = () => {
    void support.loadAllThreads().then(setThreads)
    void support.loadFaqs().then(setFaqs)
  }
  useEffect(reload, [])

  useEffect(() => {
    if (!openId) {
      setMessages([])
      return
    }
    void support.loadMessages(openId).then(setMessages)
  }, [openId])

  const reply = async () => {
    const text = draft.trim()
    if (!text || !openId || busy) return
    setBusy(true)
    setDraft('')
    const ok = await support.replyAsAdmin(openId, text)
    if (ok) {
      setMessages(await support.loadMessages(openId))
      reload()
    }
    setBusy(false)
  }

  const shown = filter === 'all' ? threads : threads.filter((t) => t.status === filter)
  const openThread = threads.find((t) => t.id === openId)
  const waiting = threads.filter((t) => t.status === 'open').length

  // ── one conversation ──────────────────────────────────────────────────────
  if (openThread) {
    return (
      <div style={s('animation:riseAdmin .3s ease both')}>
        <div onClick={() => setOpenId(null)} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:12px')}>← 목록으로</div>

        <div style={s('font-family:Marcellus,serif;font-size:22px;line-height:1.3')}>{openThread.subject}</div>
        <div style={s('font-size:12px;color:#8A7D6C;margin-top:6px')}>
          {openThread.memberName} {openThread.memberCountry} · {new Date(openThread.created_at).toLocaleString('ko-KR')}
        </div>

        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px;margin-top:14px;display:flex;flex-direction:column;gap:12px;max-width:720px')}>
          {messages.map((m) => (
            <div key={m.id} style={s('display:flex;flex-direction:column;gap:3px;align-items:' + (m.sender === 'admin' ? 'flex-end' : 'flex-start'))}>
              <div style={s('font-size:10.5px;color:#A2957F')}>
                {m.sender === 'member' ? '고객' : m.sender === 'bot' ? '자동 응답' : '상담원'} · {new Date(m.created_at).toLocaleString('ko-KR')}
              </div>
              <div style={s('max-width:80%;border-radius:14px;padding:11px 13px;font-size:13px;line-height:1.55;white-space:pre-wrap;' + (m.sender === 'admin' ? 'background:#221C15;color:#F5F0E6' : m.sender === 'bot' ? 'background:#EAF1EC;color:#2C4A3E' : 'background:#F8F5EF;border:1px solid #ECE6DA'))}>
                {m.body}
              </div>
            </div>
          ))}
        </div>

        <div style={s('display:flex;gap:8px;margin-top:14px;max-width:720px')}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="답변을 입력하세요"
            style={s('flex:1;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:12px;padding:11px 13px;font-size:13px;line-height:1.55;background:#FFFFFF;outline:none;resize:vertical;font-family:inherit')}
          />
          <div
            onClick={() => void reply()}
            style={s('cursor:pointer;background:#221C15;color:#F5F0E6;border-radius:12px;padding:0 22px;display:flex;align-items:center;font-size:13px;font-weight:700;white-space:nowrap;opacity:' + (busy ? '.6' : '1'))}
          >
            답변 전송
          </div>
        </div>
      </div>
    )
  }

  // ── list ──────────────────────────────────────────────────────────────────
  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px')}>
        <div style={s('font-family:Marcellus,serif;font-size:24px')}>CS 문의</div>
        <div onClick={reload} style={s('cursor:pointer;border:1px solid #D8CFBF;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;background:#FFFFFF')}>
          새로고침
        </div>
      </div>

      <div style={s('display:flex;gap:8px;margin:14px 0;flex-wrap:wrap')}>
        {([['threads', '문의 내역'], ['faq', '자동 응답 설정']] as const).map(([id, label]) => (
          <div
            key={id}
            onClick={() => setTab(id)}
            style={s('cursor:pointer;border-radius:999px;padding:8px 16px;font-size:12.5px;font-weight:700;' + (tab === id ? 'background:#221C15;color:#F5F0E6' : 'background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234'))}
          >
            {label}
          </div>
        ))}
      </div>

      {tab === 'faq' ? (
        <>
          <div style={s('font-size:12.5px;color:#8A7D6C;line-height:1.6;margin-bottom:12px;max-width:820px')}>
            고객 질문에 키워드가 하나라도 포함되면 해당 답변이 <b>즉시</b> 나갑니다. 어느 것에도 걸리지 않은 질문만
            문의 내역에 <b>답변 대기</b>로 쌓입니다 — 키워드를 늘릴수록 상담 부담이 줄어듭니다.
          </div>
          <div style={s('display:flex;flex-direction:column;gap:10px;max-width:820px')}>
            {faqs.map((f) => (
              <FaqEditor key={f.id} faq={f} onSaved={reload} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={s('display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap')}>
            {([['all', '전체'], ['open', '답변 대기'], ['bot', '자동 응답'], ['answered', '답변 완료'], ['closed', '종료']] as const).map(([id, label]) => (
              <div
                key={id}
                onClick={() => setFilter(id)}
                style={s('cursor:pointer;border-radius:999px;padding:7px 13px;font-size:12px;font-weight:600;' + (filter === id ? 'background:#221C15;color:#F5F0E6' : 'background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234'))}
              >
                {label}
                {id === 'open' && waiting > 0 && (
                  <span style={s('margin-left:6px;background:#C25E43;color:#FFF;border-radius:999px;font-size:10px;font-weight:700;padding:1px 6px')}>
                    {waiting}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={s('display:flex;flex-direction:column;gap:10px;max-width:820px')}>
            {shown.map((t) => (
              <div
                key={t.id}
                onClick={() => setOpenId(t.id)}
                style={s('cursor:pointer;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px')}
              >
                <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap')}>
                  <div style={s('flex:1;min-width:220px')}>
                    <b style={s('font-size:13.5px')}>{t.subject}</b>
                    <div style={s('font-size:12px;color:#6E6252;margin-top:6px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                      {t.lastMessage}
                    </div>
                    <div style={s('font-size:11px;color:#A2957F;margin-top:6px')}>
                      {t.memberName} {t.memberCountry} · {new Date(t.updated_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <span style={s('border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;white-space:nowrap;' + STATUS_STYLE[t.status][1])}>
                    {STATUS_STYLE[t.status][0]}
                  </span>
                </div>
              </div>
            ))}

            {shown.length === 0 && (
              <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:22px;text-align:center;font-size:12.5px;color:#8A7D6C;line-height:1.6')}>
                {threads.length === 0
                  ? '아직 접수된 문의가 없습니다. 스토어 마이페이지 > 문의하기에서 들어옵니다.'
                  : '이 상태의 문의가 없습니다.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
