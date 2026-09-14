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
  name: string
  email: string
  country: string
  points: number
  streak: number
  language: string
  created_at: string
  /** Derived: how many scans and orders this member has. */
  scanCount: number
  orderCount: number
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

  const [profiles, scans, orders] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, country, points, streak, language, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('scans').select('user_id'),
    supabase.from('orders').select('user_id'),
  ])

  if (profiles.error) {
    console.error('[skinverse] 회원 조회 실패', profiles.error.message)
    return []
  }

  const scanCounts = new Map<string, number>()
  for (const r of scans.data ?? []) {
    const id = r.user_id as string
    scanCounts.set(id, (scanCounts.get(id) ?? 0) + 1)
  }
  const orderCounts = new Map<string, number>()
  for (const r of orders.data ?? []) {
    const id = r.user_id as string
    orderCounts.set(id, (orderCounts.get(id) ?? 0) + 1)
  }

  return (profiles.data ?? []).map((p) => ({
    id: p.id as string,
    name: (p.name as string) || '—',
    // auth.users is not readable from the browser, so the profile carries the
    // name and the email stays with the account. Shown as the id's short form.
    email: (p.id as string).slice(0, 8),
    country: p.country as string,
    points: p.points as number,
    streak: p.streak as number,
    language: p.language as string,
    created_at: p.created_at as string,
    scanCount: scanCounts.get(p.id as string) ?? 0,
    orderCount: orderCounts.get(p.id as string) ?? 0,
  }))
}

export async function grantPoints(userId: string, amount: number, current: number): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('profiles')
    .update({ points: Math.max(0, current + amount) })
    .eq('id', userId)
  if (error) console.error('[skinverse] 포인트 지급 실패', error.message)
  return !error
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
