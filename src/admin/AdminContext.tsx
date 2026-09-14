import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  adminCountrySales,
  adminFunnel,
  adminInquiries,
  adminMissions,
  adminOrders,
  adminPointRules,
  adminProducts,
  adminRewards,
  adminUsers,
  orderStatusMeta,
  orderStatusOrder,
} from '../data/admin'
import type {
  AdminInquiry,
  AdminMission,
  AdminOrder,
  AdminProduct,
  AdminReward,
  AdminUser,
  OrderStatus,
} from '../data/types'

export type AdminView = 'dash' | 'orders' | 'products' | 'users' | 'missions' | 'cs'

const TOAST_MS = 2400
/** Stock steps by ten per click, matching the prototype's +/− controls. */
const STOCK_STEP = 10
const GRANT_POINTS = 100

export interface AdminState {
  view: AdminView
  orderFilter: OrderStatus | 'all'
  toast: string
  orders: AdminOrder[]
  products: AdminProduct[]
  users: AdminUser[]
  missions: AdminMission[]
  rewards: AdminReward[]
  earnRate: number
  useCap: number
  streakBonus: number
  cs: AdminInquiry[]
}

const initialAdminState: AdminState = {
  view: 'dash',
  orderFilter: 'all',
  toast: '',
  orders: adminOrders,
  products: adminProducts,
  users: adminUsers,
  missions: adminMissions,
  rewards: adminRewards,
  earnRate: adminPointRules.earnRate,
  useCap: adminPointRules.useCap,
  streakBonus: adminPointRules.streakBonus,
  cs: adminInquiries,
}

/** A tracking number is issued the moment an order is marked as shipped. */
function issueTracking(carrier: AdminOrder['carrier']): string {
  if (carrier === 'DHL') return 'DHL 4402 ' + Math.floor(1000 + Math.random() * 9000)
  return 'EM ' + Math.floor(100 + Math.random() * 900) + ' ' + Math.floor(100 + Math.random() * 900) + ' KR'
}

function useAdminValue() {
  const [state, setState] = useState<AdminState>(initialAdminState)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const toastMsg = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setState((s) => ({ ...s, toast: msg }))
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: '' })), TOAST_MS)
  }, [])

  const go = (view: AdminView) => () => setState((s) => ({ ...s, view }))

  const setOrderStatus = (no: string, status: OrderStatus) => {
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) =>
        o.no === no
          ? {
              ...o,
              status,
              tracking: status === 'shipped' && o.tracking === '—' ? issueTracking(o.carrier) : o.tracking,
            }
          : o,
      ),
    }))
    toastMsg(no + ' → ' + orderStatusMeta[status][0])
  }

  const bumpStock = (id: string, delta: number) =>
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
    }))

  const toggleProduct = (id: string) => {
    const product = state.products.find((p) => p.id === id)
    if (!product) return
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    }))
    toastMsg(product.name + (product.active ? ' — 판매 중지' : ' — 판매 재개'))
  }

  const grantPoints = (id: string) => {
    const user = state.users.find((u) => u.id === id)
    if (!user) return
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, pts: u.pts + GRANT_POINTS } : u)),
    }))
    toastMsg(user.name + '님에게 ' + GRANT_POINTS + 'P 지급 완료')
  }

  const setMissionPts = (id: string, pts: number) =>
    setState((s) => ({
      ...s,
      missions: s.missions.map((m) => (m.id === id ? { ...m, pts: Math.max(0, pts) } : m)),
    }))

  const toggleMission = (id: string) =>
    setState((s) => ({
      ...s,
      missions: s.missions.map((m) => (m.id === id ? { ...m, on: !m.on } : m)),
    }))

  const bumpRewardStock = (id: string, delta: number) =>
    setState((s) => ({
      ...s,
      rewards: s.rewards.map((r) => (r.id === id ? { ...r, stock: Math.max(0, r.stock + delta) } : r)),
    }))

  const toggleInquiry = (id: string) =>
    setState((s) => ({ ...s, cs: s.cs.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) }))

  // ---------------------------------------------------------------- derived

  const pendingCs = state.cs.filter((c) => !c.done).length
  const newOrders = state.orders.filter((o) => o.status === 'paid' || o.status === 'preparing').length
  const lowStock = state.products.filter((p) => p.stock <= 5).length

  const menu = (
    [
      ['dash', '대시보드', 0],
      ['orders', '주문 관리', newOrders],
      ['products', '상품 관리', lowStock],
      ['users', '회원 관리', 0],
      ['missions', '미션 · 포인트', 0],
      ['cs', 'CS 문의', pendingCs],
    ] as [AdminView, string, number][]
  ).map(([id, label, badge]) => ({
    id,
    label,
    badge,
    hasBadge: badge > 0,
    go: go(id),
    bg: state.view === id ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: state.view === id ? '#F5F0E6' : '#B0A490',
  }))

  const toOrderView = (o: AdminOrder) => {
    const meta = orderStatusMeta[o.status]
    return {
      ...o,
      amtS: '$' + o.amt.toFixed(2),
      /** "Yuki Tanaka 🇯🇵" — the flag only, without the country name. */
      customer: o.name + ' ' + o.country.split(' ')[0],
      stLabel: meta[0],
      stStyle:
        'justify-self:start;background:' +
        meta[2] +
        ';color:' +
        meta[1] +
        ';border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700',
      setStatus: (status: OrderStatus) => setOrderStatus(o.no, status),
    }
  }

  const orderList = (
    state.orderFilter === 'all' ? state.orders : state.orders.filter((o) => o.status === state.orderFilter)
  ).map(toOrderView)

  const orderChips = ([['all', '전체'], ...orderStatusOrder.map((st) => [st, orderStatusMeta[st][0]])] as [
    OrderStatus | 'all',
    string,
  ][]).map(([id, label]) => ({
    id,
    label,
    pick: () => setState((s) => ({ ...s, orderFilter: id })),
    style:
      'cursor:pointer;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:600;' +
      (state.orderFilter === id
        ? 'background:#221C15;color:#F5F0E6'
        : 'background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234'),
  }))

  const maxSales = adminCountrySales[0][1]
  const countrySales = adminCountrySales.map(([name, value]) => ({
    name,
    amt: '$' + value.toLocaleString(),
    w: Math.round((value / maxSales) * 100) + '%',
  }))

  const funnel = adminFunnel.map(([label, n], i) => ({
    label,
    n: n.toLocaleString(),
    w: 100 - i * 20 + '%',
  }))

  return {
    state,
    menu,
    goOrders: go('orders'),

    countrySales,
    funnel,
    recentOrders: state.orders.slice(0, 5).map(toOrderView),
    orderList,
    orderChips,

    lowStockN: lowStock,
    prodList: state.products.map((p) => ({
      ...p,
      grad: p.g,
      stockColor: p.stock <= 5 ? '#C25E43' : '#221C15',
      inc: () => bumpStock(p.id, STOCK_STEP),
      dec: () => bumpStock(p.id, -STOCK_STEP),
      toggle: () => toggleProduct(p.id),
      activeLabel: p.active ? '판매중' : '판매중지',
      activeStyle: p.active ? 'background:#EAF1EC;color:#2E6B58' : 'background:#EFE9DD;color:#8A7D6C',
    })),

    userList: state.users.map((u) => ({
      ...u,
      ptsS: u.pts.toLocaleString(),
      grant: () => grantPoints(u.id),
    })),
    grantPoints: GRANT_POINTS,

    missionCfg: state.missions.map((m) => ({
      ...m,
      txtColor: m.on ? '#221C15' : '#B0A490',
      setPts: (pts: number) => setMissionPts(m.id, pts),
      toggle: () => toggleMission(m.id),
      togBg: m.on ? '#2E6B58' : '#D8CFBF',
      togLeft: m.on ? '19px' : '3px',
    })),

    setEarnRate: (v: number) => setState((s) => ({ ...s, earnRate: Math.max(0, v) })),
    setUseCap: (v: number) => setState((s) => ({ ...s, useCap: Math.max(0, v) })),
    setStreakBonus: (v: number) => setState((s) => ({ ...s, streakBonus: Math.max(0, v) })),

    rewardCfg: state.rewards.map((r) => ({
      ...r,
      color: r.stock <= 5 ? '#C25E43' : '#221C15',
      inc: () => bumpRewardStock(r.id, STOCK_STEP),
      dec: () => bumpRewardStock(r.id, -STOCK_STEP),
    })),

    csList: state.cs.map((c) => ({
      ...c,
      toggle: () => toggleInquiry(c.id),
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
