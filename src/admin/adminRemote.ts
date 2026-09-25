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
    .select(
      'order_no, created_at, ship_name, ship_country, total, refunded_total, ' +
        'ship_method, tracking, status, payment_capture_id',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[skinverse] 주문 조회 실패', error.message)
    return []
  }

  // Built from a runtime column list, so the generated row type cannot narrow.
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((o) => ({
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
    refunded: Number(o.refunded_total ?? 0),
    carrier: o.ship_method === 'dhl' ? 'DHL' : 'EMS',
    tracking: (o.tracking as string) || '—',
    status: o.status as OrderStatus,
    // No capture id means nothing was ever taken, so there is nothing to send
    // back — the refund control has to be absent rather than merely failing.
    capturable: typeof o.payment_capture_id === 'string' && o.payment_capture_id.length > 0,
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

// ── audit log ───────────────────────────────────────────────────────────────

export type AuditAction =
  | 'points.change'
  | 'operator.add'
  | 'operator.change'
  | 'operator.remove'
  | 'order.update'

export interface AuditEntry {
  id: number
  at: string
  /** The operator's email, or 'system' when no signed-in caller was involved. */
  actor: string
  action: string
  /** A member id, an order number, or an operator's address. */
  subject: string | null
  detail: Record<string, unknown>
}

/**
 * The trail, newest first.
 *
 * RLS restricts this to masters — the log is how you investigate an operator,
 * so the operator being investigated must not be able to read it. A plain
 * admin calling this gets an empty list rather than an error.
 */
export async function loadAuditLog(limit = 200): Promise<AuditEntry[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('audit_log')
    .select('id, at, actor, action, subject, detail')
    .order('at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[skinverse] 감사 로그를 불러오지 못했습니다', error.message)
    return []
  }

  return (data ?? []).map((r) => ({
    id: r.id as number,
    at: r.at as string,
    actor: (r.actor as string) ?? 'system',
    action: (r.action as string) ?? '',
    subject: (r.subject as string) ?? null,
    detail: (r.detail as Record<string, unknown>) ?? {},
  }))
}

// ── withdrawal queue ────────────────────────────────────────────────────────

export interface DeletionRequestRow {
  userId: string
  email: string
  name: string
  requestedAt: string
  reason: string
}

/**
 * Members waiting to be deleted, oldest first.
 *
 * Oldest first on purpose: 개인정보 보호법 requires these to be acted on
 * without delay, so the one that has waited longest is the one that matters.
 */
export async function loadDeletionRequests(): Promise<DeletionRequestRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('deletion_requests')
    .select('user_id, email, name, requested_at, reason')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) {
    console.error('[skinverse] 탈퇴 요청 조회 실패', error.message)
    return []
  }
  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    email: (r.email as string) || '—',
    name: (r.name as string) || '—',
    requestedAt: r.requested_at as string,
    reason: (r.reason as string) || '',
  }))
}

export interface DeletionOutcome {
  ok: boolean
  ordersRetained?: number
  threadsRetained?: number
  reason?: string
}

/**
 * Carry out a withdrawal. Irreversible.
 *
 * Not "approve": a withdrawal cannot be refused. What the operator is
 * confirming is that they have checked nothing is mid-shipment, not that the
 * member has permission to leave.
 */
export async function completeAccountDeletion(
  userId: string,
  note: string,
): Promise<DeletionOutcome> {
  if (!supabase) return { ok: false, reason: 'unavailable' }
  const { data, error } = await supabase.rpc('complete_account_deletion', {
    p_user: userId,
    p_note: note,
  })
  if (error) {
    console.error('[skinverse] 탈퇴 처리 실패', error.message)
    return { ok: false, reason: 'unavailable' }
  }
  const row = (data ?? {}) as Record<string, unknown>
  return {
    ok: row.ok === true,
    ordersRetained: typeof row.ordersRetained === 'number' ? row.ordersRetained : undefined,
    threadsRetained: typeof row.threadsRetained === 'number' ? row.threadsRetained : undefined,
    reason: typeof row.reason === 'string' ? row.reason : undefined,
  }
}

// ── refunds ─────────────────────────────────────────────────────────────────

/** One customer waiting for an answer. */
export interface RefundRequestRow {
  orderNo: string
  reason: string
  requestedAt: string
  total: number
  refundedTotal: number
  orderStatus: OrderStatus
  shipName: string
  shipCountry: string
  paidAt: string | null
  capturable: boolean
}

export async function loadRefundQueue(): Promise<RefundRequestRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_refund_queue')
  if (error) {
    console.error('[skinverse] 환불 요청 조회 실패', error.message)
    return []
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    orderNo: String(r.order_no),
    reason: String(r.reason ?? ''),
    requestedAt: String(r.requested_at ?? ''),
    total: Number(r.total ?? 0),
    refundedTotal: Number(r.refunded_total ?? 0),
    orderStatus: r.order_status as OrderStatus,
    shipName: String(r.ship_name ?? ''),
    shipCountry: String(r.ship_country ?? ''),
    paidAt: r.paid_at ? String(r.paid_at) : null,
    capturable: typeof r.payment_capture_id === 'string' && r.payment_capture_id.length > 0,
  }))
}

export interface RefundOutcome {
  ok: boolean
  /** Set when it failed, in words an operator can act on. */
  message: string
  pointsClawedBack: number
  /** Points the customer had already spent, so could not be taken back. */
  pointsShort: number
}

const REFUND_ERRORS: Record<string, string> = {
  not_an_operator: '권한이 없습니다',
  no_such_order: '주문을 찾을 수 없습니다',
  nothing_captured: '결제된 금액이 없습니다',
  already_fully_refunded: '이미 전액 환불된 주문입니다',
  amount_exceeds_remaining: '남은 환불 가능 금액을 초과했습니다',
  refund_not_accepted: 'PayPal이 환불을 받아들이지 않았습니다',
  paypal_failed: 'PayPal 요청이 실패했습니다',
}

/**
 * Send the money back.
 *
 * Goes through the edge function rather than the database, because only the
 * server holds the PayPal secret — and because the refund has to happen at
 * PayPal *first*. Marking an order refunded in our own tables and then failing
 * to reach PayPal would leave the books saying the customer was paid when they
 * were not.
 *
 * `amount` omitted refunds everything still outstanding.
 */
export async function refundOrder(
  orderNo: string,
  amount: number | null,
  note: string,
): Promise<RefundOutcome> {
  if (!supabase) return { ok: false, message: '서버에 연결할 수 없습니다', pointsClawedBack: 0, pointsShort: 0 }

  const { data, error } = await supabase.functions.invoke('paypal', {
    body: { action: 'refund', orderNo, amount: amount ?? undefined, note },
  })

  if (error) {
    console.error('[skinverse] 환불 실패', error.message)
    return { ok: false, message: '환불에 실패했습니다. 로그를 확인해주세요.', pointsClawedBack: 0, pointsShort: 0 }
  }

  const row = (data ?? {}) as Record<string, unknown>
  if (row.ok !== true) {
    const code = String(row.error ?? '')
    return {
      ok: false,
      message: REFUND_ERRORS[code] ?? '환불에 실패했습니다',
      pointsClawedBack: 0,
      pointsShort: 0,
    }
  }

  return {
    ok: true,
    message: '',
    pointsClawedBack: Number(row.pointsClawedBack ?? 0),
    pointsShort: Number(row.pointsShort ?? 0),
  }
}

export async function declineRefund(orderNo: string, note: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('decline_refund_request', {
    p_order_no: orderNo,
    p_note: note,
  })
  if (error) {
    console.error('[skinverse] 환불 거절 실패', error.message)
    return false
  }
  return (data as Record<string, unknown> | null)?.ok === true
}

/* ── 성분 사전 ───────────────────────────────────────────────────────────── */

/** Which register to pull. The two answer different questions. */
export type IngredientDataset = 'ingredients' | 'restricted'

export interface IngredientSync {
  ok: boolean
  /** Korean, ready to show. Empty when `ok`. */
  message: string
  /** Pages actually fetched this run. */
  pages: number
  /** Records the API returned, including any we could not use. */
  received: number
  /** Records that became rows. */
  fetched: number
  /** What the register says it holds in total, when it said. */
  total: number
  /** Rows in our table afterwards. */
  stored: number
  /**
   * The address that actually answered.
   *
   * Shown because the portal's request path is a service and an operation named
   * separately, so the function tries a short list of candidates. Seeing the
   * winner once ends the guessing.
   */
  endpoint: string
  /**
   * The field names the API really used.
   *
   * The restricted-ingredient dataset's schema could not be checked before
   * building against it, so its column mapping is a list of plausible names.
   * This is how the guess gets corrected — and why every record is also kept
   * whole, so correcting it costs no quota.
   */
  fields: string[]
  /**
   * True when the key in the secret was the percent-encoded one.
   *
   * Harmless — the function decodes it — but worth saying, because the two keys
   * look alike and only one of them works when pasted anywhere else.
   */
  keyWasEncoded: boolean
  /**
   * Where to start the next call after a failure.
   *
   * A sync that dies on page 40 has already written 39 pages' worth, and the
   * operator should be able to carry on rather than start over — the daily
   * quota is 10,000 calls and re-reading from page one wastes them.
   */
  resumeFrom: number
}

/**
 * The function speaks ASCII codes; Korean is written here.
 *
 * Deliberate, and not only for layering: the function's source travels as a
 * transcribed payload and Korean in it has been corrupted in transit before,
 * in the error strings specifically. Keeping the wording on this side puts it
 * in a file that is edited normally.
 */
const SYNC_ERRORS: Record<string, string> = {
  not_configured: 'DATA_GO_KR_KEY가 설정되지 않았습니다 (Supabase → Edge Functions → Secrets)',
  not_an_operator: '운영자만 실행할 수 있습니다',
  operators_only: '로그인이 필요합니다',
  unavailable: '서버에 연결할 수 없습니다',
  unknown_dataset: '알 수 없는 데이터셋입니다',
  method_not_allowed: '잘못된 요청입니다',
}

/** The prefixes the function puts on a thrown message, in Korean. */
const SYNC_FAULTS: [RegExp, string][] = [
  [/^KEY_OR_QUOTA /, '인증키 또는 일일 한도 문제입니다. 포털 응답: '],
  [/^NO_ADDRESS_ANSWERED /, '어느 주소에서도 응답이 없습니다. 데이터셋 페이지의 정확한 요청주소가 필요합니다. 시도한 주소: '],
  [/^STORE_FAILED /, '내려받기는 됐지만 저장에 실패했습니다: '],
]

function faultText(raw: string): string {
  for (const [pattern, korean] of SYNC_FAULTS) {
    if (pattern.test(raw)) return korean + raw.replace(pattern, '')
  }
  return raw
}

function toSync(row: Record<string, unknown>, fallback: string): IngredientSync {
  const code = String(row.error ?? '')
  const raw = String(row.message ?? '')
  return {
    ok: row.ok === true,
    message: row.ok === true
      ? ''
      : (SYNC_ERRORS[code] ?? (raw ? faultText(raw) : '') ?? fallback) || fallback,
    pages: Number(row.pages ?? 0),
    received: Number(row.received ?? 0),
    fetched: Number(row.fetched ?? 0),
    total: Number(row.total ?? 0),
    stored: Number(row.stored ?? 0),
    endpoint: String(row.endpoint ?? ''),
    fields: Array.isArray(row.fields) ? (row.fields as unknown[]).map(String) : [],
    keyWasEncoded: row.keyWasEncoded === true,
    resumeFrom: Number(row.resumeFrom ?? 1),
  }
}

/**
 * Pull a 식약처 register into our own table.
 *
 * `pages` limits how many pages to read, so a first run can be one page —
 * enough to prove the key works without spending the day's quota. `from` picks
 * the page to start at, which is what makes a failed run resumable.
 *
 * Runs in an edge function because the API key must not reach a browser, and
 * because a whole register is tens of thousands of rows: the browser would be
 * making that many inserts over a home connection.
 */
export async function syncIngredients(
  opts: { dataset?: IngredientDataset; pages?: number; from?: number } = {},
): Promise<IngredientSync> {
  const empty = {
    pages: 0, received: 0, fetched: 0, total: 0, stored: 0,
    endpoint: '', fields: [] as string[], keyWasEncoded: false, resumeFrom: 1,
  }
  if (!supabase) return { ok: false, message: '서버에 연결할 수 없습니다', ...empty }

  const { data, error } = await supabase.functions.invoke('mfds-ingredients', {
    body: { dataset: opts.dataset ?? 'ingredients', pages: opts.pages, from: opts.from },
  })

  if (error) {
    /*
     * A non-2xx makes supabase-js throw before it parses the body, but the body
     * is the interesting part here: it carries how far the sync got and where
     * to resume. Dig it out of the Response the error carries.
     */
    const res = (error as { context?: Response }).context
    if (res && typeof res.json === 'function') {
      try {
        const row = (await res.json()) as Record<string, unknown>
        return toSync(row, '동기화에 실패했습니다')
      } catch {
        // Not JSON. Fall through to the generic message.
      }
    }
    console.error('[skinverse] 성분 동기화 실패', error.message)
    return { ok: false, message: '동기화에 실패했습니다. 로그를 확인해주세요.', ...empty }
  }

  return toSync((data ?? {}) as Record<string, unknown>, '동기화에 실패했습니다')
}

export interface IngredientStats {
  stored: number
  /** How many carry an English name — the register often leaves it blank. */
  withEnglish: number
  /** How many carry a CAS number. */
  withCas: number
  /** How many we have written our own customer-facing copy for. */
  withBlurb: number
  /** Rows in the restricted-ingredient register. */
  restricted: number
  /** When the newest ingredient row was written, ISO, or null on an empty table. */
  syncedAt: string | null
}

/**
 * How complete the dictionary is.
 *
 * The counts for English name and CAS number are not trivia: the register
 * leaves both blank for a great many entries, and knowing the real coverage is
 * what decides whether the matcher may lean on them at all.
 */
export async function ingredientStats(): Promise<IngredientStats> {
  const blank: IngredientStats = {
    stored: 0, withEnglish: 0, withCas: 0, withBlurb: 0, restricted: 0, syncedAt: null,
  }
  if (!supabase) return blank

  const head = { count: 'exact' as const, head: true }
  const [all, eng, cas, blurb, restricted, newest] = await Promise.all([
    supabase.from('ingredients').select('id', head),
    supabase.from('ingredients').select('id', head).not('eng_name', 'is', null),
    supabase.from('ingredients').select('id', head).not('cas_no', 'is', null),
    supabase.from('ingredients').select('id', head).not('blurb', 'is', null),
    supabase.from('restricted_ingredients').select('id', head),
    supabase.from('ingredients').select('synced_at')
      .order('synced_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  return {
    stored: all.count ?? 0,
    withEnglish: eng.count ?? 0,
    withCas: cas.count ?? 0,
    withBlurb: blurb.count ?? 0,
    restricted: restricted.count ?? 0,
    syncedAt: (newest.data as { synced_at?: string } | null)?.synced_at ?? null,
  }
}

export interface IngredientHit {
  korName: string
  engName: string | null
  casNo: string | null
  origin: string | null
  synonym: string | null
  /**
   * What the Ministry has restricted about this name, in its own words.
   *
   * A list, not a verdict. There is no "safe" or "mild" here on purpose: a
   * limit is per concentration and per product type, a label states neither,
   * and a judgement assembled from this would be a medical claim wearing a
   * citation.
   */
  restrictions: { category: string | null; limitText: string | null; otherText: string | null }[]
}

/** Look an ingredient up by whatever it was called, for the console's search box. */
export async function findIngredient(name: string): Promise<IngredientHit[]> {
  if (!supabase || !name.trim()) return []
  const term = name.trim()

  const [found, limits] = await Promise.all([
    supabase.rpc('find_ingredient', { p_name: term }),
    supabase.rpc('ingredient_restrictions', { p_name: term }),
  ])

  if (found.error) {
    console.error('[skinverse] 성분 조회 실패', found.error.message)
    return []
  }

  // Restrictions are keyed by the same normalised name, so every hit for this
  // search shares them. Attached to each rather than returned separately: a
  // caller that has to remember to ask a second time is a caller that will
  // eventually show a restricted ingredient as if it were unrestricted.
  const restrictions = ((limits.data ?? []) as Record<string, unknown>[]).map((r) => ({
    category: (r.category as string | null) ?? null,
    limitText: (r.limit_text as string | null) ?? null,
    otherText: (r.other_text as string | null) ?? null,
  }))

  return ((found.data ?? []) as Record<string, unknown>[]).map((r) => ({
    korName: String(r.kor_name ?? ''),
    engName: (r.eng_name as string | null) ?? null,
    casNo: (r.cas_no as string | null) ?? null,
    origin: (r.origin as string | null) ?? null,
    synonym: (r.synonym as string | null) ?? null,
    restrictions,
  }))
}
