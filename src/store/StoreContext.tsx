import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { demoAccount, latestScanDate, scanHistory } from '../data/account'
import { cities, defaultCity } from '../data/cities'
import { orderNoPrefix, pointsRules, shipping } from '../data/commerce'
import { products } from '../data/products'
import { dailyMissions, levels, rewards, weeklyMissions } from '../data/rewards'
import { conditions, metricDefs } from '../data/skin'
import type { Lang, Mission, Product, Reward } from '../data/types'
import { chipKeys, chipLabels, type ChipKey } from '../i18n/chips'
import { strings, type Strings } from '../i18n'
import {
  initialState,
  pointsOf,
  totalsOf,
  usd,
  type ScanStep,
  type Screen,
  type StoreState,
} from './state'

/** How long the whole scan animation runs: 50 ticks × 70ms ≈ 3.5s. */
const SCAN_TICK_MS = 70
const SCAN_TICK_STEP = 2
/** Points granted the first time a scan completes (clears the weekly `w2` mission). */
const FIRST_SCAN_POINTS = 30
const TOAST_MS = 2600
const PAYPAL_MS = 1500

export interface ProductView {
  id: string
  brand: string
  name: string
  kind: string
  ml: string
  grad: string
  sub: string
  why: string
  ing: string
  priceS: string
  matchS: string
  /** Numeric match used for sorting; the UI only shows `matchS`. */
  matchN: number
  open: () => void
  add: () => void
}

export interface MissionView {
  pts: number
  label: string
  claim: () => void
  bg: string
  boxBg: string
  mark: string
  txtStyle: string
}

export interface RewardView {
  label: string
  redeem: () => void
  btn: string
  btnStyle: string
}

export interface RoutineStep {
  n: number
  name: string
  note: string
}

function useStoreValue() {
  const [state, setState] = useState<StoreState>(initialState)

  // Timers and the latest state/strings, for callbacks that outlive a render.
  const stateRef = useRef(state)
  stateRef.current = state
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = useMemo(() => strings(state.lang), [state.lang])
  const tRef = useRef<Strings>(t)
  tRef.current = t

  useEffect(
    () => () => {
      if (scanTimer.current) clearInterval(scanTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (payTimer.current) clearTimeout(payTimer.current)
    },
    [],
  )

  const toastMsg = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setState((s) => ({ ...s, toast: msg }))
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: '' })), TOAST_MS)
  }, [])

  const go = useCallback((screen: Screen) => () => setState((s) => ({ ...s, screen })), [])

  const startScan = useCallback(() => {
    // Whether this is the very first scan is fixed the moment it starts, so the
    // first-scan bonus can be decided here rather than inside the tick.
    const first = !stateRef.current.scanned
    if (scanTimer.current) clearInterval(scanTimer.current)
    setState((s) => ({ ...s, screen: 'scan', scanStep: 'scanning' as ScanStep, progress: 0 }))

    scanTimer.current = setInterval(() => {
      const next = stateRef.current.progress + SCAN_TICK_STEP
      if (next >= 100) {
        if (scanTimer.current) clearInterval(scanTimer.current)
        setState((s) => ({
          ...s,
          progress: 100,
          scanStep: 'results',
          scanned: true,
          done: first ? { ...s.done, w2: true } : s.done,
          pd: first ? s.pd + FIRST_SCAN_POINTS : s.pd,
        }))
        if (first) toastMsg(tRef.current.tScanM)
      } else {
        setState((s) => ({ ...s, progress: next }))
      }
    }, SCAN_TICK_MS)
  }, [toastMsg])

  const claim = useCallback(
    (mission: Mission) => {
      const s = stateRef.current
      if (s.done[mission.id]) return
      const T = tRef.current
      const done = { ...s.done, [mission.id]: true }

      // Clearing the last daily mission of the day advances the streak, once.
      let streak = s.streak
      let streakAwarded = s.streakAwarded
      let msg = T.tEarn(mission.pts)
      if (dailyMissions.every((d) => done[d.id]) && !streakAwarded) {
        streak++
        streakAwarded = true
        msg = T.tStreak(mission.pts, streak)
      }

      setState((cur) => ({ ...cur, done, pd: cur.pd + mission.pts, streak, streakAwarded }))
      toastMsg(msg)
    },
    [toastMsg],
  )

  const redeem = useCallback(
    (reward: Reward) => {
      const s = stateRef.current
      if (s.redeemed[reward.id]) return
      const T = tRef.current
      if (pointsOf(s) < reward.cost) {
        toastMsg(T.tNoPts)
        return
      }
      setState((cur) => ({
        ...cur,
        redeemed: { ...cur.redeemed, [reward.id]: true },
        pd: cur.pd - reward.cost,
      }))
      toastMsg(T.tRedeem(reward.l[s.lang]))
    },
    [toastMsg],
  )

  const addCart = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, cart: { ...s.cart, [id]: (s.cart[id] ?? 0) + 1 } }))
      toastMsg(tRef.current.tAdded)
    },
    [toastMsg],
  )

  const setQty = useCallback((id: string, delta: number) => {
    setState((s) => {
      const cart = { ...s.cart }
      const next = (cart[id] ?? 0) + delta
      if (next <= 0) delete cart[id]
      else cart[id] = next
      return { ...s, cart }
    })
  }, [])

  const pay = useCallback(() => {
    setState((s) => ({ ...s, ppBusy: true }))
    payTimer.current = setTimeout(() => {
      const s = stateRef.current
      const totals = totalsOf(s)
      const earn = Math.round(totals.total * pointsRules.earnPerDollar)
      setState((cur) => ({
        ...cur,
        ppBusy: false,
        pp: false,
        chkStep: 3,
        cart: {},
        pd: cur.pd + earn - totals.ptsUsed,
        order: {
          no: orderNoPrefix + Math.floor(1000 + Math.random() * 9000),
          total: usd(totals.total),
          earn,
          eta: shipping[s.ship].eta,
        },
      }))
    }, PAYPAL_MS)
  }, [])

  // ---------------------------------------------------------------- derived

  const lang: Lang = state.lang
  const condition = conditions[state.skinCondition] ?? conditions.dehydrated
  const weather = cities[state.city] ?? cities[defaultCity]
  const points = pointsOf(state)
  const totals = totalsOf(state)

  const metrics = metricDefs.map((def) => {
    const score = condition.m[def.k]
    return {
      nameL: def.n[lang],
      score,
      w: score + '%',
      color: score < 50 ? '#C25E43' : score < 70 ? '#B08133' : '#2E6B58',
      label: score < 50 ? t.low : score < 70 ? t.fair : t.good,
    }
  })

  /** The weakest axis drives both the routine's "target" step and its product. */
  const lowest = metricDefs.reduce((a, b) => (condition.m[a.k] <= condition.m[b.k] ? a : b))
  const targetProduct = products.find((p) => p.metric === lowest.k) ?? products[0]

  const toView = (p: Product): ProductView => {
    const matchN =
      p.metric === 'uv'
        ? Math.min(98, 58 + weather.uv * 4)
        : Math.min(98, 138 - condition.m[p.metric])
    return {
      id: p.id,
      brand: p.brand,
      name: p.name,
      kind: p.kind,
      ml: p.ml,
      grad: p.g,
      sub: p.sub[lang],
      why: p.why[lang],
      ing: p.ing,
      priceS: '$' + p.price,
      matchS: matchN + '%',
      matchN,
      open: () => setState((s) => ({ ...s, screen: 'detail', selId: p.id })),
      add: () => addCart(p.id),
    }
  }

  const all = products.map(toView).sort((a, b) => b.matchN - a.matchN)
  const byTag = new Map(products.map((p) => [p.id, p.tag]))
  const shopList = state.filter === 'All' ? all : all.filter((p) => byTag.get(p.id) === state.filter)
  const sel = all.find((p) => p.id === state.selId) ?? all[0]

  const chips = chipKeys.map((key: ChipKey) => ({
    key,
    label: chipLabels[key][lang],
    pick: () => setState((s) => ({ ...s, filter: key })),
    style:
      'cursor:pointer;white-space:nowrap;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:600;' +
      (state.filter === key
        ? 'background:#221C15;color:#F5F0E6'
        : 'background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234'),
  }))

  const toMissionView = (m: Mission): MissionView => {
    const done = !!state.done[m.id]
    return {
      pts: m.pts,
      label: m.l[lang],
      claim: () => claim(m),
      bg: done ? '#F1EEE6' : '#FFFFFF',
      boxBg: done ? '#2E6B58' : '#D8CFBF',
      mark: done ? '✓' : '',
      txtStyle: done ? 'color:#8A7D6C;text-decoration:line-through' : '',
    }
  }
  const dailyList = dailyMissions.map(toMissionView)
  const weeklyList = weeklyMissions.map(toMissionView)
  const dailyDone = dailyMissions.filter((m) => state.done[m.id]).length

  const rewardList: RewardView[] = rewards.map((r) => {
    const isRedeemed = !!state.redeemed[r.id]
    const affordable = points >= r.cost
    return {
      label: r.l[lang],
      redeem: () => redeem(r),
      btn: isRedeemed ? t.redeemed : r.cost + ' P',
      btnStyle: isRedeemed
        ? 'background:#EAF1EC;color:#2E6B58'
        : affordable
          ? 'background:#221C15;color:#F5F0E6'
          : 'background:#EFE9DD;color:#B0A490',
    }
  })

  let levelIndex = 0
  levels.forEach((level, i) => {
    if (points >= level[0]) levelIndex = i
  })
  const nextLevel = levels[levelIndex + 1]
  const levelPct = nextLevel
    ? Math.min(
        100,
        Math.round(((points - levels[levelIndex][0]) / (nextLevel[0] - levels[levelIndex][0])) * 100),
      ) + '%'
    : '100%'

  const humid = weather.h >= 70
  const dry = weather.h < 45
  const wAdvice =
    (humid ? t.advHumid(weather.h) : dry ? t.advDry(weather.h) : t.advMild) +
    (weather.uv >= 8 ? t.advUvHi(weather.uv) : weather.uv >= 6 ? t.advUvMid(weather.uv) : t.advUvLo)

  const amSteps: RoutineStep[] = [
    { n: 1, name: t.st1, note: t.st1n },
    { n: 2, name: humid ? t.st2h : t.st2d, note: t.st2n },
    { n: 3, name: t.target + ' ' + targetProduct.name, note: t.lowestNote + ' ' + lowest.n[lang] },
    { n: 4, name: humid ? t.st4h : t.st4d, note: humid ? t.st4hn(weather.h) : t.st4dn },
    {
      n: 5,
      name: 'SPF50+ PA++++' + (weather.uv >= 8 ? t.spfRe : ''),
      note: t.uvIn(weather.uv, state.city),
    },
  ]
  const pmSteps: RoutineStep[] = [
    { n: 1, name: t.pm1, note: humid ? t.pm1h : t.pm1n },
    { n: 2, name: t.pm2, note: t.pm2n },
    { n: 3, name: t.target + ' ' + targetProduct.name, note: t.pm3n },
    { n: 4, name: dry || condition.m.hydration < 60 ? t.pm4a : t.pm4b, note: t.pm4n },
  ]

  const pastScans = scanHistory.map((h) => ({
    date: h.date + ' · ' + t.scanN + ' #' + h.scanNo,
    type: h.typeKey === 'first' ? t.firstScan : condition.type[lang],
    score: condition.overall + h.offset,
    color: h.color,
  }))
  const history = state.scanned
    ? [
        {
          date: latestScanDate + ' · ' + t.latest,
          type: condition.type[lang],
          score: condition.overall,
          color: '#2E6B58',
        },
        ...pastScans,
      ]
    : pastScans

  const tabScreens: Screen[] = ['home', 'scan', 'shop', 'routine', 'missions']
  const tabs = tabScreens.map((id, i) => {
    const active = state.screen === id || (id === 'shop' && state.screen === 'detail')
    return {
      id,
      label: t.tabs[i],
      go: go(id),
      bar: active ? '#221C15' : 'transparent',
      color: active ? '#221C15' : '#A2957F',
    }
  })

  const cartItems = Object.entries(state.cart).map(([id, qty]) => {
    const p = all.find((x) => x.id === id)!
    const price = products.find((x) => x.id === id)!.price
    return {
      id,
      brand: p.brand,
      name: p.name,
      grad: p.grad,
      qty,
      lineS: usd(price * qty),
      inc: () => setQty(id, 1),
      dec: () => setQty(id, -1),
    }
  })

  return {
    state,
    t,
    lang,
    setLang: (value: Lang) => setState((s) => ({ ...s, lang: value })),

    // header / points
    pointsS: points.toLocaleString(),
    streakLine: t.streakLine(state.streak),
    hasCart: Object.keys(state.cart).length > 0,
    cartEmpty: Object.keys(state.cart).length === 0,
    cartCount: Object.values(state.cart).reduce((a, b) => a + b, 0),

    // navigation
    goHome: go('home'),
    goScan: go('scan'),
    goShop: go('shop'),
    goRoutine: go('routine'),
    goMissions: go('missions'),
    goMy: go('my'),
    goCart: go('cart'),
    goCheckout: () => setState((s) => ({ ...s, screen: 'checkout', chkStep: 1 })),

    // scan
    startScan,
    progress: state.progress,
    scanStatus:
      state.progress < 30 ? t.s1 : state.progress < 60 ? t.s2 : state.progress < 90 ? t.s3 : t.s4,
    overall: condition.overall,
    skinType: condition.type[lang],
    summary: condition.sum[lang],
    metrics,
    dialStyle:
      'width:132px;height:132px;border-radius:50%;padding:10px;box-sizing:border-box;background:conic-gradient(#2E6B58 ' +
      condition.overall * 3.6 +
      'deg,#E8E1D3 0deg)',
    dialSmStyle:
      'width:48px;height:48px;border-radius:50%;padding:4px;box-sizing:border-box;background:conic-gradient(#2E6B58 ' +
      condition.overall * 3.6 +
      'deg,#D5E2D9 0deg);flex-shrink:0',

    // shop
    homeRecs: all.slice(0, 4),
    shopList,
    chips,
    sel,

    // cart / checkout
    cartItems,
    subS: usd(totals.sub),
    shipS: usd(totals.ship),
    discS: '−' + usd(totals.disc),
    totalS: usd(totals.total),
    usePtsLine: t.usePts(totals.ptsUsed.toLocaleString(), usd(totals.disc)),
    earnPreview: Math.round((totals.sub + totals.ship) * pointsRules.earnPerDollar),
    shipName: shipping[state.ship].label,
    setName: (value: string) => setState((s) => ({ ...s, name: value })),
    setAddr: (value: string) => setState((s) => ({ ...s, addr: value })),
    setCountry: (value: string) => setState((s) => ({ ...s, country: value })),
    pickDhl: () => setState((s) => ({ ...s, ship: 'dhl' })),
    pickEms: () => setState((s) => ({ ...s, ship: 'ems' })),
    dhlBorder: state.ship === 'dhl' ? '#221C15' : '#ECE6DA',
    emsBorder: state.ship === 'ems' ? '#221C15' : '#ECE6DA',
    toPayment: () => setState((s) => ({ ...s, chkStep: 2 })),
    backShip: () => setState((s) => ({ ...s, chkStep: 1 })),
    togglePoints: () => setState((s) => ({ ...s, usePoints: !s.usePoints })),
    togBg: state.usePoints ? '#2E6B58' : '#D8CFBF',
    togLeft: state.usePoints ? '21px' : '3px',
    openPaypal: () => setState((s) => ({ ...s, pp: true })),
    closePaypal: () => setState((s) => ({ ...s, pp: false })),
    pay,

    // routine
    setCity: (value: string) => setState((s) => ({ ...s, city: value })),
    weather,
    uvColor: weather.uv >= 8 ? '#C25E43' : weather.uv >= 6 ? '#B08133' : '#2E6B58',
    wLine: weather.t + '°C · ' + t.humidity + ' ' + weather.h + '% · UV ' + weather.uv,
    wHint: humid ? t.hintHumid : dry ? t.hintDry : t.hintMild,
    wAdvice,
    amSteps,
    pmSteps,

    // missions / rewards
    dailyList,
    weeklyList,
    dailyDoneS: dailyDone + '/' + dailyMissions.length,
    rewardList,
    levelName: levels[levelIndex][1],
    nextLevelS: nextLevel
      ? t.toLv((nextLevel[0] - points).toLocaleString(), nextLevel[1])
      : t.maxLv,
    levelPct,

    // my page
    history,
    startingPoints: demoAccount.startingPoints,
    toggleNotif: () => setState((s) => ({ ...s, notif: !s.notif })),
    notifBg: state.notif ? '#2E6B58' : '#D8CFBF',
    notifLeft: state.notif ? '19px' : '3px',

    tabs,
  }
}

export type StoreValue = ReturnType<typeof useStoreValue>

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside <StoreProvider>')
  return value
}
