import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  adminMissions,
  adminProducts,
  adminRewards,
  adminPointRules,
  adminInquiries,
  orderStatusMeta,
  orderStatusOrder,
} from '../data/admin'
import { levels } from '../data/rewards'
import type {
  AdminInquiry,
  AdminMission,
  AdminOrder,
  AdminProduct,
  AdminReward,
  OrderStatus,
} from '../data/types'
import { useAuth } from '../auth/AuthContext'
import * as remote from './adminRemote'

export type AdminView = 'dash' | 'orders' | 'products' | 'users' | 'missions' | 'cs'

const TOAST_MS = 2400
const STOCK_STEP = 10
const GRANT_POINTS = 100

/** A tracking number is issued the moment an order is marked as shipped. */
function issueTracking(carrier: AdminOrder['carrier']): string {
  if (carrier === 'DHL') return 'DHL 4402 ' + Math.floor(1000 + Math.random() * 9000)
  return 'EM ' + Math.floor(100 + Math.random() * 900) + ' ' + Math.floor(100 + Math.random() * 900) + ' KR'
}

function levelFor(points: number): string {
  let name = levels[0][1]
  for (const [threshold, label] of levels) if (points >= threshold) name = label
  return name
}

function deltaText(today: number, yesterday: number, unit: string): { text: string; color: string } {
  const diff = today - yesterday
  if (yesterday === 0 && today === 0) return { text: '0' + unit, color: '#8A7D6C' }
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  return {
    text: sign + Math.abs(diff).toLocaleString() + unit,
    color: diff > 0 ? '#2E6B58' : diff < 0 ? '#C25E43' : '#8A7D6C',
  }
}

function useAdminValue() {
  const auth = useAuth()

  const [view, setView] = useState<AdminView>('dash')
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('all')
  const [toast, setToast] = useState('')

  // Live from Postgres.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [members, setMembers] = useState<remote.AdminMember[]>([])
  const [stats, setStats] = useState<remote.AdminStats | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Still file-based: the catalogue lives in src/data, so inventory and the
  // mission/reward configuration have nowhere to persist yet. Edits here are
  // in-session only — see README.
  const [products, setProducts] = useState<AdminProduct[]>(adminProducts)
  const [missions, setMissions] = useState<AdminMission[]>(adminMissions)
  const [rewardStock, setRewardStock] = useState<AdminReward[]>(adminRewards)
  const [cs, setCs] = useState<AdminInquiry[]>(adminInquiries)
  const [earnRate, setEarnRate] = useState(adminPointRules.earnRate)
  const [useCap, setUseCap] = useState(adminPointRules.useCap)
  const [streakBonus, setStreakBonus] = useState(adminPointRules.streakBonus)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const toastMsg = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS)
  }, [])

  // ── admission ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (auth.loading) return
    if (!auth.isMember) {
      setIsAdmin(null)
      return
    }
    let cancelled = false
    void remote.checkIsAdmin().then((ok) => {
      if (!cancelled) setIsAdmin(ok)
    })
    return () => { cancelled = true }
  }, [auth.loading, auth.isMember])

  const refresh = useCallback(async () => {
    setLoadingData(true)
    const [o, m, s] = await Promise.all([remote.loadOrders(), remote.loadMembers(), remote.loadStats()])
    setOrders(o)
    setMembers(m)
    setStats(s)
    setLoadingData(false)
  }, [])

  useEffect(() => {
    if (isAdmin) void refresh()
  }, [isAdmin, refresh])

  // ── writes ────────────────────────────────────────────────────────────────

  const setOrderStatus = async (no: string, status: OrderStatus) => {
    const current = orders.find((o) => o.no === no)
    if (!current) return
    const tracking =
      status === 'shipped' && current.tracking === '—' ? issueTracking(current.carrier) : current.tracking

    // Optimistic: the row updates at once, and a failure puts it back.
    setOrders((prev) => prev.map((o) => (o.no === no ? { ...o, status, tracking } : o)))
    const ok = await remote.updateOrderStatus(no, status, tracking === '—' ? '' : tracking)
    if (!ok) {
      setOrders((prev) => prev.map((o) => (o.no === no ? current : o)))
      toastMsg(no + ' — 저장 실패')
      return
    }
    toastMsg(no + ' → ' + orderStatusMeta[status][0])
  }

  const grant = async (id: string) => {
    const member = members.find((m) => m.id === id)
    if (!member) return
    const ok = await remote.grantPoints(id, GRANT_POINTS, member.points)
    if (!ok) {
      toastMsg(member.name + ' — 지급 실패')
      return
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, points: m.points + GRANT_POINTS } : m)),
    )
    toastMsg(member.name + '님에게 ' + GRANT_POINTS + 'P 지급 완료')
  }

  // ── in-session config edits ───────────────────────────────────────────────

  const bumpStock = (id: string, delta: number) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)))

  const toggleProduct = (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))
    toastMsg(product.name + (product.active ? ' — 판매 중지' : ' — 판매 재개'))
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const pendingCs = cs.filter((c) => !c.done).length
  const newOrders = orders.filter((o) => o.status === 'paid' || o.status === 'preparing').length
  const lowStock = products.filter((p) => p.stock <= 5).length

  const go = (v: AdminView) => () => setView(v)

  const menu = (
    [
      ['dash', '대시보드', 0],
      ['orders', '주문 관리', newOrders],
      ['products', '상품 관리', lowStock],
      ['users', '회원 관리', 0],
      ['missions', '미션 · 포인트', 0],
      ['cs', 'CS 문의', pendingCs],
    ] as [AdminView, string, number][]
  ).map(([id, l, badge]) => ({
    id,
    label: l,
    badge,
    hasBadge: badge > 0,
    go: go(id),
    bg: view === id ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: view === id ? '#F5F0E6' : '#B0A490',
  }))

  const toOrderView = (o: AdminOrder) => {
    const meta = orderStatusMeta[o.status]
    return {
      ...o,
      amtS: '$' + o.amt.toFixed(2),
      customer: o.name + ' ' + (o.country.split(' ')[0] ?? ''),
      stLabel: meta[0],
      stStyle:
        'justify-self:start;background:' + meta[2] + ';color:' + meta[1] +
        ';border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700',
      setStatus: (status: OrderStatus) => void setOrderStatus(o.no, status),
    }
  }

  const orderList = (orderFilter === 'all' ? orders : orders.filter((o) => o.status === orderFilter)).map(toOrderView)

  const orderChips = ([['all', '전체'], ...orderStatusOrder.map((st) => [st, orderStatusMeta[st][0]])] as [
    OrderStatus | 'all',
    string,
  ][]).map(([id, l]) => ({
    id,
    label: l,
    pick: () => setOrderFilter(id),
    style:
      'cursor:pointer;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:600;' +
      (orderFilter === id
        ? 'background:#221C15;color:#F5F0E6'
        : 'background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234'),
  }))

  const maxSales = stats?.countrySales[0]?.[1] ?? 0
  const countrySales = (stats?.countrySales ?? []).map(([name, value]) => ({
    name,
    amt: '$' + value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    w: maxSales ? Math.round((value / maxSales) * 100) + '%' : '0%',
  }))

  const f = stats?.funnel
  const funnelRows: [string, number][] = f
    ? [['가입 회원', f.members], ['AI 스캔 완료', f.scanned], ['장바구니 담기', f.carted], ['구매 완료', f.purchased]]
    : []
  const funnelMax = funnelRows[0]?.[1] ?? 0
  const funnel = funnelRows.map(([label, n]) => ({
    label,
    n: n.toLocaleString(),
    w: funnelMax ? Math.max(28, Math.round((n / funnelMax) * 100)) + '%' : '28%',
  }))
  const conversionRate =
    f && f.members > 0 ? ((f.purchased / f.members) * 100).toFixed(1) + '%' : '—'
  const scanLift =
    f && f.scanned > 0 && f.members > 0
      ? (f.purchased / f.scanned / Math.max(f.purchased / f.members, 0.0001)).toFixed(1) + '×'
      : '—'

  const kpis = stats
    ? [
        {
          label: '오늘 매출',
          value: '$' + stats.revenueToday.toLocaleString(undefined, { maximumFractionDigits: 0 }),
          ...deltaText(stats.revenueToday, stats.revenueYesterday, ''),
        },
        { label: '오늘 주문', value: stats.ordersToday + '건', ...deltaText(stats.ordersToday, stats.ordersYesterday, '건') },
        { label: 'AI 스캔 (오늘)', value: stats.scansToday + '회', ...deltaText(stats.scansToday, stats.scansYesterday, '회') },
        { label: '신규 가입', value: stats.signupsToday + '명', ...deltaText(stats.signupsToday, stats.signupsYesterday, '명') },
      ].map((k) => ({ label: k.label, value: k.value, delta: k.text, deltaColor: k.color }))
    : []

  return {
    view,
    toast,
    isAdmin,
    authLoading: auth.loading,
    isSignedIn: auth.isMember,
    signOut: () => void auth.signOut(),
    email: auth.user?.email ?? '',
    loadingData,
    refresh: () => void refresh(),
    hasOrders: orders.length > 0,
    hasMembers: members.length > 0,

    menu,
    goOrders: go('orders'),
    isDash: view === 'dash',
    isOrders: view === 'orders',
    isProducts: view === 'products',
    isUsers: view === 'users',
    isMissions: view === 'missions',
    isCs: view === 'cs',

    kpis,
    countrySales,
    funnel,
    conversionRate,
    scanLift,
    recentOrders: orders.slice(0, 5).map(toOrderView),
    orderList,
    orderChips,

    lowStockN: lowStock,
    prodList: products.map((p) => ({
      ...p,
      grad: p.g,
      stockColor: p.stock <= 5 ? '#C25E43' : '#221C15',
      inc: () => bumpStock(p.id, STOCK_STEP),
      dec: () => bumpStock(p.id, -STOCK_STEP),
      toggle: () => toggleProduct(p.id),
      activeLabel: p.active ? '판매중' : '판매중지',
      activeStyle: p.active ? 'background:#EAF1EC;color:#2E6B58' : 'background:#EFE9DD;color:#8A7D6C',
    })),

    userList: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      country: m.country,
      level: levelFor(m.points),
      ptsS: m.points.toLocaleString(),
      activity: m.scanCount + '회 / ' + m.orderCount + '건',
      grant: () => void grant(m.id),
    })),
    grantPoints: GRANT_POINTS,

    missionCfg: missions.map((m) => ({
      ...m,
      txtColor: m.on ? '#221C15' : '#B0A490',
      setPts: (pts: number) =>
        setMissions((prev) => prev.map((x) => (x.id === m.id ? { ...x, pts: Math.max(0, pts) } : x))),
      toggle: () => setMissions((prev) => prev.map((x) => (x.id === m.id ? { ...x, on: !x.on } : x))),
      togBg: m.on ? '#2E6B58' : '#D8CFBF',
      togLeft: m.on ? '19px' : '3px',
    })),

    earnRate,
    useCap,
    streakBonus,
    setEarnRate: (v: number) => setEarnRate(Math.max(0, v)),
    setUseCap: (v: number) => setUseCap(Math.max(0, v)),
    setStreakBonus: (v: number) => setStreakBonus(Math.max(0, v)),

    rewardCfg: rewardStock.map((r) => ({
      ...r,
      color: r.stock <= 5 ? '#C25E43' : '#221C15',
      inc: () => setRewardStock((prev) => prev.map((x) => (x.id === r.id ? { ...x, stock: x.stock + STOCK_STEP } : x))),
      dec: () => setRewardStock((prev) => prev.map((x) => (x.id === r.id ? { ...x, stock: Math.max(0, x.stock - STOCK_STEP) } : x))),
    })),

    csList: cs.map((c) => ({
      ...c,
      toggle: () => setCs((prev) => prev.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x))),
      btnLabel: c.done ? '답변완료 ✓' : '답변 대기',
      btnStyle: c.done ? 'background:#EAF1EC;color:#2E6B58' : 'background:#221C15;color:#F5F0E6',
    })),
  }
}

export type AdminValue = ReturnType<typeof useAdminValue>

const AdminContext = createContext<AdminValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const value = useAdminValue()
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminValue {
  const value = useContext(AdminContext)
  if (!value) throw new Error('useAdmin must be used inside <AdminProvider>')
  return value
}
