import { supabase } from '../lib/supabase'
import type { AdminOrder, OrderStatus } from '../data/types'

/**
 * Live reads and writes for the console.
 *
 * Nothing here filters by user: row level security grants admins a view across
 * every member's rows, and denies it to everyone else. A non-admin running these
 * same queries simply gets their own rows back, or none.
 */

export interface AdminMember {
  id: string
  /** The real address, joined from auth.users by an admin-only function. */
  email: string
  /** Null until they have clicked the link in the confirmation mail. */
  emailConfirmedAt: string | null
  lastSignInAt: string | null
  /** 'email', or the social provider if one is ever turned on. */
  provider: string

  /**
   * What they typed on the signup form, as they typed it.
   *
   * Kept apart from the live profile below rather than folded into it: the
   * member can change any of it afterwards, and the difference between what
   * they signed up with and what they have now is often the whole answer to a
   * support question.
   */
  signup: {
    name: string | null
    country: string | null
    city: string | null
    language: string | null
    timezone: string | null
  }

  name: string
  country: string
  city: string
  language: string
  timezone: string
  skinCondition: string
  points: number
  streak: number
  routineReminders: boolean
  created_at: string

  /** Derived: how many scans and orders this member has. */
  scanCount: number
  orderCount: number
  lastScanAt: string | null
  totalSpent: number
}

export interface AdminStats {
  revenueToday: number
  ordersToday: number
  scansToday: number
  signupsToday: number
  revenueYesterday: number
  ordersYesterday: number
  scansYesterday: number
  signupsYesterday: number
  /** 7-day revenue by shipping country, highest first. */
  countrySales: [string, number][]
  funnel: { members: number; scanned: number; carted: number; purchased: number }
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
const startOfYesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
const sevenDaysAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

/** Whether the signed-in account is on the admin list. */
export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('is_admin')
  if (error) {
    console.error('[skinverse] 관리자 확인 실패', error.message)
    return false
  }
  return data === true
}

export async function loadOrders(): Promise<AdminOrder[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('orders')
    .select('order_no, created_at, ship_name, ship_country, total, ship_method, tracking, status')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[skinverse] 주문 조회 실패', error.message)
    return []
  }

  return (data ?? []).map((o) => ({
    no: o.order_no as string,
    date: new Date(o.created_at as string).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    name: (o.ship_name as string) || '—',
    country: o.ship_country as string,
    amt: Number(o.total),
    carrier: o.ship_method === 'dhl' ? 'DHL' : 'EMS',
    tracking: (o.tracking as string) || '—',
    status: o.status as OrderStatus,
  }))
}

export async function updateOrderStatus(
  orderNo: string,
  status: OrderStatus,
  tracking: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('orders').update({ status, tracking }).eq('order_no', orderNo)
  if (error) console.error('[skinverse] 주문 상태 변경 실패', error.message)
  return !error
}

export async function loadMembers(): Promise<AdminMember[]> {
  if (!supabase) return []

  // One call, because the email lives in auth.users and the rest lives in
  // public — `admin_member_directory` is the only place the two are joined,
  // and it refuses anyone who is not an operator.
  const { data, error } = await supabase.rpc('admin_member_directory')
  if (error) {
    console.error('[skinverse] 회원 조회 실패', error.message)
    return []
  }

  type Row = Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)

  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    email: str(r.email) ?? '—',
    emailConfirmedAt: str(r.email_confirmed_at),
    lastSignInAt: str(r.last_sign_in_at),
    provider: str(r.provider) ?? 'email',

    signup: {
      name: str(r.signup_name),
      country: str(r.signup_country),
      city: str(r.signup_city),
      language: str(r.signup_language),
      timezone: str(r.signup_timezone),
    },

    name: str(r.name) ?? '—',
    country: str(r.country) ?? '—',
    city: str(r.city) ?? '—',
    language: str(r.language) ?? '—',
    timezone: str(r.timezone) ?? '—',
    skinCondition: str(r.skin_condition) ?? '—',
    points: Number(r.points ?? 0),
    streak: Number(r.streak ?? 0),
    routineReminders: r.routine_reminders === true,
    created_at: (r.created_at as string) ?? '',

    scanCount: Number(r.scan_count ?? 0),
    orderCount: Number(r.order_count ?? 0),
    lastScanAt: str(r.last_scan_at),
    totalSpent: Number(r.total_spent ?? 0),
  }))
}

/**
 * Adjust a member's balance.
 *
 * The console used to read the balance, add to it and write the sum back,
 * which is the same shape as the bug that let members set their own points —
 * an operator's browser deciding what a balance should be. It sends the
 * adjustment now, and `grant_points` checks the caller is an operator, applies
 * it under a lock, and returns what the balance actually became.
 */
export async function grantPoints(userId: string, amount: number): Promise<number | null> {
  if (!supabase) return null

  const { data, error } = await supabase.rpc('grant_points', {
    p_user: userId,
    p_amount: amount,
  })
  if (error) {
    console.error('[skinverse] 포인트 지급 실패', error.message)
    return null
  }

  const row = (data ?? {}) as Record<string, unknown>
  if (row.ok !== true) {
    console.error('[skinverse] 포인트 지급 거부', row.reason)
    return null
  }
  return typeof row.points === 'number' ? row.points : null
}

export async function loadStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    revenueToday: 0, ordersToday: 0, scansToday: 0, signupsToday: 0,
    revenueYesterday: 0, ordersYesterday: 0, scansYesterday: 0, signupsYesterday: 0,
    countrySales: [],
    funnel: { members: 0, scanned: 0, carted: 0, purchased: 0 },
  }
  if (!supabase) return empty

  const today = startOfToday()
  const yesterday = startOfYesterday()
  const week = sevenDaysAgo()

  const [orders, scans, profiles, carts] = await Promise.all([
    supabase.from('orders').select('total, ship_country, created_at, user_id').gte('created_at', week),
    supabase.from('scans').select('created_at, user_id'),
    supabase.from('profiles').select('created_at, id'),
    supabase.from('cart_items').select('user_id'),
  ])

  const orderRows = orders.data ?? []
  const scanRows = scans.data ?? []
  const profileRows = profiles.data ?? []

  const inDay = (iso: string, from: string, to?: string) => iso >= from && (!to || iso < to)

  // Revenue by shipping country over the trailing week.
  const byCountry = new Map<string, number>()
  for (const o of orderRows) {
    const c = (o.ship_country as string) || '—'
    byCountry.set(c, (byCountry.get(c) ?? 0) + Number(o.total))
  }

  const memberIds = new Set(profileRows.map((p) => p.id as string))
  const scannedIds = new Set(scanRows.map((r) => r.user_id as string))
  const cartedIds = new Set((carts.data ?? []).map((r) => r.user_id as string))
  const purchasedIds = new Set(orderRows.map((r) => r.user_id as string))

  return {
    revenueToday: orderRows.filter((o) => inDay(o.created_at as string, today)).reduce((a, o) => a + Number(o.total), 0),
    ordersToday: orderRows.filter((o) => inDay(o.created_at as string, today)).length,
    scansToday: scanRows.filter((r) => inDay(r.created_at as string, today)).length,
    signupsToday: profileRows.filter((p) => inDay(p.created_at as string, today)).length,

    revenueYesterday: orderRows.filter((o) => inDay(o.created_at as string, yesterday, today)).reduce((a, o) => a + Number(o.total), 0),
    ordersYesterday: orderRows.filter((o) => inDay(o.created_at as string, yesterday, today)).length,
    scansYesterday: scanRows.filter((r) => inDay(r.created_at as string, yesterday, today)).length,
    signupsYesterday: profileRows.filter((p) => inDay(p.created_at as string, yesterday, today)).length,

    countrySales: [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    funnel: {
      members: memberIds.size,
      scanned: scannedIds.size,
      carted: cartedIds.size,
      purchased: purchasedIds.size,
    },
  }
}

// ── operator accounts (master only) ─────────────────────────────────────────

export type AdminRole = 'master' | 'admin'

export type AdminStatus = 'pending' | 'active' | 'rejected'

export interface Operator {
  email: string
  role: AdminRole
  note: string
  status: AdminStatus
  created_at: string
  applied_at: string
  decided_at: string | null
  decided_by: string | null
}

/** The caller's own role, or null if they are not an operator at all. */
export async function myRole(): Promise<AdminRole | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('my_admin_role')
  if (error) {
    console.error('[skinverse] 권한 확인 실패', error.message)
    return null
  }
  return (data as AdminRole | null) ?? null
}

/**
 * The caller's application status: pending, active, rejected, or null if they
 * have never applied. Distinct from the role, which is null until approved.
 */
export async function myAdminStatus(): Promise<AdminStatus | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('my_admin_status')
  if (error) {
    console.error('[skinverse] 신청 상태 확인 실패', error.message)
    return null
  }
  return (data as AdminStatus | null) ?? null
}

/**
 * Apply for an operator account.
 *
 * The row is written by the applicant, so it is the database that decides what
 * they are allowed to write: the insert policy permits their own address, as a
 * plain admin, pending — and nothing else. Applying as an active master is
 * refused by the policy, not by this function.
 */
export async function applyForOperator(note: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: '연결 없음' }
  const { data: auth } = await supabase.auth.getUser()
  const email = auth.user?.email
  if (!email) return { ok: false, error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('admin_users')
    .insert({ email: email.toLowerCase(), role: 'admin', status: 'pending', note })
  if (error) {
    // A duplicate means they have already applied, which is the state we wanted.
    if (error.code === '23505') return { ok: true }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/** RLS returns nothing at all unless the caller is a master. */
export async function listOperators(): Promise<Operator[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('admin_users')
    .select('email, role, note, status, created_at, applied_at, decided_at, decided_by')
    .order('applied_at')
  if (error) {
    console.error('[skinverse] 운영자 목록 조회 실패', error.message)
    return []
  }
  return (data ?? []) as Operator[]
}

/** Approve or turn down an application. Master only, enforced by RLS. */
export async function decideApplication(
  email: string,
  status: Exclude<AdminStatus, 'pending'>,
  decidedBy: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: '연결 없음' }
  const { error } = await supabase
    .from('admin_users')
    .update({ status, decided_at: new Date().toISOString(), decided_by: decidedBy })
    .eq('email', email)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function addOperator(
  email: string,
  role: AdminRole,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: '연결 없음' }
  const { error } = await supabase
    .from('admin_users')
    .insert({ email: email.trim().toLowerCase(), role, note })
  if (!error) return { ok: true }
  return { ok: false, error: error.code === '23505' ? '이미 등록된 이메일입니다' : error.message }
}

export async function setOperatorRole(
  email: string,
  role: AdminRole,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: '연결 없음' }
  const { error } = await supabase.from('admin_users').update({ role }).eq('email', email)
  // The last-master guard raises from Postgres; surface its message as-is.
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function removeOperator(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: '연결 없음' }
  const { error } = await supabase.from('admin_users').delete().eq('email', email)
  return error ? { ok: false, error: error.message } : { ok: true }
}
