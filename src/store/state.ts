import { demoAccount, demoScenario } from '../data/account'
import type { ShipMethod } from '../data/commerce'
import { shipping } from '../data/commerce'
import type { CatalogProduct, StoreSettings } from '../catalog/types'
import type { Lang, MetricKey, OrderStatus, SkinConditionKey, Weather } from '../data/types'
import type { AnalysisVisuals, SkinTypeReading } from '../analysis/perfectcorp'
import type { Capability } from '../auth/capabilities'
import type { ImageCheck } from '../analysis/imageCheck'
import type { ChipKey } from '../i18n/chips'
import { SETTLEMENT } from '../money/fx'

export type Screen =
  | 'home'
  | 'scan'
  | 'shop'
  | 'detail'
  | 'cart'
  | 'checkout'
  | 'routine'
  | 'missions'
  | 'stories'
  | 'my'
  | 'auth'
  | 'support'
  | 'legal'

/**
 * `failed` is a real destination, not a detour to the demo.
 *
 * An analysis that did not happen must not be dressed up as one that did:
 * showing a canned profile after a failure teaches the customer to distrust
 * every score the app has ever shown them.
 */
export type ScanStep = 'intro' | 'scanning' | 'results' | 'failed'
export type AuthMode = 'signup' | 'login'
/** Which of the two legal documents the legal screen opens on. */
export type LegalDocId = 'terms' | 'privacy'

export interface PlacedOrder {
  no: string
  /**
   * The settlement amount, not a formatted string.
   *
   * Formatting happens where it is rendered: a receipt that froze "₩52,640"
   * at payment time would still say it after the customer switched their
   * currency to dollars.
   */
  total: number
  earn: number
  eta: string
  /**
   * Absent on the receipt shown the instant a payment succeeds — there is
   * nothing it could be but paid — and present when the order is read back
   * from the database, where it may since have been refunded.
   */
  status?: OrderStatus
}

/**
 * One past analysis, as the reports need it.
 *
 * Everything past `createdAt` is nullable because rows written before the
 * history was widened have none of it — a member who scanned in the first week
 * still has a valid record, it just cannot carry a per-axis trend.
 */
export interface ScanRecord {
  skinCondition: SkinConditionKey
  overall: number
  createdAt: string
  metrics: Record<MetricKey, number> | null
  skinAge: number | null
  oiliness: number | null
  skinType: SkinTypeReading | null
  /** The conditions the face was measured in, which is what makes a trend readable. */
  weather: Weather | null
}

export interface StoreState {
  screen: Screen
  /** Where to return after the auth screen closes. */
  returnTo: Screen
  authMode: AuthMode
  legalDoc: LegalDocId
  scanStep: ScanStep
  progress: number
  /** A scan result is on screen. For guests this never survives a refresh. */
  scanned: boolean
  cart: Record<string, number>
  selId: string | null
  city: string
  filter: ChipKey
  chkStep: 1 | 2 | 3
  lang: Lang
  /**
   * The currency prices are shown in. Display only — the bill is always in the
   * settlement currency, and the checkout says so when they differ.
   */
  currency: string
  skinCondition: SkinConditionKey

  /** Authoritative point balance: the member's profile, or 0 for a guest. */
  points: number
  streak: number
  /** Mission ids cleared today. Guests can never fill this. */
  done: Record<string, boolean>
  redeemed: Record<string, boolean>
  /** Scan history from the member's account, newest first. */
  history: ScanRecord[]
  savedRoutineCount: number

  name: string
  addr: string
  country: string
  ship: ShipMethod
  usePoints: boolean
  pp: boolean
  ppBusy: boolean
  order: PlacedOrder | null
  toast: string
  notif: boolean

  /** Which member-only capability the guest just bumped into, if any. */
  gate: Capability | null

  /** Why the last scan failed, ready to show. Empty when none has. */
  scanError: string
  /** The selfie the visitor picked, held only until the analysis is sent. */
  photo: File | null
  /**
   * What the pre-flight check made of that selfie. A `problem` blocks the scan
   * before it costs a billed call; a `warning` is shown but does not block.
   */
  photoCheck: ImageCheck | null
  /**
   * Whether the score on screen came from the vendor or from the canned demo
   * profile. Shown to the customer — a made-up score presented as a measurement
   * would be the worst thing this app could do.
   */
  scanIsReal: boolean
  /** Live scan result, when the vendor produced one. */
  liveMetrics: Record<MetricKey, number> | null
  liveOverall: number | null
  liveSkinAge: number | null
  liveOiliness: number | null
  liveSkinType: SkinTypeReading | null
  /**
   * The detailed readings and overlays from the scan just taken.
   *
   * Not restored from history on purpose: the mask URLs expire, so a stale set
   * would render as broken images over a face that no longer matches.
   */
  liveVisuals: AnalysisVisuals | null
}

export const initialState: StoreState = {
  screen: 'home',
  returnTo: 'home',
  authMode: 'login',
  legalDoc: 'terms',
  scanStep: 'intro',
  progress: 0,
  scanned: false,
  cart: {},
  selId: null,
  city: demoScenario.city,
  filter: 'All',
  chkStep: 1,
  lang: demoScenario.language,
  currency: SETTLEMENT,
  skinCondition: demoScenario.skinCondition,

  points: 0,
  streak: 0,
  done: {},
  redeemed: {},
  history: [],
  savedRoutineCount: 0,

  name: '',
  addr: '',
  country: demoAccount.country,
  ship: 'dhl',
  usePoints: true,
  pp: false,
  ppBusy: false,
  order: null,
  toast: '',
  notif: true,

  gate: null,
  scanError: '',
  photo: null,
  photoCheck: null,
  scanIsReal: false,
  liveMetrics: null,
  liveOverall: null,
  liveSkinAge: null,
  liveOiliness: null,
  liveSkinType: null,
  liveVisuals: null,
}

export interface Totals {
  sub: number
  ship: number
  ptsUsed: number
  disc: number
  total: number
}

/** 100 points buy $1 of discount. */
export const POINTS_PER_DOLLAR = 100

/**
 * What the checkout screen shows before anything is committed.
 *
 * A preview, not a decision: `place_order` recomputes every one of these from
 * the database when the order is actually placed. The two must agree, so the
 * arithmetic here is mirrored line for line in that function — and the rates
 * are passed in from the catalog rather than read from `src/data`, so both
 * sides are quoting the same table.
 */
export function totalsOf(
  state: StoreState,
  products: CatalogProduct[],
  settings: StoreSettings,
  rates: Record<ShipMethod, { fee: number }> = shipping,
): Totals {
  const sub = Object.entries(state.cart).reduce((acc, [id, qty]) => {
    const product = products.find((p) => p.id === id)
    return acc + (product ? product.price * qty : 0)
  }, 0)
  const ship = Object.keys(state.cart).length ? rates[state.ship].fee : 0
  const cap = Math.floor(sub * (settings.useCapPct / 100)) * POINTS_PER_DOLLAR
  const ptsUsed = state.usePoints ? Math.min(state.points, cap) : 0
  const disc = ptsUsed / POINTS_PER_DOLLAR
  const total = Math.max(0, sub + ship - disc)
  return { sub, ship, ptsUsed, disc, total }
}

export const usd = (n: number) => '$' + n.toFixed(2)
