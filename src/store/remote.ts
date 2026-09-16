import { supabase } from '../lib/supabase'
import type { MetricKey, SkinConditionKey, Weather } from '../data/types'
import type { SkinTypeReading } from '../analysis/perfectcorp'
import type { ScanRecord } from './state'
import type { RoutineStepRecord } from './types'
import { localDay } from '../routine/checklist'

/**
 * Every read and write a signed-in member makes against Postgres.
 *
 * Row level security means these queries never need a user id filter for
 * safety — the policies do that. They are written plainly and let errors
 * surface to the caller, which decides whether to toast or ignore.
 */

/**
 * How far back the reports look.
 *
 * Thirty scans is roughly a year for someone scanning fortnightly — enough for
 * a seasonal trend to be visible, and small enough that it costs nothing to
 * fetch on every load.
 */
const SCAN_HISTORY_LIMIT = 30

const SCAN_COLUMNS =
  'skin_condition, overall, created_at, metrics, skin_age, oiliness, ' +
  'skin_type, skin_type_t_zone, skin_type_u_zone, weather'

/** A `scans` row as PostgREST returns it. */
interface ScanRow {
  skin_condition: SkinConditionKey
  overall: number
  created_at: string
  metrics: Record<MetricKey, number> | null
  skin_age: number | null
  oiliness: number | null
  skin_type: string | null
  skin_type_t_zone: string | null
  skin_type_u_zone: string | null
  weather: Weather | null
}

function toScanRecord(row: ScanRow): ScanRecord {
  const skinType: SkinTypeReading | null =
    row.skin_type || row.skin_type_t_zone || row.skin_type_u_zone
      ? { whole: row.skin_type, tZone: row.skin_type_t_zone, uZone: row.skin_type_u_zone }
      : null

  return {
    skinCondition: row.skin_condition,
    overall: row.overall,
    createdAt: row.created_at,
    metrics: row.metrics,
    skinAge: row.skin_age,
    oiliness: row.oiliness,
    skinType,
    weather: row.weather,
  }
}

export interface MemberSnapshot {
  cart: Record<string, number>
  /** Mission ids already claimed today. */
  claimedToday: string[]
  /** Reward ids ever redeemed. */
  redeemed: string[]
  latestScan: ScanRecord | null
  scanHistory: ScanRecord[]
  latestOrder: {
    order_no: string
    total: number
    points_earned: number
    eta: string
    created_at: string
  } | null
  savedRoutineCount: number
}

const EMPTY: MemberSnapshot = {
  cart: {},
  claimedToday: [],
  redeemed: [],
  latestScan: null,
  scanHistory: [],
  latestOrder: null,
  savedRoutineCount: 0,
}

/**
 * The device's own idea of today.
 *
 * Only a fallback now. The server stamps a claim with the day it computes from
 * the member's stored timezone, so reading today's claims by the device clock
 * would show an empty mission list to anyone whose phone disagrees — and the
 * two must not disagree about a row that is already written.
 */
export const localToday = () => localDay(new Date())

/** One round trip per table, in parallel, to fill the store on sign-in. */
export async function loadMemberSnapshot(): Promise<MemberSnapshot> {
  if (!supabase) return EMPTY

  const { data: serverDay } = await supabase.rpc('my_day')
  const today = typeof serverDay === 'string' ? serverDay : localToday()

  const [cart, claims, redemptions, scans, orders, routines] = await Promise.all([
    supabase.from('cart_items').select('product_id, qty'),
    supabase.from('mission_claims').select('mission_id').eq('claimed_on', today),
    supabase.from('redemptions').select('reward_id'),
    supabase
      .from('scans')
      .select(SCAN_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(SCAN_HISTORY_LIMIT),
    supabase
      .from('orders')
      .select('order_no, total, points_earned, eta, created_at')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('routines').select('id', { count: 'exact', head: true }),
  ])

  // A failed query yields `data: null`, which reads downstream as "this member
  // has nothing" — an empty bag, no saved routines, no scans ever taken. That
  // is indistinguishable on screen from a new account, so it must at least be
  // loud in the console rather than passing for a fact about the customer.
  for (const [what, res] of [
    ['cart_items', cart],
    ['mission_claims', claims],
    ['redemptions', redemptions],
    ['scans', scans],
    ['orders', orders],
    ['routines', routines],
  ] as const) {
    if (res.error) console.error(`[skinverse] ${what}를 불러오지 못했습니다`, res.error.message)
  }

  const cartMap: Record<string, number> = {}
  for (const row of cart.data ?? []) cartMap[row.product_id as string] = row.qty as number

  const history = (scans.data ?? []).map((row) => toScanRecord(row as unknown as ScanRow))
  const order = (orders.data ?? [])[0] as MemberSnapshot['latestOrder']

  return {
    cart: cartMap,
    claimedToday: (claims.data ?? []).map((r) => r.mission_id as string),
    redeemed: (redemptions.data ?? []).map((r) => r.reward_id as string),
    latestScan: history[0] ?? null,
    scanHistory: history,
    latestOrder: order ?? null,
    savedRoutineCount: routines.count ?? 0,
  }
}

// ── the analysis allowance ──────────────────────────────────────────────────

export interface AnalysisQuota {
  used: number
  limit: number
  /** The instant the allowance comes back — the member's own next midnight. */
  resetsAt: string
}

/**
 * How many analyses the member has left today.
 *
 * Read through `my_analysis_quota()`, which builds its subject from `auth.uid()`
 * rather than taking one as an argument, so it can only ever answer about the
 * caller. The day it counts against is the member's own, not UTC — the same
 * definition the edge function claims against, so the screen and the server
 * cannot disagree about when tomorrow starts.
 */
export async function loadAnalysisQuota(): Promise<AnalysisQuota | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('my_analysis_quota')
  if (error) {
    console.error('[skinverse] 남은 분석 횟수를 불러오지 못했습니다', error.message)
    return null
  }
  const row = data as { used?: number; limit?: number; resets_at?: string } | null
  if (!row || typeof row.used !== 'number' || typeof row.limit !== 'number') return null
  return { used: row.used, limit: row.limit, resetsAt: row.resets_at ?? '' }
}

// ── the routine, day by day ─────────────────────────────────────────────────

export interface RoutineCheckRow {
  day: string
  slot: 'am' | 'pm'
  stepKey: string
}

export interface RoutineExtraRow {
  id: string
  slot: 'am' | 'pm'
  preset: string
}

/**
 * How many days of routine history to read back.
 *
 * Long enough that a month's habit is visible in the chart, short enough that
 * it is one small query on every load.
 */
export const ROUTINE_HISTORY_DAYS = 30

export async function loadRoutineLog(since: string): Promise<RoutineCheckRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('routine_checks')
    .select('day, slot, step_key')
    .gte('day', since)
  if (error) {
    console.error('[skinverse] 루틴 기록을 불러오지 못했습니다', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    day: row.day as string,
    slot: row.slot as 'am' | 'pm',
    stepKey: row.step_key as string,
  }))
}

export async function loadRoutineExtras(): Promise<RoutineExtraRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('routine_extras')
    .select('id, slot, preset')
    .order('created_at')
  if (error) {
    console.error('[skinverse] 추가한 루틴 단계를 불러오지 못했습니다', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    slot: row.slot as 'am' | 'pm',
    preset: row.preset as string,
  }))
}

/**
 * Tick a step off.
 *
 * The day comes from the client because it is the member's local calendar day
 * that matters: an evening routine finished at 11pm in Seoul belongs to that
 * evening, and a server computing it in UTC would file it under tomorrow.
 */
export async function checkRoutineStep(
  day: string,
  slot: 'am' | 'pm',
  stepKey: string,
): Promise<boolean> {
  if (!supabase) return false
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false
  const { error } = await supabase
    .from('routine_checks')
    .insert({ user_id: auth.user.id, day, slot, step_key: stepKey })
  // A duplicate means it was already ticked, which is the state we wanted.
  if (error && error.code !== '23505') {
    console.error('[skinverse] 루틴 체크를 저장하지 못했습니다', error.message)
    return false
  }
  return true
}

export async function uncheckRoutineStep(
  day: string,
  slot: 'am' | 'pm',
  stepKey: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('routine_checks')
    .delete()
    .eq('day', day)
    .eq('slot', slot)
    .eq('step_key', stepKey)
  if (error) {
    console.error('[skinverse] 루틴 체크를 지우지 못했습니다', error.message)
    return false
  }
  return true
}

export async function addRoutineExtra(
  slot: 'am' | 'pm',
  preset: string,
): Promise<RoutineExtraRow | null> {
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase
    .from('routine_extras')
    .insert({ user_id: auth.user.id, slot, preset })
    .select('id, slot, preset')
    .maybeSingle()
  if (error || !data) {
    if (error) console.error('[skinverse] 루틴 단계를 추가하지 못했습니다', error.message)
    return null
  }
  return { id: data.id as string, slot: data.slot as 'am' | 'pm', preset: data.preset as string }
}

export async function removeRoutineExtra(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('routine_extras').delete().eq('id', id)
  if (error) {
    console.error('[skinverse] 루틴 단계를 빼지 못했습니다', error.message)
    return false
  }
  return true
}

// ── cart ────────────────────────────────────────────────────────────────────

export async function upsertCartItem(productId: string, qty: number): Promise<void> {
  if (!supabase) return
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return
  await supabase
    .from('cart_items')
    .upsert({ user_id: auth.user.id, product_id: productId, qty, updated_at: new Date().toISOString() })
}

export async function removeCartItem(productId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('cart_items').delete().eq('product_id', productId)
}

export async function clearCart(): Promise<void> {
  if (!supabase) return
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return
  await supabase.from('cart_items').delete().eq('user_id', auth.user.id)
}

/**
 * Fold a guest's bag into the member's on sign-in, so nothing is lost by
 * signing up at the checkout step. Quantities add up.
 */
export async function mergeGuestCart(guestCart: Record<string, number>): Promise<void> {
  if (!supabase) return
  const entries = Object.entries(guestCart)
  if (entries.length === 0) return

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return

  const { data: existing } = await supabase.from('cart_items').select('product_id, qty')
  const current = new Map((existing ?? []).map((r) => [r.product_id as string, r.qty as number]))

  const rows = entries.map(([product_id, qty]) => ({
    user_id: auth.user!.id,
    product_id,
    qty: (current.get(product_id) ?? 0) + qty,
    updated_at: new Date().toISOString(),
  }))
  await supabase.from('cart_items').upsert(rows)
}

// ── scans ───────────────────────────────────────────────────────────────────

export async function saveScan(
  skinCondition: SkinConditionKey,
  overall: number,
  metrics: Record<string, number>,
): Promise<void> {
  if (!supabase) return
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return
  await supabase
    .from('scans')
    .insert({ user_id: auth.user.id, skin_condition: skinCondition, overall, metrics })
}

// ── missions and rewards ────────────────────────────────────────────────────

/**
 * Points move in the database, never here.
 *
 * These three used to read the balance, add to it, and write the result back.
 * That made the browser the authority on how many points someone has — and a
 * browser is a UI, not a permission. `profiles.points` is no longer writable
 * from a client at all; `claim_mission` and `redeem_reward` are the only ways
 * it changes, and they read the amount from the missions and rewards tables
 * rather than being told it.
 *
 * So the caller says *which* mission. It does not say what that is worth.
 */

/** Why the server turned a claim or a redemption down. */
export type PointsRefusal =
  | 'not_signed_in'
  | 'no_profile'
  | 'unknown_mission'
  | 'already_claimed'
  | 'unknown_reward'
  | 'already_redeemed'
  | 'insufficient_points'
  | 'out_of_stock'
  | 'unavailable'

export interface PointsResult {
  ok: boolean
  /** The authoritative balance the server settled on. */
  points: number
  streak?: number
  /** How many points that move was actually worth, per the server. */
  earned?: number
  reason?: PointsRefusal
}

/** Read `{ ok, points, ... }` out of an RPC answer without trusting its shape. */
function readPoints(data: unknown, fallback: number): PointsResult {
  const row = (data ?? {}) as Record<string, unknown>
  const points = typeof row.points === 'number' ? row.points : fallback
  return {
    ok: row.ok === true,
    points,
    streak: typeof row.streak === 'number' ? row.streak : undefined,
    earned: typeof row.earned === 'number' ? row.earned : undefined,
    reason: typeof row.reason === 'string' ? (row.reason as PointsRefusal) : undefined,
  }
}

export async function claimMission(missionId: string, currentPoints: number): Promise<PointsResult> {
  if (!supabase) return { ok: false, points: currentPoints, reason: 'unavailable' }

  const { data, error } = await supabase.rpc('claim_mission', { p_mission_id: missionId })
  if (error) {
    console.error('[skinverse] 미션 적립 실패', error.message)
    return { ok: false, points: currentPoints, reason: 'unavailable' }
  }
  return readPoints(data, currentPoints)
}

export async function redeemReward(rewardId: string, currentPoints: number): Promise<PointsResult> {
  if (!supabase) return { ok: false, points: currentPoints, reason: 'unavailable' }

  const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId })
  if (error) {
    console.error('[skinverse] 리워드 교환 실패', error.message)
    return { ok: false, points: currentPoints, reason: 'unavailable' }
  }
  return readPoints(data, currentPoints)
}

// ── orders ──────────────────────────────────────────────────────────────────

export interface PlaceOrderInput {
  shipMethod: 'dhl' | 'ems'
  name: string
  country: string
  address: string
  usePoints: boolean
  currentPoints: number
}

/** Why the server would not place the order. */
export type OrderRefusal =
  | 'not_signed_in'
  | 'no_profile'
  | 'missing_address'
  | 'address_too_long'
  | 'unknown_ship_method'
  | 'cart_empty'
  | 'insufficient_stock'
  | 'unavailable'

export interface PlacedOrderResult {
  ok: boolean
  points: number
  orderNo?: string
  total?: number
  pointsEarned?: number
  eta?: string
  reason?: OrderRefusal
  /** Which line ran out, when that is why the order was refused. */
  productId?: string
  /** How many of it are actually left — 0 when it sold out entirely. */
  available?: number
}

/**
 * Place the order — as a request, not as a set of figures.
 *
 * What is deliberately absent from the arguments: the subtotal, the postage,
 * the points spent, the total, the points earned, and the basket itself. All
 * six used to be posted from here, which meant a five-hundred-dollar order
 * could be written down as costing a cent and nothing would have noticed.
 *
 * `place_order` reads the basket out of `cart_items`, prices it from
 * `products`, takes postage from `shipping_methods` and the point rules from
 * `store_settings`, and returns what it decided. The screen shows the server's
 * answer rather than its own arithmetic.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrderResult> {
  if (!supabase) return { ok: false, points: input.currentPoints, reason: 'unavailable' }

  const { data, error } = await supabase.rpc('place_order', {
    p_ship_method: input.shipMethod,
    p_ship_name: input.name,
    p_ship_country: input.country,
    p_ship_address: input.address,
    p_use_points: input.usePoints,
  })

  if (error) {
    console.error('[skinverse] 주문 저장 실패', error.message)
    return { ok: false, points: input.currentPoints, reason: 'unavailable' }
  }

  const row = (data ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined)

  return {
    ok: row.ok === true,
    points: num(row.points) ?? input.currentPoints,
    orderNo: typeof row.orderNo === 'string' ? row.orderNo : undefined,
    total: num(row.total),
    pointsEarned: num(row.pointsEarned),
    eta: typeof row.eta === 'string' ? row.eta : undefined,
    reason: typeof row.reason === 'string' ? (row.reason as OrderRefusal) : undefined,
    productId: typeof row.productId === 'string' ? row.productId : undefined,
    available: num(row.available),
  }
}

// ── saved routines ──────────────────────────────────────────────────────────

export interface SaveRoutineInput {
  city: string
  skinCondition: SkinConditionKey
  temp: number
  humidity: number
  uv: number
  advice: string
  amSteps: RoutineStepRecord[]
  pmSteps: RoutineStepRecord[]
}

export async function saveRoutine(input: SaveRoutineInput): Promise<boolean> {
  if (!supabase) return false
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false

  const { error } = await supabase.from('routines').insert({
    user_id: auth.user.id,
    title: `${input.city} · ${input.humidity}% · UV ${input.uv}`,
    city: input.city,
    skin_condition: input.skinCondition,
    temp: input.temp,
    humidity: input.humidity,
    uv: input.uv,
    advice: input.advice,
    am_steps: input.amSteps,
    pm_steps: input.pmSteps,
  })
  if (error) console.error('[skinverse] 루틴 저장 실패', error.message)
  return !error
}
