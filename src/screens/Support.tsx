import { useEffect, useRef, useState } from 'react'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'
import * as support from '../support/remote'

const bubbleBase = 'max-width:80%;border-radius:14px;padding:11px 13px;font-size:13px;line-height:1.55;white-space:pre-wrap'

function Bubble({ msg, label }: { msg: support.SupportMessage; label: string }) {
  const mine = msg.sender === 'member'
  return (
    <div style={s(`display:flex;flex-direction:column;gap:3px;align-items:${mine ? 'flex-end' : 'flex-start'}`)}>
      <div style={s('font-size:10.5px;color:#A2957F;padding:0 4px')}>{label}</div>
      <div style={s(bubbleBase + ';' + (mine ? 'background:#221C15;color:#F5F0E6' : msg.sender === 'bot' ? 'background:#EAF1EC;color:#2C4A3E' : 'background:#FFFFFF;border:1px solid #ECE6DA;color:#221C15'))}>
        {msg.body}
      </div>
    </div>
  )
}

/**
 * The member's side of support: ask, get an instant answer when the bot knows
 * one, and keep the thread if a person has to take over.
 */
export function Support() {
  const st = useStore()
  const a = st.a

  const [faqs, setFaqs] = useState<support.Faq[]>([])
  const [threads, setThreads] = useState<support.SupportThread[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [messages, setMessages] = useState<support.SupportMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void support.loadFaqs().then(setFaqs)
    void support.loadMyThreads().then(setThreads)
  }, [])

  useEffect(() => {
    if (!openId) {
      setMessages([])
      return
    }
    void support.loadMessages(openId).then(setMessages)
  }, [openId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    setDraft('')

    if (openId) {
      const ok = await support.replyAsMember(openId, text)
      if (ok) {
        setMessages(await support.loadMessages(openId))
        setThreads(await support.loadMyThreads())
      }
    } else {
      const res = await support.askQuestion(text, faqs, st.lang, a.supportNoMatch)
      if (res.thread) {
        setThreads(await support.loadMyThreads())
        setOpenId(res.thread.id)
      }
    }
    setBusy(false)
  }

  const statusChip = (status: support.ThreadStatus) => {
    const color =
      status === 'open' ? 'background:#FBF3E4;color:#9A8455'
      : status === 'answered' ? 'background:#EAF1EC;color:#2E6B58'
      : status === 'bot' ? 'background:#F1EAF3;color:#6B4B78'
      : 'background:#F1EEE6;color:#8A7D6C'
    return (
      <span style={s('font-size:10.5px;font-weight:700;border-radius:6px;padding:3px 8px;' + color)}>
        {a.supportStatus[status]}
      </span>
    )
  }

  // ── one conversation ──────────────────────────────────────────────────────
  if (openId) {
    return (
      <div style={s('padding:20px;animation:rise .4s ease both')}>
        <div onClick={() => setOpenId(null)} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:12px')}>
          {a.back}
        </div>

        <div style={s('display:flex;flex-direction:column;gap:12px')}>
          {messages.map((m) => (
            <Bubble
              key={m.id}
              msg={m}
              label={m.sender === 'member' ? a.supportYou : m.sender === 'bot' ? a.supportBot : a.supportStaff}
            />
          ))}
          <div ref={endRef} />
        </div>

        <div style={s('display:flex;gap:8px;margin-top:16px')}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
            placeholder={a.supportPlaceholder}
            style={s('flex:1;min-width:0;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:999px;padding:12px 16px;font-size:13px;background:#FFFFFF;outline:none')}
          />
          <div
            onClick={() => void send()}
            style={s(`cursor:pointer;background:#221C15;color:#F5F0E6;border-radius:999px;padding:12px 18px;font-size:13px;font-weight:700;white-space:nowrap;opacity:${busy ? '.6' : '1'}`)}
          >
            {a.supportSend}
          </div>
        </div>
      </div>
    )
  }

  // ── entry point ───────────────────────────────────────────────────────────
  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div onClick={st.goMy} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:12px')}>{a.back}</div>

      <div style={s('font-family:Marcellus,serif;font-size:22px')}>{a.supportTitle}</div>
      <div style={s('font-size:12.5px;color:#8A7D6C;margin-top:4px;line-height:1.5')}>{a.supportSub}</div>

      <div style={s('display:flex;gap:8px;margin-top:16px')}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
          placeholder={a.supportPlaceholder}
          style={s('flex:1;min-width:0;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:999px;padding:12px 16px;font-size:13px;background:#FFFFFF;outline:none')}
        />
        <div
          onClick={() => void send()}
          style={s(`cursor:pointer;background:#221C15;color:#F5F0E6;border-radius:999px;padding:12px 18px;font-size:13px;font-weight:700;white-space:nowrap;opacity:${busy ? '.6' : '1'}`)}
        >
          {a.supportSend}
        </div>
      </div>

      {/* Tapping a common question just asks it, so the bot answers in the
          same place a typed question would. */}
      {faqs.length > 0 && (
        <>
          <div style={s('font-family:Marcellus,serif;font-size:16px;margin:22px 2px 8px')}>{a.supportFaqTitle}</div>
          <div style={s('display:flex;flex-direction:column;gap:8px')}>
            {faqs.map((f) => (
              <div
                key={f.id}
                onClick={() => { setDraft(support.localized(f.title, st.lang)); }}
                style={s('cursor:pointer;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:10px')}
              >
                <span>{support.localized(f.title, st.lang)}</span>
                <span style={s('color:#B0A490;flex-shrink:0')}>→</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={s('font-family:Marcellus,serif;font-size:16px;margin:22px 2px 8px')}>{st.t.orders === '주문 내역' ? '문의 내역' : 'My questions'}</div>
      {threads.length > 0 ? (
        <div style={s('display:flex;flex-direction:column;gap:8px')}>
          {threads.map((t) => (
            <div
              key={t.id}
              onClick={() => setOpenId(t.id)}
              style={s('cursor:pointer;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px')}
            >
              <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:10px')}>
                <div style={s('font-size:13px;font-weight:600;line-height:1.4;min-width:0')}>{t.subject}</div>
                <div style={s('flex-shrink:0')}>{statusChip(t.status)}</div>
              </div>
              <div style={s('font-size:11px;color:#A2957F;margin-top:6px')}>
                {new Date(t.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:18px;text-align:center;font-size:12.5px;color:#8A7D6C')}>
          {a.supportEmpty}
        </div>
      )}
    </div>
  )
}
