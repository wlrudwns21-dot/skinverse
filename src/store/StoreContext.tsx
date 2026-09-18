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
import { deviceTimezone, useAuth } from '../auth/AuthContext'
import { chipKeys, chipLabels, type ChipKey } from '../i18n/chips'
import { authT } from '../i18n/auth'
import { routineT } from '../i18n/routine'
import { buildPlan } from '../routine/rules'
import { fallingAxes, rank, type ReasonKind } from '../routine/recommend'
import {
  axisChanges,
  axisSeries,
  buildReport,
  cumulative,
  MOVE_THRESHOLD,
  trendSeries,
} from '../insights/report'
import {
  adherenceFor,
  checkId,
  dayOffset,
  isOpen,
  localDay,
  openSlot,
  overallRate,
  streakOf,
  type CheckLog,
  type Checkable,
  type Slot,
} from '../routine/checklist'
import { MAX_EXTRAS_PER_SLOT, presetById, presetsFor } from '../routine/extras'
import { describeAll } from '../insights/describe'
import { insightT } from '../i18n/insights'
import { strings, type Strings } from '../i18n'
import { LOCAL_KEYS, readLocal, writeLocal } from '../lib/localStore'
import { capturePaypalOrder, openPaypalOrder } from '../payments/paypal'
import { arrivalError, confirmedSignup } from '../auth/landing'
import { airBand, isPolluted, pollutionLoad } from '../routine/air'
import { daysBetween, type Ownership } from '../routine/ownership'
import { display as showMoney, isSettlement, SETTLEMENT } from '../money/fx'
import * as remote from './remote'
import {
  initialState,
  totalsOf,
  usd,
  type AuthMode,
  type LegalDocId,
  type ScanStep,
  type Screen,
  type StoreState,
} from './state'

const SCAN_TICK_MS = 70
const SCAN_TICK_STEP = 2
const TOAST_MS = 2600

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
  /**
   * Stable across plan changes, unlike the name.
   *
   * The weather can turn the morning cleanse from a gel into a balm overnight;
   * it is still the morning cleanse, and a tick against it should survive. Key
   * on the step, never on the variant the engine picked today.
   */
  key: string
  name: string
  note: string
}

/** A routine step as the checklist needs it: ticked, and whether it can be. */
export interface RoutineStepView extends RoutineStep {
  slot: Slot
  done: boolean
  /** False outside the slot's window — shown, but not claimable. */
  open: boolean
  /** Added by the member rather than the engine, so it can be removed. */
  extraId: string | null
  /**
   * Whether the row responds to a tap at all. Claiming a step needs its window
   * open; undoing one never does — an accidental tap at 11:59 should not be
   * stuck on the record until tomorrow, and unticking can only lower a score.
   */
  canToggle: boolean
  toggle: () => void
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
  const rates = catalog.rates

  /**
   * A settlement amount, written in the currency the customer picked.
   *
   * Everything financial this context receives is already in the settlement
   * currency — the server decided it — so this only ever changes how a number
   * looks, never what it is.
   */
  const money = (amount: number) => showMoney(amount, rates, state.currency)

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
  /**
   * The order reserved but not yet paid for.
   *
   * A ref rather than state: it lives between the PayPal button's callbacks,
   * which the SDK holds from the moment it renders — re-rendering the checkout
   * must not hand them a stale order number.
   */
  const pendingOrder = useRef<{
    orderNo: string
    total: number
    eta: string
    pointsEarned: number
  } | null>(null)

  const dailyRef = useRef(dailyMissions)
  dailyRef.current = dailyMissions
  const productsRef = useRef(products)
  productsRef.current = products
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  /** Re-read the catalogue without making `pay` depend on the provider's identity. */
  const catalogRef = useRef(catalog.refresh)
  catalogRef.current = catalog.refresh

  /**
   * Whether this member has asked to be deleted and is waiting.
   *
   * Kept in the store rather than fetched by the screen so the answer survives
   * navigating away and back — a member who asked, wandered off and returned
   * should not be offered the withdrawal button a second time.
   */
  const [deletionPending, setDeletionPending] = useState(false)
  const [orders, setOrders] = useState<remote.MemberOrder[]>([])
  /** When each product was last bought, for the repurchase signal. */
  const [purchases, setPurchases] = useState<remote.PurchaseHistory>({})

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
  const aRef = useRef(a)
  aRef.current = a

  useEffect(
    () => () => {
      if (scanTimer.current) clearInterval(scanTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!isMember) {
      setDeletionPending(false)
      return
    }
    let cancelled = false
    void remote.myDeletionRequest().then((r) => {
      if (!cancelled) setDeletionPending(r !== null)
    })
    return () => { cancelled = true }
  }, [isMember])

  /*
   * The member's own orders.
   *
   * A guest has none by definition, and the list is emptied on sign-out rather
   * than left behind — someone else signing in on the same device must not see
   * the previous person's purchases.
   */
  const reloadOrders = useCallback(async () => {
    if (!isMember) return setOrders([])
    setOrders(await remote.loadMyOrders())
  }, [isMember])

  useEffect(() => {
    let cancelled = false
    if (!isMember) {
      // A guest has no history, and the previous member's must not linger on a
      // shared device.
      setPurchases({})
      return
    }
    void remote.loadPurchaseHistory().then((rows) => {
      if (!cancelled) setPurchases(rows)
    })
    return () => { cancelled = true }
  }, [isMember])

  useEffect(() => {
    let cancelled = false
    if (!isMember) {
      setOrders([])
      return
    }
    void remote.loadMyOrders().then((rows) => {
      if (!cancelled) setOrders(rows)
    })
    return () => { cancelled = true }
  }, [isMember])

  /*
   * Acknowledge an email link.
   *
   * Clicking "confirm my email" and landing on an ordinary home page with no
   * word of acknowledgement reads as failure, whatever the database thinks —
   * and an expired link reads the same way, except it really did fail. Said
   * once, on the load that carried the token.
   */
  const greeted = useRef(false)
  useEffect(() => {
    if (greeted.current) return
    if (!arrivalError && !confirmedSignup) return
    greeted.current = true
    // After the splash, so it is not shown behind it.
    const timer = setTimeout(() => {
      setState((s) => ({
        ...s,
        toast: arrivalError ? aRef.current.linkExpired : aRef.current.emailConfirmed,
      }))
      setTimeout(() => setState((s) => ({ ...s, toast: '' })), TOAST_MS)
    }, 900)
    return () => clearTimeout(timer)
  }, [])

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

      // Keep the stored zone in step with the device, so the allowance resets
      // at the midnight the member is actually living in. A traveller's day
      // boundary moves with them; someone who never leaves home writes this
      // once and never again.
      const zone = deviceTimezone()
      if (profileRef.current && profileRef.current.timezone !== zone) {
        void auth.updateProfile({ timezone: zone })
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
              total: Number(snap.latestOrder.total),
              earn: snap.latestOrder.points_earned,
              eta: snap.latestOrder.eta,
              status: snap.latestOrder.status,
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

  /**
   * Bumped to ask for a fresh reading of the same place.
   *
   * The fetch used to run once per place and never again, so a session left
   * open all day was still advising on the morning's weather at dusk — a
   * routine that follows the weather has to actually follow it.
   */
  const [weatherNonce, setWeatherNonce] = useState(0)
  /** When the reading on screen was taken, so the screen can say. */
  const [weatherAt, setWeatherAt] = useState<number | null>(null)
  const [weatherBusy, setWeatherBusy] = useState(false)

  useEffect(() => {
    const place =
      selectedCity === CURRENT_LOCATION
        ? geoCoords
        : { lat: (cities[selectedCity] ?? cities[defaultCity]).lat, lon: (cities[selectedCity] ?? cities[defaultCity]).lon }
    if (!place) {
      setLiveWeather(null)
      setWeatherAt(null)
      return
    }

    let cancelled = false
    setWeatherBusy(true)
    void fetchWeather(place.lat, place.lon, weatherNonce > 0).then((w) => {
      if (cancelled) return
      setWeatherBusy(false)
      // A failed refresh keeps the last good reading rather than blanking the
      // screen: a number from twenty minutes ago beats no number at all, and
      // the timestamp beside it says how old it is.
      if (w) {
        setLiveWeather(w)
        setWeatherAt(Date.now())
      } else if (weatherNonce === 0) {
        setLiveWeather(null)
        setWeatherAt(null)
      }
    })
    return () => { cancelled = true }
  }, [selectedCity, geoCoords, weatherNonce])

  /**
   * Every two hours, unattended.
   *
   * Weather does not move minute to minute, and the routine only branches on
   * bands — two hours is fine enough to catch an afternoon that turned, and
   * coarse enough that a page left open overnight makes twelve calls, not
   * hundreds.
   */
  const WEATHER_REFRESH_MS = 2 * 60 * 60 * 1000
  useEffect(() => {
    const timer = setInterval(() => setWeatherNonce((n) => n + 1), WEATHER_REFRESH_MS)
    return () => clearInterval(timer)
  }, [WEATHER_REFRESH_MS])

  /**
   * The refresh button. When the routine is following the visitor's own
   * location, "update" means asking the device where they are now as well —
   * someone who has travelled wants the weather where they are, not where the
   * browser last saw them.
   */
  const refreshWeather = useCallback(() => {
    if (stateRef.current.city === CURRENT_LOCATION) geo.request()
    setWeatherNonce((n) => n + 1)
  }, [geo])

  // ── the analysis allowance, and the routine log ───────────────────────────

  const [quota, setQuota] = useState<remote.AnalysisQuota | null>(null)
  const [routineLog, setRoutineLog] = useState<CheckLog>({})
  const [extras, setExtras] = useState<remote.RoutineExtraRow[]>([])

  /**
   * The clock, as state, ticked every minute.
   *
   * The routine's windows open and close on the hour; without a tick the
   * checkboxes would stay disabled until something else happened to re-render,
   * so a customer who opened the app at 4:59pm would be told the evening was
   * not open at 5:30. A minute is finer than any boundary here.
   */
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const today = localDay(now)

  const refreshQuota = useCallback(async () => {
    if (!isMember) {
      setQuota(null)
      return
    }
    setQuota(await remote.loadAnalysisQuota())
  }, [isMember])

  /**
   * `startScan` is memoised and must not be rebuilt whenever the allowance
   * changes — rebuilding it mid-scan would strand the progress timer's closure.
   * A ref lets it reach the current version without taking it as a dependency.
   */
  const refreshQuotaRef = useRef(refreshQuota)
  refreshQuotaRef.current = refreshQuota

  useEffect(() => {
    if (!memberId) {
      setQuota(null)
      setRoutineLog({})
      setExtras([])
      return
    }

    let cancelled = false
    void (async () => {
      const since = dayOffset(new Date(), -(remote.ROUTINE_HISTORY_DAYS - 1))
      const [q, rows, extraRows] = await Promise.all([
        remote.loadAnalysisQuota(),
        remote.loadRoutineLog(since),
        remote.loadRoutineExtras(),
      ])
      if (cancelled) return

      const byDay: Record<string, Set<string>> = {}
      for (const row of rows) {
        ;(byDay[row.day] ??= new Set()).add(checkId(row.slot, row.stepKey))
      }
      setQuota(q)
      setRoutineLog(byDay)
      setExtras(extraRows)
    })()
    return () => { cancelled = true }
  }, [memberId])

  /**
   * The allowance comes back at the member's own midnight, and a session left
   * open across it should notice. Re-reading whenever the local day changes is
   * enough — the reset is a date boundary, not a timer.
   */
  const lastDay = useRef(today)
  useEffect(() => {
    if (lastDay.current === today) return
    lastDay.current = today
    void refreshQuota()
  }, [today, refreshQuota])

  /** Tick a routine step off, or take it back. Optimistic; reverted on failure. */
  const toggleRoutineStep = useCallback(
    (slot: Slot, key: string) => {
      const id = checkId(slot, key)
      const day = localDay(new Date())
      const had = routineLog[day]?.has(id) ?? false

      setRoutineLog((log) => {
        const next = new Set(log[day] ?? [])
        if (had) next.delete(id)
        else next.add(id)
        return { ...log, [day]: next }
      })

      void (had
        ? remote.uncheckRoutineStep(day, slot, key)
        : remote.checkRoutineStep(day, slot, key)
      ).then((ok) => {
        if (ok) return
        // Put it back: a tick that did not persist must not look like one that did.
        setRoutineLog((log) => {
          const next = new Set(log[day] ?? [])
          if (had) next.add(id)
          else next.delete(id)
          return { ...log, [day]: next }
        })
      })
    },
    [routineLog],
  )

  const addExtra = useCallback(
    (slot: Slot, preset: string) => {
      void remote.addRoutineExtra(slot, preset).then((row) => {
        if (row) setExtras((current) => [...current, row])
      })
    },
    [],
  )

  const removeExtra = useCallback((id: string) => {
    setExtras((current) => current.filter((row) => row.id !== id))
    void remote.removeRoutineExtra(id)
  }, [])

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

  // Login is the default because most arrivals at this screen already have an
  // account; the ones who do not are one tap away, and a returning member
  // should not have to dismiss a signup form to get back in.
  const goAuth = useCallback(
    (mode: AuthMode = 'login') =>
      setState((s) => ({
        ...s,
        screen: 'auth',
        authMode: mode,
        gate: null,
        returnTo: s.screen === 'auth' ? s.returnTo : s.screen,
      })),
    [],
  )

  /**
   * Open a legal document, remembering where to come back to.
   *
   * Reachable from the signup form, so `returnTo` must not be overwritten when
   * the reader is already on a screen they were sent to — going back from the
   * terms should land on the form they were filling in, not two steps further.
   */
  const goLegal = useCallback(
    (doc: LegalDocId) =>
      setState((s) => ({
        ...s,
        screen: 'legal',
        legalDoc: doc,
        returnTo: s.screen === 'legal' ? s.returnTo : s.screen,
      })),
    [],
  )

  const leaveLegal = useCallback(
    () => setState((s) => ({ ...s, screen: s.returnTo === 'legal' ? 'home' : s.returnTo })),
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

        // Whatever happened, the allowance moved: a success spent one, and a
        // failure before the vendor charged us handed one back. Re-read it so
        // the count on the home screen is the count the server would enforce.
        void refreshQuotaRef.current()

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
        const res = await remote.claimMission(mission.id, stateRef.current.points)

        // Already claimed today, per the server's calendar rather than this
        // device's. Mark it done so the screen stops offering it again.
        if (!res.ok) {
          if (res.reason === 'already_claimed') {
            setState((cur) => ({ ...cur, done: { ...cur.done, [mission.id]: true }, points: res.points }))
          }
          return
        }

        const done = { ...stateRef.current.done, [mission.id]: true }
        // The server decides what the mission was worth and whether that
        // finished the day — the screen reports its answer rather than its own.
        const earned = res.earned ?? mission.pts
        const streak = res.streak ?? stateRef.current.streak
        const msg =
          streak !== stateRef.current.streak ? T.tStreak(earned, streak) : T.tEarn(earned)

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
        const res = await remote.redeemReward(reward.id, stateRef.current.points)
        if (!res.ok) {
          // The balance the server came back with is the real one, even when it
          // refuses — the screen may have been showing a stale number.
          setState((cur) => ({ ...cur, points: res.points }))
          toastMsg(res.reason === 'out_of_stock' ? T.tSoldOut : T.tNoPts)
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

  /**
   * Phase one: reserve, then ask PayPal to open an order.
   *
   * Returns PayPal's order id for the SDK, or null when we could not get that
   * far. Nothing is sold yet — the stock and the points are held against a
   * `pending` order that `abandonPayment` can give back.
   */
  const beginPayment = useCallback(async (): Promise<string | null> => {
    const s = stateRef.current
    setState((cur) => ({ ...cur, ppBusy: true }))

    // No figures are sent: what this order costs is the server's to decide,
    // from the basket it holds and the prices in its own tables.
    const res = await remote.beginCheckout({
      shipMethod: s.ship,
      name: s.name,
      country: s.country,
      address: s.addr,
      usePoints: s.usePoints,
      currentPoints: s.points,
    })

    if (!res.ok || !res.orderNo) {
      setState((cur) => ({ ...cur, ppBusy: false, points: res.points }))

      // Someone else took the last one while this basket sat open. Name the
      // product and how many are left — "주문 실패" tells them nothing they
      // can act on, and the bag is still exactly as they left it.
      if (res.reason === 'insufficient_stock') {
        const sold = productsRef.current.find((p) => p.id === res.productId)
        toastMsg(tRef.current.tStockShort(sold?.name ?? '', res.available ?? 0))
        void catalogRef.current()
        return null
      }
      toastMsg(tRef.current.tOrderFailed)
      return null
    }

    pendingOrder.current = {
      orderNo: res.orderNo,
      total: res.total ?? 0,
      eta: res.eta ?? '',
      pointsEarned: res.pointsEarned ?? 0,
    }
    setState((cur) => ({ ...cur, points: res.points }))

    try {
      return await openPaypalOrder(res.orderNo)
    } catch {
      // PayPal would not open an order, so nothing can be paid against this
      // reservation. Give the stock and the points straight back rather than
      // leaving them held by an order that can never complete.
      await remote.voidCheckout(res.orderNo, 'paypal_create_failed')
      pendingOrder.current = null
      setState((cur) => ({ ...cur, ppBusy: false }))
      void auth.refreshProfile()
      void catalogRef.current()
      toastMsg(tRef.current.tPayFailed)
      return null
    }
  }, [auth, toastMsg])

  /** Phase two: the customer approved, so take the money and settle. */
  const capturePayment = useCallback(async (): Promise<void> => {
    const held = pendingOrder.current
    if (!held) return

    setState((cur) => ({ ...cur, ppBusy: true }))
    try {
      const res = await capturePaypalOrder(held.orderNo)
      if (!res.ok) {
        setState((cur) => ({ ...cur, ppBusy: false }))
        toastMsg(tRef.current.tPayFailed)
        return
      }

      pendingOrder.current = null
      // The receipt shows what was actually written down, not what this screen
      // worked out a moment ago.
      setState((cur) => ({
        ...cur,
        ppBusy: false,
        pp: false,
        chkStep: 3,
        cart: {},
        order: {
          no: held.orderNo,
          total: held.total,
          earn: res.pointsEarned || held.pointsEarned,
          eta: held.eta,
        },
      }))
      void auth.refreshProfile()
      void catalogRef.current()
    } catch {
      // The money may or may not have moved. Say nothing definite, and leave
      // the order pending — the webhook settles it if the capture succeeded.
      setState((cur) => ({ ...cur, ppBusy: false }))
      toastMsg(tRef.current.tPayUnsure)
    }
  }, [auth, toastMsg])

  /**
   * Phase three: they walked away, or PayPal errored.
   *
   * Putting the reservation back is not optional politeness — stock held by an
   * abandoned checkout is stock nobody else can buy, and `begin_checkout`
   * allows one open order at a time, so this customer could not try again.
   */
  const abandonPayment = useCallback(
    async (reason: string): Promise<void> => {
      const held = pendingOrder.current
      pendingOrder.current = null
      setState((cur) => ({ ...cur, ppBusy: false }))
      if (!held) return

      await remote.voidCheckout(held.orderNo, reason)
      void auth.refreshProfile()
      void catalogRef.current()
      if (reason === 'customer_cancelled') toastMsg(tRef.current.tPayCancelled)
    },
    [auth, toastMsg],
  )

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
  const totals = totalsOf(state, products, settings, catalog.shipping)

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

  /*
   * The purchase history, paired with each product's expected life.
   *
   * A purchase we cannot date is dropped rather than treated as today's: a
   * bad timestamp would read as "just bought" and quietly suppress a product
   * the customer may actually need.
   */
  const owned: Record<string, Ownership> = {}
  for (const product of products) {
    const boughtAt = purchases[product.id]
    if (!boughtAt) continue
    const daysSince = daysBetween(boughtAt)
    if (daysSince < 0) continue
    owned[product.id] = { productId: product.id, daysSince, useDays: product.useDays }
  }

  const previousMetrics = state.history.find((h) => h.metrics)?.metrics ?? null
  const recommendations = new Map(
    rank(products, {
      metrics: effectiveMetrics,
      weather,
      // Null when the air-quality service was silent, which is not the same as
      // clean air and must not be scored as if it were.
      air: weather.air ? airBand(weather.air) : null,
      pollution: weather.air ? pollutionLoad(weather.air) : 0,
      owned,
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
      priceS: money(p.price),
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
    { n: 1, key: 'cleanse', name: r.step.amCleanse[plan.am.cleanse], note: r.note.amCleanse },
    { n: 2, key: 'toner', name: r.step.amToner[plan.am.toner], note: r.note.amToner },
    {
      n: 3,
      key: 'treatment',
      name: r.step.amTreatment + ': ' + targetProduct.name,
      note: r.note.weakest(lowest.n[lang]),
    },
    {
      n: 4,
      key: 'moisturiser',
      name: r.step.amMoisturiser[plan.am.moisturiser],
      note: bands.humidity.label + ' · ' + bands.humidity.value,
    },
    {
      n: 5,
      key: 'spf',
      name: r.step.amSpf[plan.am.spf],
      note: 'UV ' + weather.uv + ' · ' + bands.uv.label,
    },
  ]
  const pmSteps: RoutineStep[] = [
    {
      n: 1,
      key: 'cleanse',
      name: r.step.pmCleanse[plan.pm.cleanse],
      note: bands.temp.label + ' · ' + bands.temp.value,
    },
    { n: 2, key: 'essence', name: r.step.pmEssence, note: r.note.pmEssence },
    {
      n: 3,
      key: 'treatment',
      name: r.step.pmTreatment + ': ' + targetProduct.name,
      note: r.note.pmTreatment,
    },
    {
      n: 4,
      key: 'moisturiser',
      name: r.step.pmNight[plan.pm.night],
      note: bands.humidity.label + ' · ' + bands.humidity.value,
    },
  ]

  // ── the routine as a checklist ────────────────────────────────────────────

  /**
   * The member's own additions, appended after the engine's steps.
   *
   * Their key is prefixed so it can never collide with a base step, and a
   * preset the app no longer ships is dropped rather than rendered blank —
   * the row is data from the database, and the catalogue is code.
   */
  const extrasFor = (slot: Slot) =>
    extras
      .filter((row) => row.slot === slot)
      .map((row) => ({ row, preset: presetById(row.preset) }))
      .filter((entry): entry is { row: remote.RoutineExtraRow; preset: NonNullable<typeof entry.preset> } =>
        entry.preset !== undefined,
      )

  const ticked = routineLog[today] ?? new Set<string>()

  const toStepView = (slot: Slot, base: RoutineStep[]): RoutineStepView[] => {
    const open = isOpen(slot, now)
    const own = extrasFor(slot).map((entry, index) => ({
      n: base.length + index + 1,
      key: `extra:${entry.preset.id}`,
      name: entry.preset.name[lang],
      note: entry.preset.note[lang],
      extraId: entry.row.id,
    }))

    return [...base.map((step) => ({ ...step, extraId: null as string | null })), ...own].map(
      (step) => ({
        ...step,
        slot,
        open,
        done: ticked.has(checkId(slot, step.key)),
        toggle: () => guard('saveRoutine', () => toggleRoutineStep(slot, step.key))(),
        // Claiming needs the window open; taking a tick back never does.
        canToggle: open || ticked.has(checkId(slot, step.key)),
      }),
    )
  }

  const amList = toStepView('am', amSteps)
  const pmList = toStepView('pm', pmSteps)

  /** What the routine asks of today, for the adherence maths. */
  const todaysSteps: Checkable[] = [...amList, ...pmList].map((step) => ({
    slot: step.slot,
    key: step.key,
  }))

  const windowNow = openSlot(now)

  /**
   * The last month, newest last, as the chart draws it.
   *
   * Every day in the range is present even when nothing was ticked — a gap
   * rendered as a missing bar reads as "no data", and the honest reading is a
   * day that was skipped.
   */
  const adherenceDays = Array.from({ length: remote.ROUTINE_HISTORY_DAYS }, (_, i) =>
    adherenceFor(dayOffset(now, -(remote.ROUTINE_HISTORY_DAYS - 1 - i)), todaysSteps, routineLog),
  )

  const todayAdherence = adherenceDays[adherenceDays.length - 1]
  const routineStreak = streakOf(adherenceDays)
  const routineRate = overallRate(adherenceDays)

  /** Which presets are still addable, per slot. */
  const addableExtras = (slot: Slot) => {
    const taken = new Set(extras.filter((row) => row.slot === slot).map((row) => row.preset))
    return presetsFor(slot).filter((preset) => !taken.has(preset.id))
  }

  const extrasAtLimit = (slot: Slot) =>
    extras.filter((row) => row.slot === slot).length >= MAX_EXTRAS_PER_SLOT

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
  const trendPoints = trendSeries(state.history)

  /**
   * The chart for one measurement — the overall score, or a single axis.
   *
   * `axis: null` is the overall score. Naming an axis charts that axis alone,
   * which is the question someone actually following the routine has: the
   * average can sit still for a month while the hydration they are working on
   * climbs eight points underneath it.
   */
  const trendFor = (axis: MetricKey | null) => {
    const points = axis === null ? trendPoints : axisSeries(trendPoints, axis)
    if (points.length < 2) return null

    const valueOf = (p: (typeof points)[number]) =>
      axis === null ? p.overall : (p.metrics?.[axis] ?? 0)

    const scores = points.map(valueOf)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const span = Math.max(max - min, 1)

    return {
      count: ins.scanCount(points.length),
      points: points.map((p) => ({
        key: p.at,
        date: shortDate(p.at),
        score: valueOf(p),
        // 18% floor so the lowest bar is still a bar and not a hairline.
        height: Math.round(18 + ((valueOf(p) - min) / span) * 72) + '%',
        color: scoreColour(valueOf(p)),
        humidity: p.humidity === null ? '' : p.humidity + '%',
      })),
    }
  }

  const trend = trendFor(null)

  /** The axis picker, in the order the results screen already lists them. */
  const trendAxes = [
    { key: null as MetricKey | null, label: ins.trendOverall },
    ...metricDefs
      .filter((d) => axisSeries(trendPoints, d.k).length >= 2)
      .map((d) => ({ key: d.k as MetricKey | null, label: d.n[lang] })),
  ]

  /**
   * The distance travelled since the first scan.
   *
   * The per-scan findings compare the latest against the one before it, which
   * stops meaning much after a season: six scans each moving two points read
   * as six non-events and add up to twelve. This is the other half of the
   * record, and it is the answer to "is any of this working?".
   */
  const sinceFirst = cumulative(trendPoints)
  const cumulativeLine =
    sinceFirst === null
      ? null
      : sinceFirst.direction === 'up'
        ? ins.sinceFirstUp(sinceFirst.delta, sinceFirst.scans, sinceFirst.days)
        : sinceFirst.direction === 'down'
          ? ins.sinceFirstDown(Math.abs(sinceFirst.delta), sinceFirst.scans, sinceFirst.days)
          : ins.sinceFirstFlat(sinceFirst.scans, sinceFirst.days)

  /** How the score on screen compares with the scan before it, for the home card. */
  const vsLast = (() => {
    if (trendPoints.length < 2) return null
    const delta = trendPoints[trendPoints.length - 1].overall - trendPoints[trendPoints.length - 2].overall
    if (Math.abs(delta) < MOVE_THRESHOLD) return { text: ins.vsLastFlat, colour: '#8A7D6C' }
    return delta > 0
      ? { text: ins.vsLastUp(delta), colour: '#2E6B58' }
      : { text: ins.vsLastDown(Math.abs(delta)), colour: '#C25E43' }
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
      lineS: money(price * qty),
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

    /**
     * The order history, ready to render.
     *
     * Amounts are converted for display only; `refundable` is decided from the
     * order's real state rather than from how it looks, so a line that cannot
     * be refunded never offers a button that would fail.
     */
    orderHistory: orders.map((o) => {
      const settled = ['refunded', 'reversed', 'payment_failed', 'cancelled'].includes(o.status)
      const open = o.refund?.status === 'pending'
      return {
        ...o,
        totalS: money(o.total),
        refundedS: o.refundedTotal > 0 ? money(o.refundedTotal) : '',
        date: o.createdAt.slice(0, 10),
        statusLabel: t.orderStatus[o.status] ?? o.status,
        statusTone: settled ? '#C25E43' : o.status === 'delivered' ? '#6E6252' : '#2E6B58',
        // Nothing to ask for before the money arrived, or after it has gone.
        refundable: o.paidAt !== null && !settled && !open,
        requestOpen: open,
        declined: o.refund?.status === 'declined',
        declineNote: o.refund?.note ?? '',
      }
    }),
    hasOrders: orders.length > 0,

    askRefund: (orderNo: string, reason: string) => {
      void (async () => {
        const res = await remote.requestRefund(orderNo, reason)
        if (!res.ok) return toastMsg(tRef.current.refundRefused[res.reason] ?? tRef.current.tryAgain)
        await reloadOrders()
        toastMsg(tRef.current.refundAsked)
      })()
    },
    cancelRefund: (orderNo: string) => {
      void (async () => {
        if (!(await remote.cancelRefundRequest(orderNo))) return toastMsg(tRef.current.tryAgain)
        await reloadOrders()
        toastMsg(tRef.current.refundWithdrawn)
      })()
    },

    deletionPending,
    requestDeletion: (reason: string) => {
      void (async () => {
        const ok = await remote.requestAccountDeletion(reason)
        if (!ok) return toastMsg(tRef.current.tOrderFailed)
        setDeletionPending(true)
        toastMsg(tRef.current.tLeaveRequested)
      })()
    },
    cancelDeletion: () => {
      void (async () => {
        const ok = await remote.cancelAccountDeletion()
        if (!ok) return
        setDeletionPending(false)
        toastMsg(tRef.current.tLeaveCancelled)
      })()
    },
    money,
    currency: state.currency,
    currencyOptions: Object.values(rates)
      .map((r) => ({ value: r.code, label: `${r.label} ${r.symbol}` })),
    setCurrency: (value: string) => {
      setState((s) => ({ ...s, currency: rates[value] ? value : SETTLEMENT }))
    },
    setLang: (value: Lang) => {
      setState((s) => ({ ...s, lang: value }))
      if (isMember) void auth.updateProfile({ language: value })
    },

    // membership gate
    gate: state.gate,
    closeGate,
    goAuth,
    /** Back to the sign-in form from the reset form. */
    goResetBack: () => setState((s) => ({ ...s, screen: 'auth', authMode: 'login' })),
    say: toastMsg,
    goLegal,
    leaveLegal,
    leaveAuth,
    guard,
    can: (capability: Capability) => can(capability, isMember),

    pointsS: points.toLocaleString(),
    streakLine: t.streakLine(state.streak),
    hasCart: Object.keys(state.cart).length > 0,
    cartEmpty: Object.keys(state.cart).length === 0,
    cartCount: Object.values(state.cart).reduce((x, y) => x + y, 0),

    goHome: go('home'),
    /**
     * The scan tab, routed by what the member can actually do right now.
     *
     * With an analysis available they came to take one, so this opens the
     * camera even when a previous result is on file — a new day is the whole
     * reason to scan again. With the allowance spent, the result they already
     * paid for is the useful thing to show, and the camera would only lead to
     * a refusal. Either screen links to the other.
     */
    goScan: () => {
      const left = quota ? quota.limit - quota.used : null
      const available = left === null || left > 0
      setState((s) => ({
        ...s,
        screen: 'scan',
        scanStep: available || !s.scanned ? 'intro' : 'results',
      }))
    },
    /** Straight to the result on file, from the camera screen. */
    showLastResult: () => setState((s) => ({ ...s, screen: 'scan', scanStep: 'results' })),
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
    subS: money(totals.sub),
    shipS: money(totals.ship),
    discS: '−' + money(totals.disc),
    totalS: money(totals.total),
    usePtsLine: t.usePts(totals.ptsUsed.toLocaleString(), money(totals.disc)),
    /**
     * What the card is actually billed, shown alongside the converted total
     * when the two differ. Quoting ฿1,372 and charging $37.60 in silence is
     * how a customer concludes they were overcharged by the rounding.
     */
    billedNote: isSettlement(state.currency) ? '' : t.billedIn(usd(totals.total)),
    earnPreview: Math.round((totals.sub + totals.ship) * settings.earnPerDollar),
    shipName: catalog.shipping[state.ship].label,
    /*
     * Postage, from the live table and in the customer's currency.
     *
     * These were rendered straight from the seed in dollars, so a customer
     * reading every other figure in won met two that were not — and an
     * operator changing a rate in the database would not have moved them.
     */
    shipOptions: (['dhl', 'ems'] as const).map((id) => ({
      id,
      label: catalog.shipping[id].label,
      feeS: money(catalog.shipping[id].fee),
      eta: catalog.shipping[id].eta,
    })),
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
    beginPayment,
    capturePayment,
    abandonPayment,

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
    wLine:
      weather.t + '°C · ' + t.humidity + ' ' + weather.h + '% · UV ' + weather.uv +
      // Appended rather than given its own row: it is one more reading about
      // today, and a reading that is only sometimes there must not leave a gap
      // in the layout when it is not.
      (weather.air ? ' · ' + t.dust + ' ' + t.airBand[airBand(weather.air)] : ''),
    /**
     * A line of advice, only on the days it is warranted.
     *
     * Empty on a clean or ordinary day. Saying "air quality is fine" every
     * morning trains people to stop reading the strip, and then it says
     * nothing on the day it matters.
     */
    airAdvice:
      weather.air && isPolluted(airBand(weather.air))
        ? t.dustAdvice(t.airBand[airBand(weather.air)])
        : '',
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

    /**
     * Every measurement's trajectory, for the per-item view on the report.
     *
     * Built from the same series the chart draws, so the report and My Page
     * can never tell the customer two different stories about one axis.
     */
    axisChanges: axisChanges(trendPoints),
    axisTrendT: ins.axisTrend,

    trendFor,
    trendAxes,
    trendTitle: ins.trendTitle,
    trendSub: ins.trendSub,
    sinceFirstLabel: ins.sinceFirst,
    cumulativeLine,
    vsLast,

    // ── the weather reading, and how to ask for a fresh one ────────────────
    refreshWeather,
    weatherBusy,
    weatherAgo:
      weatherAt === null
        ? ''
        : (() => {
            const minutes = Math.floor((now.getTime() - weatherAt) / 60_000)
            if (minutes < 1) return r.measuredJustNow
            if (minutes < 60) return r.measuredMinutesAgo(minutes)
            return r.measuredHoursAgo(Math.floor(minutes / 60))
          })(),
    refreshLabel: r.refresh,
    refreshingLabel: r.refreshing,

    // ── today's allowance ──────────────────────────────────────────────────
    quota,
    /** How many analyses are left. Null while unknown, so the UI can stay quiet. */
    scansLeft: quota ? Math.max(0, quota.limit - quota.used) : null,
    quotaLine:
      quota === null
        ? ''
        : quota.limit - quota.used > 0
          ? a.scansLeftToday(Math.max(0, quota.limit - quota.used), quota.limit)
          : a.scansSpentToday,
    refreshQuota,

    // ── the routine as a checklist ─────────────────────────────────────────
    amList,
    pmList,
    windowNow,
    checkT: r.check,
    slotWindowLabel: { am: r.check.amWindow, pm: r.check.pmWindow },
    todayAdherence,
    routineStreak,
    routineRate,
    adherenceDays,
    /**
     * Scan scores keyed to the local day they were taken, so the adherence
     * chart can draw the result beside the effort. Same day key as the ticks,
     * which is what lets the two line up at all.
     */
    adherenceScans: state.history
      .map((scan) => ({
        day: localDay(new Date(scan.createdAt)),
        overall: scan.overall,
        colour: scoreColour(scan.overall),
      }))
      .filter((entry) => entry.day >= adherenceDays[0].day),
    addableExtras,
    extrasAtLimit,
    addExtra: (slot: Slot, preset: string) =>
      guard('saveRoutine', () => addExtra(slot, preset))(),
    removeExtra,
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
