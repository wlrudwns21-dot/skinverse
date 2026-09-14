import { supabase } from '../lib/supabase'
import type { Lang, Localized } from '../data/types'

export type ThreadStatus = 'bot' | 'open' | 'answered' | 'closed'
export type Sender = 'member' | 'bot' | 'admin'

export interface Faq {
  id: string
  keywords: string[]
  title: Localized
  answer: Localized
  category: string
  active: boolean
}

export interface SupportMessage {
  id: string
  thread_id: string
  sender: Sender
  body: string
  created_at: string
}

export interface SupportThread {
  id: string
  user_id: string
  subject: string
  category: string
  status: ThreadStatus
  created_at: string
  updated_at: string
}

// ── the bot ─────────────────────────────────────────────────────────────────

/**
 * Pick the FAQ entry that best answers a question.
 *
 * Deliberately simple: count how many of an entry's keywords appear in the
 * question and take the highest. No embeddings, no model call — the whole point
 * is an instant answer, and a shop's questions cluster tightly around shipping,
 * points, refunds and the scan. Anything it misses becomes a human's job, which
 * is the correct outcome rather than a failure.
 */
export function matchFaq(question: string, faqs: Faq[]): Faq | null {
  const haystack = question.toLowerCase()
  let best: Faq | null = null
  let bestScore = 0

  for (const faq of faqs) {
    if (!faq.active) continue
    let score = 0
    for (const keyword of faq.keywords) {
      const k = keyword.trim().toLowerCase()
      if (k && haystack.includes(k)) score++
    }
    if (score > bestScore) {
      bestScore = score
      best = faq
    }
  }
  return bestScore > 0 ? best : null
}

/** Falls back through the languages so a partially translated entry still answers. */
export function localized(value: Localized, lang: Lang): string {
  return value[lang] || value.ko || value.en || Object.values(value)[0] || ''
}

// ── reads ───────────────────────────────────────────────────────────────────

export async function loadFaqs(): Promise<Faq[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('support_faqs')
    .select('id, keywords, title, answer, category, active')
    .order('sort')
  if (error) {
    console.error('[skinverse] FAQ 조회 실패', error.message)
    return []
  }
  return (data ?? []) as Faq[]
}

export async function loadMyThreads(): Promise<SupportThread[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('support_threads')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[skinverse] 문의 조회 실패', error.message)
    return []
  }
  return (data ?? []) as SupportThread[]
}

export async function loadMessages(threadId: string): Promise<SupportMessage[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at')
  if (error) {
    console.error('[skinverse] 대화 조회 실패', error.message)
    return []
  }
  return (data ?? []) as SupportMessage[]
}

// ── writes ──────────────────────────────────────────────────────────────────

export interface AskResult {
  thread: SupportThread | null
  /** The bot's reply, when it had one. */
  botAnswer: string | null
}

/**
 * Open a thread with the member's question, and let the bot answer if it can.
 *
 * The thread is marked `bot` when answered automatically and `open` otherwise,
 * which is exactly what the operator queue filters on — so a question the bot
 * handled never lands on someone's desk.
 */
export async function askQuestion(
  question: string,
  faqs: Faq[],
  lang: Lang,
  fallbackReply: string,
): Promise<AskResult> {
  if (!supabase) return { thread: null, botAnswer: null }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { thread: null, botAnswer: null }

  const match = matchFaq(question, faqs)
  const botAnswer = match ? localized(match.answer, lang) : fallbackReply

  const { data: thread, error } = await supabase
    .from('support_threads')
    .insert({
      user_id: auth.user.id,
      subject: question.slice(0, 120),
      category: match?.category ?? '기타',
      status: match ? 'bot' : 'open',
    })
    .select('*')
    .single()

  if (error || !thread) {
    console.error('[skinverse] 문의 등록 실패', error?.message)
    return { thread: null, botAnswer: null }
  }

  await supabase.from('support_messages').insert([
    { thread_id: thread.id, sender: 'member', body: question },
    { thread_id: thread.id, sender: 'bot', body: botAnswer },
  ])

  return { thread: thread as SupportThread, botAnswer }
}

/** A follow-up on an existing thread always goes to a human. */
export async function replyAsMember(threadId: string, body: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('support_messages')
    .insert({ thread_id: threadId, sender: 'member', body })
  if (error) {
    console.error('[skinverse] 메시지 전송 실패', error.message)
    return false
  }
  await supabase.from('support_threads').update({ status: 'open' }).eq('id', threadId)
  return true
}

// ── operator side ───────────────────────────────────────────────────────────

export interface AdminThread extends SupportThread {
  memberName: string
  memberCountry: string
  lastMessage: string
}

export async function loadAllThreads(): Promise<AdminThread[]> {
  if (!supabase) return []

  const [threads, profiles, messages] = await Promise.all([
    supabase.from('support_threads').select('*').order('updated_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, name, country'),
    supabase.from('support_messages').select('thread_id, body, created_at').order('created_at'),
  ])

  if (threads.error) {
    console.error('[skinverse] 문의 목록 조회 실패', threads.error.message)
    return []
  }

  const byId = new Map((profiles.data ?? []).map((p) => [p.id as string, p]))
  const last = new Map<string, string>()
  for (const m of messages.data ?? []) last.set(m.thread_id as string, m.body as string)

  return ((threads.data ?? []) as SupportThread[]).map((t) => {
    const profile = byId.get(t.user_id)
    return {
      ...t,
      memberName: (profile?.name as string) || '—',
      memberCountry: (profile?.country as string) || '',
      lastMessage: last.get(t.id) ?? '',
    }
  })
}

export async function replyAsAdmin(threadId: string, body: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('support_messages')
    .insert({ thread_id: threadId, sender: 'admin', body })
  if (error) {
    console.error('[skinverse] 답변 전송 실패', error.message)
    return false
  }
  await supabase.from('support_threads').update({ status: 'answered' }).eq('id', threadId)
  return true
}

export async function setThreadStatus(threadId: string, status: ThreadStatus): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('support_threads').update({ status }).eq('id', threadId)
  return !error
}

// ── FAQ management ──────────────────────────────────────────────────────────

export async function saveFaq(
  id: string,
  patch: { keywords?: string[]; answer?: Localized; active?: boolean },
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('support_faqs').update(patch).eq('id', id)
  if (error) console.error('[skinverse] FAQ 저장 실패', error.message)
  return !error
}
