import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { orderStatusMeta, orderStatusOrder } from '../data/admin'
import { levels } from '../data/rewards'
import type { AdminOrder, OrderStatus } from '../data/types'
import { loadAllThreads } from '../support/remote'
import { useAuth } from '../auth/AuthContext'
import { useCatalog } from '../catalog/CatalogContext'
import * as catalogRemote from '../catalog/remote'
import type { StoreSettings } from '../catalog/types'
import * as remote from './adminRemote'

export type AdminView = 'dash' | 'orders' | 'products' | 'users' | 'missions' | 'cs' | 'access'

/** Views only a master may open: the operator list and the point economy. */
const MASTER_ONLY: ReadonlySet<AdminView> = new Set<AdminView>(['missions', 'access'])

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
  const catalog = useCatalog()

  const [view, setView] = useState<AdminView>('dash')
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('all')
  const [toast, setToast] = useState('')

  // Live from Postgres.
  const [role, setRole] = useState<remote.AdminRole | null | undefined>(undefined)
  /**
   * Where the caller's application stands, which the role cannot say: the role
   * is null both for someone who never applied and for someone still waiting,
   * and those two people need very different screens.
   */
  const [applicationStatus, setApplicationStatus] = useState<remote.AdminStatus | null>(null)
  const [applying, setApplying] = useState(false)
  const [operators, setOperators] = useState<remote.Operator[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [members, setMembers] = useState<remote.AdminMember[]>([])
  const [stats, setStats] = useState<remote.AdminStats | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Just the badge count; the CS screen loads its own threads.
  const [pendingCs, setPendingCs] = useState(0)

  // Point rules are edited locally and committed with an explicit save, so a
  // half-typed number never becomes the live earn rate.
  const [draft, setDraft] = useState<StoreSettings>(catalog.settings)
  const [draftDirty, setDraftDirty] = useState(false)
  useEffect(() => {
    if (!draftDirty) setDraft(catalog.settings)
  }, [catalog.settings, draftDirty])

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
      setRole(undefined)
      setApplicationStatus(null)
      return
    }
    let cancelled = false
    void Promise.all([remote.myRole(), remote.myAdminStatus()]).then(([r, st]) => {
      if (cancelled) return
      setRole(r)
      setApplicationStatus(st)
    })
    return () => { cancelled = true }
  }, [auth.loading, auth.isMember])

  /** Ask to become an operator. Always lands as a pending plain admin. */
  const apply = useCallback(async (note: string) => {
    setApplying(true)
    const res = await remote.applyForOperator(note)
    setApplying(false)
    if (res.ok) setApplicationStatus('pending')
    return res
  }, [])

  const refresh = useCallback(async () => {
    setLoadingData(true)
    const [o, m, s, threads] = await Promise.all([
      remote.loadOrders(),
      remote.loadMembers(),
      remote.loadStats(),
      loadAllThreads(),
    ])
    setOrders(o)
    setMembers(m)
    setStats(s)
    setPendingCs(threads.filter((t) => t.status === 'open').length)
    setLoadingData(false)
  }, [])

  useEffect(() => {
    if (role) void refresh()
  }, [role, refresh])

  useEffect(() => {
    if (role === 'master') void remote.listOperators().then(setOperators)
  }, [role])

  // A demoted operator must not be left staring at a master-only screen.
  useEffect(() => {
    if (role === 'admin' && MASTER_ONLY.has(view)) setView('dash')
  }, [role, view])

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

  // ── catalogue writes ──────────────────────────────────────────────────────

  const products = catalog.products
  const missions = catalog.missions
  const rewardStock = catalog.rewards

  const bumpStock = async (id: string, delta: number) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    const ok = await catalogRemote.setProductStock(id, product.stock + delta)
    if (!ok) return toastMsg(product.name + ' — 재고 저장 실패')
    await catalog.refresh()
  }

  const toggleProduct = async (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    const ok = await catalogRemote.setProductActive(id, !product.active)
    if (!ok) return toastMsg(product.name + ' — 저장 실패')
    await catalog.refresh()
    toastMsg(product.name + (product.active ? ' — 판매 중지' : ' — 판매 재개'))
  }

  const changeMissionPoints = async (id: string, points: number) => {
    const ok = await catalogRemote.setMissionPoints(id, points)
    if (!ok) return toastMsg('미션 보상 저장 실패')
    await catalog.refresh()
  }

  const toggleMission = async (id: string) => {
    const mission = missions.find((m) => m.id === id)
    if (!mission) return
    const ok = await catalogRemote.setMissionActive(id, !mission.active)
    if (!ok) return toastMsg('미션 상태 저장 실패')
    await catalog.refresh()
  }

  const bumpRewardStock = async (id: string, delta: number) => {
    const reward = rewardStock.find((r) => r.id === id)
    if (!reward) return
    const ok = await catalogRemote.setRewardStock(id, reward.stock + delta)
    if (!ok) return toastMsg('리워드 재고 저장 실패')
    await catalog.refresh()
  }

  const saveSettings = async () => {
    const ok = await catalogRemote.saveSettings(draft)
    if (!ok) return toastMsg('포인트 설정 저장 실패 — 마스터 권한이 필요합니다')
    setDraftDirty(false)
    await catalog.refresh()
    toastMsg('포인트 설정을 저장했습니다')
  }

  const editDraft = (patch: Partial<StoreSettings>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    setDraftDirty(true)
  }

  // ── operator accounts ─────────────────────────────────────────────────────

  const reloadOperators = async () => setOperators(await remote.listOperators())

  const addOperator = async (email: string, r: remote.AdminRole, note: string) => {
    const res = await remote.addOperator(email, r, note)
    if (!res.ok) return toastMsg(res.error ?? '추가 실패')
    await reloadOperators()
    toastMsg(email + ' 추가됨')
  }

  const changeOperatorRole = async (email: string, r: remote.AdminRole) => {
    const res = await remote.setOperatorRole(email, r)
    if (!res.ok) return toastMsg(res.error ?? '변경 실패')
    await reloadOperators()
    toastMsg(email + ' → ' + (r === 'master' ? '마스터' : '일반 관리자'))
  }

  const decide = async (email: string, status: 'active' | 'rejected') => {
    const res = await remote.decideApplication(email, status, auth.user?.email ?? '')
    if (!res.ok) return toastMsg(res.error ?? '처리 실패')
    await reloadOperators()
    toastMsg(email + (status === 'active' ? ' 승인됨' : ' 반려됨'))
  }

  const removeOperator = async (email: string) => {
    const res = await remote.removeOperator(email)
    if (!res.ok) return toastMsg(res.error ?? '삭제 실패')
    await reloadOperators()
    toastMsg(email + ' 삭제됨')
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const isMaster = role === 'master'
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
      ['access', '권한 관리', 0],
    ] as [AdminView, string, number][]
  )
    .filter(([id]) => isMaster || !MASTER_ONLY.has(id))
    .map(([id, l, badge]) => ({
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
    role,
    isMaster,
    isAdmin: role !== undefined && role !== null,
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
    isAccess: view === 'access',

    kpis,
    countrySales,
    funnel,
    conversionRate,
    scanLift,
    recentOrders: orders.slice(0, 5).map(toOrderView),
    orderList,
    orderChips,

    lowStockN: lowStock,
    catalogLoading: catalog.loading,
    prodList: products.map((p) => ({
      ...p,
      grad: p.g,
      stockColor: p.stock <= 5 ? '#C25E43' : '#221C15',
      inc: () => void bumpStock(p.id, STOCK_STEP),
      dec: () => void bumpStock(p.id, -STOCK_STEP),
      toggle: () => void toggleProduct(p.id),
      activeLabel: p.active ? '판매중' : '판매중지',
      activeStyle: p.active ? 'background:#EAF1EC;color:#2E6B58' : 'background:#EFE9DD;color:#8A7D6C',
    })),

    /**
     * The member directory. The raw record travels with each row so the detail
     * panel can show the signup form and the live profile side by side — the
     * difference between the two is usually what a support question is about.
     */
    userList: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      country: m.country,
      level: levelFor(m.points),
      ptsS: m.points.toLocaleString(),
      activity: m.scanCount + '회 / ' + m.orderCount + '건',
      grant: () => void grant(m.id),
      record: m,
    })),
    grantPoints: GRANT_POINTS,

    missionCfg: missions.map((m) => ({
      id: m.id,
      label: m.l.ko,
      cat: m.kind === 'daily' ? '일일' : '주간',
      pts: m.pts,
      on: m.active,
      txtColor: m.active ? '#221C15' : '#B0A490',
      setPts: (pts: number) => void changeMissionPoints(m.id, pts),
      toggle: () => void toggleMission(m.id),
      togBg: m.active ? '#2E6B58' : '#D8CFBF',
      togLeft: m.active ? '19px' : '3px',
    })),

    earnRate: draft.earnPerDollar,
    useCap: draft.useCapPct,
    streakBonus: draft.streakBonus,
    setEarnRate: (v: number) => editDraft({ earnPerDollar: Math.max(0, v) }),
    setUseCap: (v: number) => editDraft({ useCapPct: Math.max(0, Math.min(100, v)) }),
    setStreakBonus: (v: number) => editDraft({ streakBonus: Math.max(0, v) }),
    settingsDirty: draftDirty,
    saveSettings: () => void saveSettings(),

    rewardCfg: rewardStock.map((r) => ({
      id: r.id,
      name: r.l.ko,
      cost: r.cost,
      stock: r.stock,
      color: r.stock <= 5 ? '#C25E43' : '#221C15',
      inc: () => void bumpRewardStock(r.id, STOCK_STEP),
      dec: () => void bumpRewardStock(r.id, -STOCK_STEP),
    })),

    operators: operators.map((o) => ({
      ...o,
      isSelf: o.email.toLowerCase() === (auth.user?.email ?? '').toLowerCase(),
      roleLabel: o.role === 'master' ? '마스터' : '일반 관리자',
      status: o.status,
      statusLabel:
        o.status === 'active' ? '활성' : o.status === 'pending' ? '승인 대기' : '반려됨',
      setRole: (r: remote.AdminRole) => void changeOperatorRole(o.email, r),
      remove: () => void removeOperator(o.email),
    })),
    addOperator: (email: string, r: remote.AdminRole, note: string) => void addOperator(email, r, note),

    // ── applications ───────────────────────────────────────────────────────
    applicationStatus,
    applying,
    apply,
    /** Waiting on a master, listed oldest first so nobody is left behind. */
    pendingOperators: operators
      .filter((o) => o.status === 'pending')
      .map((o) => ({
        email: o.email,
        note: o.note,
        appliedAt: o.applied_at,
        approve: () => void decide(o.email, 'active'),
        reject: () => void decide(o.email, 'rejected'),
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
