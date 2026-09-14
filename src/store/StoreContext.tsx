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
import { checkPhoto } from '../analysis/imageCheck'
import type { Lang, MetricKey, Weather } from '../data/types'
import { fetchWeather } from '../weather/remote'
import { useGeolocation } from '../weather/useGeolocation'
import { useCatalog } from '../catalog/CatalogContext'
import type { CatalogMission, CatalogProduct, CatalogReward } from '../catalog/types'
import { can, type Capability } from '../auth/capabilities'
import { useAuth } from '../auth/AuthContext'
import { chipKeys, chipLabels, type ChipKey } from '../i18n/chips'
import { authT } from '../i18n/auth'
import { routineT } from '../i18n/routine'
import { buildPlan } from '../routine/rules'
import { fallingAxes, rank, type ReasonKind } from '../routine/recommend'
import { buildReport, MOVE_THRESHOLD, trendSeries } from '../insights/report'
import { describeAll } from '../insights/describe'
import { insightT } from '../i18n/insights'
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
  /** Why this product is being recommended — at most two, strongest first. */
  reasons: string[]
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

/** Contributions every product has, so they explain no ranking on their own. */
const BASE_REASONS = new Set<ReasonKind>(['axisNeed', 'uvLoad'])

/**
 * Up to two reasons for a card, most informative first.
 *
 * A modifier — dry air, a falling axis, the focus of this cycle — is what moved
 * a product up or down the list, so it leads. The base need follows as context.
 * Any more than two and the card stops being a reason and becomes a wall.
 */
function orderedReasons(reasons: { kind: ReasonKind; points: number }[]): ReasonKind[] {
  const modifiers = reasons.filter((r) => !BASE_REASONS.has(r.kind))
  const base = reasons.filter((r) => BASE_REASONS.has(r.kind))
  return [...modifiers, ...base].slice(0, 2).map((r) => r.kind)
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
  /**
   * The reading as of this render. `startScan` is memoised and would otherwise
   * close over whatever the weather was when it was created, which is usually
   * the fallback rather than the live value.
   */
  const weatherRef = useRef<Weather>({ t: 0, h: 0, uv: 0 })

  const t = useMemo(() => strings(state.lang), [state.lang])
  const a = useMemo(() => authT(state.lang), [state.lang])
  const r = useMemo(() => routineT(state.lang), [state.lang])
  const ins = useMemo(() => insightT(state.lang), [state.lang])
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

  /**
   * The latest profile, without making it an effect dependency.
   *
   * `loadProfile` hands back a fresh object on every auth event — the initial
   * session, the sign-in, each token refresh — so depending on the object
   * itself re-ran the hydration effect while its own snapshot request was
   * still in flight. The cleanup cancelled that request, the re-run saw the
   * same member id and returned early, and the account's history, bag and
   * saved routines were never applied: the member signed in and the app told
   * them they had never scanned. Keying on the id alone is what fixes it.
   */
  const profileRef = useRef(auth.profile)
  profileRef.current = auth.profile

  const memberId = isMember ? (auth.profile?.id ?? null) : null

  // Signed out. Keyed on the session rather than the profile, so a profile
  // that is briefly missing — mid-refresh, or after a failed re-read — does
  // not read as a sign-out and wipe an account that is still signed in.
  useEffect(() => {
    if (isMember || hydratedFor.current === null) return
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
      screen: 'home',
    }))
  }, [isMember])

  useEffect(() => {
    if (!memberId) return
    if (hydratedFor.current === memberId) return
    hydratedFor.current = memberId

    let cancelled = false

    void (async () => {
      // Anything the visitor put in their bag before signing up comes with them.
      const guestCart = readLocal<Record<string, number>>(LOCAL_KEYS.cart, {})
      if (Object.keys(guestCart).length) {
        await remote.mergeGuestCart(guestCart)
        writeLocal(LOCAL_KEYS.cart, {})
      }

      const snap = await remote.loadMemberSnapshot()
      const profile = profileRef.current
      // Let the next run try again rather than leaving the member looking like
      // someone with no history: a claimed-but-unapplied hydration is the bug
      // this whole block exists to prevent.
      if (cancelled || !profile || profile.id !== memberId) {
        if (hydratedFor.current === memberId) hydratedFor.current = null
        return
      }

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
        // "Current location" is a device fact and is never written to the
        // profile, so the saved city would otherwise undo the choice on every
        // sign-in — the visitor asked for wherever they are, and signing in is
        // not them changing their mind.
        city: s.city === CURRENT_LOCATION ? s.city : profile.city,
        notif: profile.routine_reminders,
        cart: snap.cart,
        done,
        redeemed,
        history: snap.scanHistory,
        savedRoutineCount: snap.savedRoutineCount,
        scanned: !!snap.latestScan,
        scanStep: snap.latestScan ? 'results' : 'intro',

        // Put the member's last real measurement back on screen.
        //
        // Without this the scores were saved and then never read: coming back
        // to the app showed the canned profile for their condition, labelled
        // "sample result", as though the analysis they paid for had been
        // thrown away. The overlays are not restored — those are short-lived
        // vendor URLs that expire, and are not ours to keep.
        skinCondition: snap.latestScan?.skinCondition ?? profile.skin_condition,
        scanIsReal: !!snap.latestScan?.metrics,
        liveMetrics: snap.latestScan?.metrics ?? null,
        liveOverall: snap.latestScan?.overall ?? null,
        liveSkinAge: snap.latestScan?.skinAge ?? null,
        liveOiliness: snap.latestScan?.oiliness ?? null,
        liveSkinType: snap.latestScan?.skinType ?? null,
        liveVisuals: null,
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
  }, [memberId])

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

  /**
   * Take the selfie and check it before it can cost anything.
   *
   * The vendor bills per call and rejects photos that miss their spec, so the
   * cheap checks a browser can do — format, size, pixel dimensions — run here.
   * The verdict is stored rather than acted on immediately: the customer sees
   * it under the photo, and `startScan` refuses to send a photo with a problem.
   */
  const setPhoto = useCallback((photo: File | null) => {
    setState((s) => ({ ...s, photo, photoCheck: null }))
    if (!photo) return

    void (async () => {
      const check = await checkPhoto(photo)
      // A newer photo may have landed while we were decoding this one; its own
      // check is authoritative, so drop this stale verdict.
      setState((s) => (s.photo === photo ? { ...s, photoCheck: check } : s))
    })()
  }, [])

  /**
   * Stop on a failure screen instead of quietly showing the canned profile.
   *
   * The old behaviour turned every failure into a plausible-looking result with
   * a small "sample" badge, which is the worst of both: the customer believes
   * they were analysed, and the one time they read the badge they stop trusting
   * the scores that were real.
   */
  const finishWithFailure = useCallback((message: string) => {
    setState((cur) => ({
      ...cur,
      progress: 100,
      scanStep: 'failed',
      scanError: message,
      scanned: false,
      scanIsReal: false,
    }))
  }, [])

  const startScan = useCallback(() => {
    const s = stateRef.current

    // Members only. Every analysis is a billed call whose value is the record
    // it leaves, so a guest is sent to sign up rather than handed a number they
    // cannot keep.
    if (!isMember) {
      openGate('scan')
      return
    }

    // No photo, no scan. This used to run the progress bar and land on the
    // canned profile, which is how someone ends up believing the app measured
    // a face it never saw.
    if (!s.photo) {
      toastMsg(a.photoRequired)
      return
    }

    // A photo the vendor would reject must not start a scan: the customer
    // would wait out the whole progress bar to be told something we already
    // knew, and a guest would spend their one daily try on it.
    const problem = s.photoCheck?.problem
    if (problem) {
      toastMsg(a.photoError[problem])
      return
    }

    if (scanTimer.current) clearInterval(scanTimer.current)
    setState((cur) => ({ ...cur, screen: 'scan', scanStep: 'scanning' as ScanStep, progress: 0 }))

    // The photo goes to the edge function while the progress bar runs, so the
    // animation covers the round trip instead of being followed by a wait.
    const photo = s.photo
    // The weather goes with the photo so the saved scan records the conditions
    // it was taken in — see the `weather` column on `scans`.
    const weather = weatherRef.current
    const pending = photo ? analyseSkin(photo, weather) : null

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
          setState((cur) => ({ ...cur, scanStep: 'intro', progress: 0 }))
          toastMsg(outcome.message || a.dailyLimitReached)
          return
        }

        // The session expired somewhere between opening the screen and pressing
        // the button. Nothing was billed and nothing is broken — they just need
        // to sign in again, so say that rather than reporting a failure.
        if (outcome?.kind === 'membersOnly') {
          setState((cur) => ({ ...cur, scanStep: 'intro', progress: 0 }))
          openGate('scan')
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
            liveOiliness: result.oiliness,
            liveSkinType: result.skinType,
            liveVisuals: result.visuals,
            // Show the scan in the history immediately rather than waiting for
            // the next snapshot; the server has already written the same row.
            history: result.saved
              ? [
                  {
                    skinCondition: result.condition,
                    overall: result.overall,
                    createdAt: new Date().toISOString(),
                    metrics: result.metrics,
                    skinAge: result.skinAge,
                    oiliness: result.oiliness,
                    skinType: result.skinType,
                    weather,
                  },
                  ...cur.history,
                ]
              : cur.history,
          }))
          return
        }

        // The vendor refused the photo. Send them back to pick another one
        // with the reason attached, rather than to a demo score they did not
        // ask for — this one is fixable.
        if (outcome?.kind === 'photo') {
          setState((cur) => ({
            ...cur,
            scanStep: 'intro',
            progress: 0,
            photoCheck: { ok: false, problem: outcome.key },
          }))
          toastMsg(a.photoError[outcome.key])
          return
        }

        // Everything left is a failure. Say so and offer another go — never a
        // score that was not measured.
        finishWithFailure(
          outcome?.kind === 'notConfigured' ? a.scanUnavailable : a.analysisFailed,
        )
      })()
    }, SCAN_TICK_MS)
  }, [isMember, openGate, toastMsg, a, finishWithFailure])

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

  /**
   * The live reading, or a neutral placeholder while one is in flight.
   *
   * Cities no longer carry stored weather. They used to, as a fallback, which
   * meant a routine could be built from a temperature invented months earlier
   * with nothing on screen admitting it — a confident answer from stale data is
   * worse than an obvious gap. `weatherIsLive` drives that admission, and the
   * placeholder below only exists so the layout has numbers to render before
   * the fetch lands.
   */
  const weather: Weather = liveWeather ?? { t: 20, h: 50, uv: 3 }
  weatherRef.current = weather
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

  /**
   * The scores every downstream decision reads: the live scan when there is
   * one, the canned profile otherwise. Everything — the routine, the report and
   * the recommendations — reads this single map, so they can never disagree
   * about what the customer's skin actually measured.
   */
  const effectiveMetrics = liveMetrics ?? condition.m
  const scoreOf = (k: MetricKey) => effectiveMetrics[k]
  const lowest = metricDefs.reduce((x, y) => (scoreOf(x.k) <= scoreOf(y.k) ? x : y))

  // What the numbers say, beyond the bars themselves.
  const report = buildReport({
    metrics: effectiveMetrics,
    overall: overallScore,
    skinAge: state.liveSkinAge,
    oiliness: state.liveOiliness,
    skinType: state.liveSkinType,
    weather,
    previous: state.history.slice(state.scanIsReal ? 1 : 0),
  })

  const previousMetrics = state.history.find((h) => h.metrics)?.metrics ?? null
  const recommendations = new Map(
    rank(products, {
      metrics: effectiveMetrics,
      weather,
      focus: report.insights.some((i) => i.kind === 'weakest') ? report.focus : null,
      falling: fallingAxes(effectiveMetrics, previousMetrics, MOVE_THRESHOLD),
      condition: state.skinCondition,
    }).map((r) => [r.id, r]),
  )

  const targetProduct = products.find((p) => p.metric === lowest.k) ?? products[0]

  const toView = (p: CatalogProduct): ProductView => {
    const match = recommendations.get(p.id)
    const matchN = match?.score ?? 50
    return {
      // The base need is always the largest contribution and every product has
      // one, so leading with it tells the customer nothing about why *this*
      // product is where it is. Put what actually distinguishes it first.
      reasons: orderedReasons(match?.reasons ?? []).map((kind) => ins.reason[kind]),
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
  //
  // This takes `effectiveMetrics`, not the canned condition: it used to read
  // the sample profile's hydration, which meant a real scan of 42 still got a
  // routine built for whatever the demo said — the analysis was paid for and
  // then partly ignored.
  const plan = buildPlan(weather, effectiveMetrics, lowest.k)

  const bands = {
    humidity: { label: r.band.humidity[plan.dryness], why: r.why.humidity[plan.dryness], value: weather.h + '%' },
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

  const scoreColour = (n: number) => (n < 50 ? '#C25E43' : n < 70 ? '#B08133' : '#2E6B58')
  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
      month: 'short',
      day: 'numeric',
    })

  const history = state.history.map((h) => ({
    date: shortDate(h.createdAt),
    type: (conditions[h.skinCondition] ?? condition).type[lang],
    score: h.overall,
    color: scoreColour(h.overall),
  }))

  // ── the report ────────────────────────────────────────────────────────────

  const reportLines = describeAll(report.insights, lang)

  /**
   * The history as a chart-ready series.
   *
   * Bar heights are relative to the range actually present rather than to
   * 0–100: skin scores cluster in a narrow band, and a fixed axis flattens a
   * real 15-point swing into a row of near-identical bars.
   */
  const trend = (() => {
    const points = trendSeries(state.history)
    if (points.length < 2) return null

    const scores = points.map((p) => p.overall)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const span = Math.max(max - min, 1)

    return {
      title: ins.trendTitle,
      sub: ins.trendSub,
      count: ins.scanCount(points.length),
      points: points.map((p) => ({
        key: p.at,
        date: shortDate(p.at),
        score: p.overall,
        // 18% floor so the lowest bar is still a bar and not a hairline.
        height: Math.round(18 + ((p.overall - min) / span) * 72) + '%',
        color: scoreColour(p.overall),
        humidity: p.humidity === null ? '' : p.humidity + '%',
      })),
    }
  })()

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
    goStories: go('stories'),
    goMy: guard('myPage', () => setState((s) => ({ ...s, screen: 'my' }))),
    goCart: go('cart'),
    goSupport: guard('myPage', () => setState((s) => ({ ...s, screen: 'support' }))),
    goCheckout: guard('checkout', () => setState((s) => ({ ...s, screen: 'checkout', chkStep: 1 }))),

    startScan,
    progress: state.progress,
    scanError: state.scanError,
    /** Back to the camera with the failed photo cleared, ready for another go. */
    retryScan: () => setState((cur) => ({
      ...cur,
      scanStep: 'intro',
      progress: 0,
      scanError: '',
      photo: null,
      photoCheck: null,
    })),
    scanStatus:
      state.progress < 30 ? t.s1 : state.progress < 60 ? t.s2 : state.progress < 90 ? t.s3 : t.s4,
    overall: overallScore,
    scanIsReal: state.scanIsReal,
    skinAge: state.liveSkinAge,
    setPhoto,
    photo: state.photo,
    photoCheck: state.photoCheck,
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
    report: reportLines,
    visuals: state.liveVisuals,
    plan,
    weatherNow: weather,
    basisT: ins.basis,
    mapT: ins.map,
    detailT: ins.detail,
    /** The vendor's own per-zone skin type, for the detailed report. */
    skinTypeReading: state.liveSkinType,
    reportTitle: ins.reportTitle,
    reportSub: ins.reportSub,
    whyThis: ins.whyThis,
    trend,
    noTrend: ins.noTrend,
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
