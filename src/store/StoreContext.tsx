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
import { cities, CURRENT_LOCATION, defaultCity } from '../data/cities'
import { orderNoPrefix, shipping } from '../data/commerce'
import { levels } from '../data/rewards'
import { conditions, metricDefs } from '../data/skin'
import { analyseSkin } from '../analysis/client'
import type { Lang, Weather } from '../data/types'
import { fetchWeather } from '../weather/remote'
import { useGeolocation } from '../weather/useGeolocation'
import { useCatalog } from '../catalog/CatalogContext'
import type { CatalogMission, CatalogProduct, CatalogReward } from '../catalog/types'
import { can, guestScanUsedToday, markGuestScanUsed, type Capability } from '../auth/capabilities'
import { useAuth } from '../auth/AuthContext'
import { chipKeys, chipLabels, type ChipKey } from '../i18n/chips'
import { authT } from '../i18n/auth'
import { routineT } from '../i18n/routine'
import { buildPlan } from '../routine/rules'
import { strings, type Strings } from '../i18n'
import { LOCAL_KEYS, readLocal, writeLocal } from '../lib/localStore'
import * as remote from './remote'
import {
  initialState,
  totalsOf,
  usd,
  type AuthMode,
  type ScanStep,
  type Screen,
  type StoreState,
} from './state'

const SCAN_TICK_MS = 70
const SCAN_TICK_STEP = 2
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

interface Prefs {
  lang: Lang
  city: string
}

function useStoreValue() {
  const auth = useAuth()
  const catalog = useCatalog()
  const geo = useGeolocation()
  const isMember = auth.isMember

  // Only live rows reach shoppers; an operator switching a product off removes
  // it from the shop on the next load.
  const products = catalog.products.filter((p) => p.active)
  const dailyMissions = catalog.missions.filter((m) => m.kind === 'daily' && m.active)
  const weeklyMissions = catalog.missions.filter((m) => m.kind === 'weekly' && m.active)
  const rewards = catalog.rewards.filter((r) => r.active)
  const settings = catalog.settings

  const [state, setState] = useState<StoreState>(() => {
    // UI preferences and a guest bag are restored before the first paint, so a
    // refresh does not visibly reset the app.
    const prefs = readLocal<Partial<Prefs>>(LOCAL_KEYS.prefs, {})
    return {
      ...initialState,
      lang: prefs.lang ?? initialState.lang,
      city: prefs.city ?? initialState.city,
      cart: readLocal<Record<string, number>>(LOCAL_KEYS.cart, {}),
      guestScanUsed: guestScanUsedToday(),
    }
  })

  const stateRef = useRef(state)
  stateRef.current = state
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dailyRef = useRef(dailyMissions)
  dailyRef.current = dailyMissions
  const productsRef = useRef(products)
  productsRef.current = products
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const [liveWeather, setLiveWeather] = useState<Weather | null>(null)

  const t = useMemo(() => strings(state.lang), [state.lang])
  const a = useMemo(() => authT(state.lang), [state.lang])
  const r = useMemo(() => routineT(state.lang), [state.lang])
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

  // ── preferences follow the visitor ────────────────────────────────────────

  useEffect(() => {
    writeLocal(LOCAL_KEYS.prefs, { lang: state.lang, city: state.city } satisfies Prefs)
  }, [state.lang, state.city])

  /** A guest's bag lives in the browser; a member's lives in Postgres. */
  useEffect(() => {
    if (!isMember) writeLocal(LOCAL_KEYS.cart, state.cart)
  }, [isMember, state.cart])

  // ── sign-in / sign-out ────────────────────────────────────────────────────

  const hydratedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!isMember || !auth.profile) {
      // Signed out: drop everything that belonged to the account and fall back
      // to the guest bag that is still in localStorage.
      if (hydratedFor.current !== null) {
        hydratedFor.current = null
        setState((s) => ({
          ...s,
          points: 0,
          streak: 0,
          done: {},
          redeemed: {},
          history: [],
          savedRoutineCount: 0,
          scanned: false,
          order: null,
          name: '',
          addr: '',
          cart: readLocal<Record<string, number>>(LOCAL_KEYS.cart, {}),
          guestScanUsed: guestScanUsedToday(),
          screen: 'home',
        }))
      }
      return
    }

    if (hydratedFor.current === auth.profile.id) return
    hydratedFor.current = auth.profile.id

    const profile = auth.profile
    let cancelled = false

    void (async () => {
      // Anything the visitor put in their bag before signing up comes with them.
      const guestCart = readLocal<Record<string, number>>(LOCAL_KEYS.cart, {})
      if (Object.keys(guestCart).length) {
        await remote.mergeGuestCart(guestCart)
        writeLocal(LOCAL_KEYS.cart, {})
      }

      const snap = await remote.loadMemberSnapshot()
      if (cancelled) return

      const done: Record<string, boolean> = {}
      for (const id of snap.claimedToday) done[id] = true
      const redeemed: Record<string, boolean> = {}
      for (const id of snap.redeemed) redeemed[id] = true

      setState((s) => ({
        ...s,
        points: profile.points,
        streak: profile.streak,
        name: profile.name,
        addr: profile.address,
        country: profile.country,
        lang: profile.language,
        city: profile.city,
        skinCondition: profile.skin_condition,
        notif: profile.routine_reminders,
        cart: snap.cart,
        done,
        redeemed,
        history: snap.scanHistory.map((h) => ({
          skinCondition: h.skin_condition,
          overall: h.overall,
          createdAt: h.created_at,
        })),
        savedRoutineCount: snap.savedRoutineCount,
        scanned: !!snap.latestScan,
        scanStep: snap.latestScan ? 'results' : 'intro',
        order: snap.latestOrder
          ? {
              no: snap.latestOrder.order_no,
              total: usd(Number(snap.latestOrder.total)),
              earn: snap.latestOrder.points_earned,
              eta: snap.latestOrder.eta,
            }
          : null,
      }))
    })()

    return () => {
      cancelled = true
    }
  }, [isMember, auth.profile])

  // ── live weather ──────────────────────────────────────────────────────────

  // Re-fetch whenever the place changes. A failure leaves liveWeather null, so
  // the screen falls back to the city's stored numbers rather than going blank.
  const geoCoords = geo.coords
  const selectedCity = state.city
  useEffect(() => {
    const place =
      selectedCity === CURRENT_LOCATION
        ? geoCoords
        : { lat: (cities[selectedCity] ?? cities[defaultCity]).lat, lon: (cities[selectedCity] ?? cities[defaultCity]).lon }
    if (!place) {
      setLiveWeather(null)
      return
    }

    let cancelled = false
    setLiveWeather(null)
    void fetchWeather(place.lat, place.lon).then((w) => {
      if (!cancelled) setLiveWeather(w)
    })
    return () => { cancelled = true }
  }, [selectedCity, geoCoords])

  // ── the membership gate ───────────────────────────────────────────────────

  const openGate = useCallback((capability: Capability) => {
    setState((s) => ({ ...s, gate: capability }))
  }, [])

  const closeGate = useCallback(() => setState((s) => ({ ...s, gate: null })), [])

  /** Run `action` if the visitor may, otherwise raise the signup prompt. */
  const guard = useCallback(
    (capability: Capability, action: () => void) => () => {
      if (can(capability, isMember)) action()
      else openGate(capability)
    },
    [isMember, openGate],
  )

  const go = useCallback((screen: Screen) => () => setState((s) => ({ ...s, screen })), [])

  const goAuth = useCallback(
    (mode: AuthMode = 'signup') =>
      setState((s) => ({
        ...s,
        screen: 'auth',
        authMode: mode,
        gate: null,
        returnTo: s.screen === 'auth' ? s.returnTo : s.screen,
      })),
    [],
  )

  const leaveAuth = useCallback(
    () => setState((s) => ({ ...s, screen: s.returnTo === 'auth' ? 'home' : s.returnTo })),
    [],
  )

  // ── scan ──────────────────────────────────────────────────────────────────

  const setPhoto = useCallback((photo: File | null) => {
    setState((s) => ({ ...s, photo }))
  }, [])

  /** Land on the results screen with a canned profile, clearly marked as such. */
  const finishWithDemo = useCallback(() => {
    const cond = conditions[stateRef.current.skinCondition]
    setState((cur) => ({
      ...cur,
      progress: 100,
      scanStep: 'results',
      scanned: true,
      scanIsReal: false,
      liveMetrics: null,
      liveOverall: null,
      liveSkinAge: null,
    }))

    // A demo score is not a measurement, so it does not go in the member's
    // history — that record is meant to show how their skin actually changed.
    if (!isMember) {
      markGuestScanUsed()
      setState((cur) => ({ ...cur, guestScanUsed: true }))
      toastMsg(a.guestScanNotice)
    }
    return cond
  }, [isMember, toastMsg, a])

  const startScan = useCallback(() => {
    const s = stateRef.current

    // Guests get one trial a day; the second attempt sells the signup instead.
    if (!isMember && s.guestScanUsed) {
      openGate('saveScan')
      return
    }

    if (scanTimer.current) clearInterval(scanTimer.current)
    setState((cur) => ({ ...cur, screen: 'scan', scanStep: 'scanning' as ScanStep, progress: 0 }))

    // The photo goes to the edge function while the progress bar runs, so the
    // animation covers the round trip instead of being followed by a wait.
    const photo = s.photo
    const pending = photo ? analyseSkin(photo) : null

    scanTimer.current = setInterval(() => {
      const next = stateRef.current.progress + SCAN_TICK_STEP
      if (next < 100) {
        setState((cur) => ({ ...cur, progress: next }))
        return
      }
      if (scanTimer.current) clearInterval(scanTimer.current)

      void (async () => {
        const outcome = pending ? await pending : null

        if (outcome?.kind === 'quota') {
          setState((cur) => ({ ...cur, scanStep: 'intro', progress: 0, guestScanUsed: !isMember }))
          toastMsg(outcome.message || a.guestScanUsed)
          return
        }

        if (outcome?.kind === 'ok') {
          const { result } = outcome
          setState((cur) => ({
            ...cur,
            progress: 100,
            scanStep: 'results',
            scanned: true,
            scanIsReal: true,
            skinCondition: result.condition,
            liveMetrics: result.metrics,
            liveOverall: result.overall,
            liveSkinAge: result.skinAge,
            history: result.saved
              ? [
                  {
                    skinCondition: result.condition,
                    overall: result.overall,
                    createdAt: new Date().toISOString(),
                  },
                  ...cur.history,
                ]
              : cur.history,
          }))
          if (!isMember) {
            markGuestScanUsed()
            setState((cur) => ({ ...cur, guestScanUsed: true }))
          }
          return
        }

        if (outcome?.kind === 'failed' && outcome.message) toastMsg(outcome.message)

        // No photo, vendor not wired up, or the call failed: show the demo
        // profile rather than a dead end, labelled so nobody mistakes it.
        finishWithDemo()
      })()
    }, SCAN_TICK_MS)
  }, [isMember, openGate, toastMsg, a, finishWithDemo])

  // ── missions and rewards ──────────────────────────────────────────────────

  const claim = useCallback(
    (mission: CatalogMission) => {
      if (!isMember) {
        openGate('claimMission')
        return
      }
      const s = stateRef.current
      if (s.done[mission.id]) return
      const T = tRef.current

      void (async () => {
        const res = await remote.claimMission(mission.id, mission.pts, stateRef.current.points)
        if (!res.ok) return

        const done = { ...stateRef.current.done, [mission.id]: true }
        let streak = stateRef.current.streak
        let msg = T.tEarn(mission.pts)

        // Clearing the last daily mission advances the streak.
        if (dailyMissions.every((d) => done[d.id])) {
          streak += 1
          msg = T.tStreak(mission.pts, streak)
          await remote.bumpStreak(streak)
        }

        setState((cur) => ({ ...cur, done, points: res.points, streak }))
        void auth.refreshProfile()
        toastMsg(msg)
      })()
    },
    [isMember, openGate, toastMsg, auth],
  )

  const redeem = useCallback(
    (reward: CatalogReward) => {
      if (!isMember) {
        openGate('redeem')
        return
      }
      const s = stateRef.current
      if (s.redeemed[reward.id]) return
      const T = tRef.current

      if (s.points < reward.cost) {
        toastMsg(T.tNoPts)
        return
      }

      void (async () => {
        const res = await remote.redeemReward(reward.id, reward.cost, stateRef.current.points)
        if (!res.ok) {
          toastMsg(T.tNoPts)
          return
        }
        setState((cur) => ({
          ...cur,
          redeemed: { ...cur.redeemed, [reward.id]: true },
          points: res.points,
        }))
        void auth.refreshProfile()
        toastMsg(T.tRedeem(reward.l[stateRef.current.lang]))
      })()
    },
    [isMember, openGate, toastMsg, auth],
  )

  // ── cart ──────────────────────────────────────────────────────────────────

  const addCart = useCallback(
    (id: string) => {
      setState((s) => {
        const qty = (s.cart[id] ?? 0) + 1
        if (isMember) void remote.upsertCartItem(id, qty)
        return { ...s, cart: { ...s.cart, [id]: qty } }
      })
      toastMsg(tRef.current.tAdded)
    },
    [isMember, toastMsg],
  )

  const setQty = useCallback(
    (id: string, delta: number) => {
      setState((s) => {
        const cart = { ...s.cart }
        const next = (cart[id] ?? 0) + delta
        if (next <= 0) {
          delete cart[id]
          if (isMember) void remote.removeCartItem(id)
        } else {
          cart[id] = next
          if (isMember) void remote.upsertCartItem(id, next)
        }
        return { ...s, cart }
      })
    },
    [isMember],
  )

  // ── checkout ──────────────────────────────────────────────────────────────

  const pay = useCallback(() => {
    setState((s) => ({ ...s, ppBusy: true }))
    payTimer.current = setTimeout(() => {
      void (async () => {
        const s = stateRef.current
        const totals = totalsOf(s, productsRef.current, settingsRef.current)
        const earn = Math.round(totals.total * settingsRef.current.earnPerDollar)
        const orderNo = orderNoPrefix + Math.floor(1000 + Math.random() * 9000)
        const eta = shipping[s.ship].eta

        const res = await remote.placeOrder({
          orderNo,
          subtotal: totals.sub,
          shipping: totals.ship,
          pointsUsed: totals.ptsUsed,
          total: totals.total,
          pointsEarned: earn,
          shipMethod: s.ship,
          eta,
          name: s.name,
          country: s.country,
          address: s.addr,
          cart: s.cart,
          currentPoints: s.points,
        })

        setState((cur) => ({
          ...cur,
          ppBusy: false,
          pp: false,
          chkStep: 3,
          cart: {},
          points: res.points,
          order: { no: orderNo, total: usd(totals.total), earn, eta },
        }))
        void auth.refreshProfile()
      })()
    }, PAYPAL_MS)
  }, [auth])

  // ── derived ───────────────────────────────────────────────────────────────

  const lang: Lang = state.lang
  const condition = conditions[state.skinCondition] ?? conditions.dehydrated

  const usingLocation = state.city === CURRENT_LOCATION
  const fallbackCity = cities[state.city] ?? cities[defaultCity]

  // Live reading when we have one; the city's stored numbers until then.
  const weather: Weather = liveWeather ?? { t: fallbackCity.t, h: fallbackCity.h, uv: fallbackCity.uv }
  const placeLabel = usingLocation ? a.currentLocation : state.city
  const points = state.points
  const totals = totalsOf(state, products, settings)

  const liveMetrics = state.liveMetrics
  const overallScore = state.liveOverall ?? condition.overall

  const metrics = metricDefs.map((def) => {
    const score = liveMetrics?.[def.k] ?? condition.m[def.k]
    return {
      nameL: def.n[lang],
      score,
      w: score + '%',
      color: score < 50 ? '#C25E43' : score < 70 ? '#B08133' : '#2E6B58',
      label: score < 50 ? t.low : score < 70 ? t.fair : t.good,
    }
  })

  const scoreOf = (k: (typeof metricDefs)[number]['k']) => liveMetrics?.[k] ?? condition.m[k]
  const lowest = metricDefs.reduce((x, y) => (scoreOf(x.k) <= scoreOf(y.k) ? x : y))
  const targetProduct = products.find((p) => p.metric === lowest.k) ?? products[0]

  const toView = (p: CatalogProduct): ProductView => {
    const matchN =
      p.metric === 'uv'
        ? Math.min(98, 58 + weather.uv * 4)
        : Math.min(98, 138 - scoreOf(p.metric))
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

  const all = products.map(toView).sort((x, y) => y.matchN - x.matchN)
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

  const toMissionView = (m: CatalogMission): MissionView => {
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

  // Every step below is decided by src/routine/rules.ts, which owns the
  // thresholds and their rationale. Nothing here re-derives them.
  const plan = buildPlan(weather, condition, lowest.k)

  const bands = {
    humidity: { label: r.band.humidity[plan.humidity], why: r.why.humidity[plan.humidity], value: weather.h + '%' },
    uv: { label: r.band.uv[plan.uv], why: r.why.uv[plan.uv], value: String(weather.uv) },
    temp: { label: r.band.temp[plan.temp], why: r.why.temp[plan.temp], value: weather.t + '°' },
  }

  // The advice block is the three explanations, in the order they matter.
  const wAdvice = [bands.humidity.why, bands.uv.why, bands.temp.why].join(' ')

  const amSteps: RoutineStep[] = [
    { n: 1, name: r.step.amCleanse[plan.am.cleanse], note: r.note.amCleanse },
    { n: 2, name: r.step.amToner[plan.am.toner], note: r.note.amToner },
    {
      n: 3,
      name: r.step.amTreatment + ': ' + targetProduct.name,
      note: r.note.weakest(lowest.n[lang]),
    },
    {
      n: 4,
      name: r.step.amMoisturiser[plan.am.moisturiser],
      note: bands.humidity.label + ' · ' + bands.humidity.value,
    },
    {
      n: 5,
      name: r.step.amSpf[plan.am.spf],
      note: 'UV ' + weather.uv + ' · ' + bands.uv.label,
    },
  ]
  const pmSteps: RoutineStep[] = [
    {
      n: 1,
      name: r.step.pmCleanse[plan.pm.cleanse],
      note: bands.temp.label + ' · ' + bands.temp.value,
    },
    { n: 2, name: r.step.pmEssence, note: r.note.pmEssence },
    {
      n: 3,
      name: r.step.pmTreatment + ': ' + targetProduct.name,
      note: r.note.pmTreatment,
    },
    {
      n: 4,
      name: r.step.pmNight[plan.pm.night],
      note: bands.humidity.label + ' · ' + bands.humidity.value,
    },
  ]

  const saveCurrentRoutine = () => {
    void (async () => {
      const ok = await remote.saveRoutine({
        city: placeLabel,
        skinCondition: state.skinCondition,
        temp: weather.t,
        humidity: weather.h,
        uv: weather.uv,
        advice: wAdvice,
        amSteps,
        pmSteps,
      })
      if (ok) {
        setState((s) => ({ ...s, savedRoutineCount: s.savedRoutineCount + 1 }))
        toastMsg(a.routineSaved)
      }
    })()
  }

  const history = state.history.map((h) => {
    const cond = conditions[h.skinCondition] ?? condition
    const date = new Date(h.createdAt)
    return {
      date: date.toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
        month: 'short',
        day: 'numeric',
      }),
      type: cond.type[lang],
      score: h.overall,
      color: h.overall < 50 ? '#C25E43' : h.overall < 70 ? '#B08133' : '#2E6B58',
    }
  })

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
    const p = all.find((x) => x.id === id)
    const price = products.find((x) => x.id === id)?.price ?? 0
    return {
      id,
      brand: p?.brand ?? '',
      name: p?.name ?? '',
      grad: p?.grad ?? '',
      qty,
      lineS: usd(price * qty),
      inc: () => setQty(id, 1),
      dec: () => setQty(id, -1),
    }
  })

  return {
    state,
    t,
    a,
    lang,
    isMember,
    catalogLoading: catalog.loading,
    authLoading: auth.loading,
    profile: auth.profile,
    signOut: () => void auth.signOut(),
    setLang: (value: Lang) => {
      setState((s) => ({ ...s, lang: value }))
      if (isMember) void auth.updateProfile({ language: value })
    },

    // membership gate
    gate: state.gate,
    closeGate,
    goAuth,
    leaveAuth,
    guard,
    can: (capability: Capability) => can(capability, isMember),

    pointsS: points.toLocaleString(),
    streakLine: t.streakLine(state.streak),
    hasCart: Object.keys(state.cart).length > 0,
    cartEmpty: Object.keys(state.cart).length === 0,
    cartCount: Object.values(state.cart).reduce((x, y) => x + y, 0),

    goHome: go('home'),
    goScan: go('scan'),
    goShop: go('shop'),
    goRoutine: go('routine'),
    goMissions: go('missions'),
    goMy: guard('myPage', () => setState((s) => ({ ...s, screen: 'my' }))),
    goCart: go('cart'),
    goSupport: guard('myPage', () => setState((s) => ({ ...s, screen: 'support' }))),
    goCheckout: guard('checkout', () => setState((s) => ({ ...s, screen: 'checkout', chkStep: 1 }))),

    startScan,
    progress: state.progress,
    scanStatus:
      state.progress < 30 ? t.s1 : state.progress < 60 ? t.s2 : state.progress < 90 ? t.s3 : t.s4,
    guestScanUsed: state.guestScanUsed,
    overall: overallScore,
    scanIsReal: state.scanIsReal,
    skinAge: state.liveSkinAge,
    setPhoto,
    skinType: condition.type[lang],
    summary: condition.sum[lang],
    metrics,
    dialStyle:
      'width:132px;height:132px;border-radius:50%;padding:10px;box-sizing:border-box;background:conic-gradient(#2E6B58 ' +
      overallScore * 3.6 +
      'deg,#E8E1D3 0deg)',
    dialSmStyle:
      'width:48px;height:48px;border-radius:50%;padding:4px;box-sizing:border-box;background:conic-gradient(#2E6B58 ' +
      overallScore * 3.6 +
      'deg,#D5E2D9 0deg);flex-shrink:0',

    homeRecs: all.slice(0, 4),
    shopList,
    chips,
    sel,

    cartItems,
    subS: usd(totals.sub),
    shipS: usd(totals.ship),
    discS: '−' + usd(totals.disc),
    totalS: usd(totals.total),
    usePtsLine: t.usePts(totals.ptsUsed.toLocaleString(), usd(totals.disc)),
    earnPreview: Math.round((totals.sub + totals.ship) * settings.earnPerDollar),
    shipName: shipping[state.ship].label,
    setName: (value: string) => setState((s) => ({ ...s, name: value })),
    setAddr: (value: string) => setState((s) => ({ ...s, addr: value })),
    setCountry: (value: string) => setState((s) => ({ ...s, country: value })),
    pickDhl: () => setState((s) => ({ ...s, ship: 'dhl' })),
    pickEms: () => setState((s) => ({ ...s, ship: 'ems' })),
    dhlBorder: state.ship === 'dhl' ? '#221C15' : '#ECE6DA',
    emsBorder: state.ship === 'ems' ? '#221C15' : '#ECE6DA',
    toPayment: () => {
      if (isMember) void auth.updateProfile({ name: state.name, address: state.addr, country: state.country })
      setState((s) => ({ ...s, chkStep: 2 }))
    },
    backShip: () => setState((s) => ({ ...s, chkStep: 1 })),
    togglePoints: () => setState((s) => ({ ...s, usePoints: !s.usePoints })),
    togBg: state.usePoints ? '#2E6B58' : '#D8CFBF',
    togLeft: state.usePoints ? '21px' : '3px',
    openPaypal: () => setState((s) => ({ ...s, pp: true })),
    closePaypal: () => setState((s) => ({ ...s, pp: false })),
    pay,

    setCity: (value: string) => {
      setState((s) => ({ ...s, city: value }))
      // "current location" is a device fact, not a saved preference.
      if (isMember && value !== CURRENT_LOCATION) void auth.updateProfile({ city: value })
    },
    usingLocation,
    placeLabel,
    geoStatus: geo.status,
    requestLocation: () => {
      setState((s) => ({ ...s, city: CURRENT_LOCATION }))
      geo.request()
    },
    clearLocation: () => {
      geo.clear()
      setState((s) => ({ ...s, city: defaultCity }))
    },
    locationCoords: usingLocation ? geo.coords : null,
    weatherIsLive: liveWeather !== null,
    weather,
    uvColor: plan.uv === 'extreme' || plan.uv === 'veryHigh' ? '#C25E43' : plan.uv === 'high' ? '#B08133' : '#2E6B58',
    wLine: weather.t + '°C · ' + t.humidity + ' ' + weather.h + '% · UV ' + weather.uv,
    wHint: bands.humidity.why,
    wAdvice,
    bands,
    basisTitle: r.basis,
    basisHint: r.basisHint,
    amSteps,
    pmSteps,
    saveRoutine: guard('saveRoutine', saveCurrentRoutine),
    savedRoutineCount: state.savedRoutineCount,

    dailyList,
    weeklyList,
    dailyDoneS: dailyDone + '/' + dailyMissions.length,
    rewardList,
    levelName: levels[levelIndex][1],
    nextLevelS: nextLevel ? t.toLv((nextLevel[0] - points).toLocaleString(), nextLevel[1]) : t.maxLv,
    levelPct,

    history,
    toggleNotif: () => {
      const next = !state.notif
      setState((s) => ({ ...s, notif: next }))
      if (isMember) void auth.updateProfile({ routine_reminders: next })
    },
    notifBg: state.notif ? '#2E6B58' : '#D8CFBF',
    notifLeft: state.notif ? '19px' : '3px',

    tabs,
    toastMsg,
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
