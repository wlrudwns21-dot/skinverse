import { supabase } from '../lib/supabase'
import { products } from '../data/products'
import type { SkinConditionKey } from '../data/types'
import type { RoutineStepRecord } from './types'

/**
 * Every read and write a signed-in member makes against Postgres.
 *
 * Row level security means these queries never need a user id filter for
 * safety — the policies do that. They are written plainly and let errors
 * surface to the caller, which decides whether to toast or ignore.
 */

export interface MemberSnapshot {
  cart: Record<string, number>
  /** Mission ids already claimed today. */
  claimedToday: string[]
  /** Reward ids ever redeemed. */
  redeemed: string[]
  latestScan: { skin_condition: SkinConditionKey; overall: number; created_at: string } | null
  scanHistory: { skin_condition: SkinConditionKey; overall: number; created_at: string }[]
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

/** Local calendar day as YYYY-MM-DD — mission claims reset at the member's midnight. */
export function localToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** One round trip per table, in parallel, to fill the store on sign-in. */
export async function loadMemberSnapshot(): Promise<MemberSnapshot> {
  if (!supabase) return EMPTY

  const [cart, claims, redemptions, scans, orders, routines] = await Promise.all([
    supabase.from('cart_items').select('product_id, qty'),
    supabase.from('mission_claims').select('mission_id').eq('claimed_on', localToday()),
    supabase.from('redemptions').select('reward_id'),
    supabase
      .from('scans')
      .select('skin_condition, overall, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('orders')
      .select('order_no, total, points_earned, eta, created_at')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('routines').select('id', { count: 'exact', head: true }),
  ])

  const cartMap: Record<string, number> = {}
  for (const row of cart.data ?? []) cartMap[row.product_id as string] = row.qty as number

  const history = (scans.data ?? []) as MemberSnapshot['scanHistory']
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
 * Claim a mission and credit the points.
 *
 * The unique (user, mission, day) constraint is what actually prevents double
 * claiming — a duplicate insert fails and we credit nothing, so a double-tap or
 * a replayed request cannot mint points.
 */
export async function claimMission(
  missionId: string,
  points: number,
  currentPoints: number,
): Promise<{ ok: boolean; points: number }> {
  if (!supabase) return { ok: false, points: currentPoints }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, points: currentPoints }

  const { error } = await supabase
    .from('mission_claims')
    .insert({ user_id: auth.user.id, mission_id: missionId, points, claimed_on: localToday() })
  if (error) return { ok: false, points: currentPoints }

  const next = currentPoints + points
  await supabase.from('profiles').update({ points: next }).eq('id', auth.user.id)
  return { ok: true, points: next }
}

export async function redeemReward(
  rewardId: string,
  cost: number,
  currentPoints: number,
): Promise<{ ok: boolean; points: number }> {
  if (!supabase) return { ok: false, points: currentPoints }
  if (currentPoints < cost) return { ok: false, points: currentPoints }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, points: currentPoints }

  const { error } = await supabase
    .from('redemptions')
    .insert({ user_id: auth.user.id, reward_id: rewardId, cost })
  if (error) return { ok: false, points: currentPoints }

  const next = currentPoints - cost
  await supabase.from('profiles').update({ points: next }).eq('id', auth.user.id)
  return { ok: true, points: next }
}

export async function bumpStreak(streak: number): Promise<void> {
  if (!supabase) return
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return
  await supabase.from('profiles').update({ streak }).eq('id', auth.user.id)
}

// ── orders ──────────────────────────────────────────────────────────────────

export interface PlaceOrderInput {
  orderNo: string
  subtotal: number
  shipping: number
  pointsUsed: number
  total: number
  pointsEarned: number
  shipMethod: 'dhl' | 'ems'
  eta: string
  name: string
  country: string
  address: string
  cart: Record<string, number>
  currentPoints: number
}

/** Write the order and its lines, then settle the member's point balance. */
export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: boolean; points: number }> {
  if (!supabase) return { ok: false, points: input.currentPoints }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, points: input.currentPoints }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: auth.user.id,
      order_no: input.orderNo,
      subtotal: input.subtotal,
      shipping: input.shipping,
      points_used: input.pointsUsed,
      total: input.total,
      points_earned: input.pointsEarned,
      ship_method: input.shipMethod,
      eta: input.eta,
      ship_name: input.name,
      ship_country: input.country,
      ship_address: input.address,
    })
    .select('id')
    .single()

  if (error || !order) {
    console.error('[skinverse] 주문 저장 실패', error?.message)
    return { ok: false, points: input.currentPoints }
  }

  const lines = Object.entries(input.cart).map(([productId, qty]) => {
    const product = products.find((p) => p.id === productId)
    return {
      order_id: order.id as string,
      product_id: productId,
      brand: product?.brand ?? '',
      product_name: product?.name ?? '',
      unit_price: product?.price ?? 0,
      qty,
    }
  })
  if (lines.length) await supabase.from('order_items').insert(lines)

  await clearCart()

  const next = Math.max(0, input.currentPoints - input.pointsUsed + input.pointsEarned)
  await supabase.from('profiles').update({ points: next }).eq('id', auth.user.id)
  return { ok: true, points: next }
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
