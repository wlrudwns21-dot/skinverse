import { demoAccount, demoScenario } from '../data/account'
import type { ShipMethod } from '../data/commerce'
import { pointsRules, shipping } from '../data/commerce'
import { products } from '../data/products'
import type { Lang, SkinConditionKey } from '../data/types'
import type { Capability } from '../auth/capabilities'
import type { ChipKey } from '../i18n/chips'

export type Screen =
  | 'home'
  | 'scan'
  | 'shop'
  | 'detail'
  | 'cart'
  | 'checkout'
  | 'routine'
  | 'missions'
  | 'my'
  | 'auth'

export type ScanStep = 'intro' | 'scanning' | 'results'
export type AuthMode = 'signup' | 'login'

export interface PlacedOrder {
  no: string
  total: string
  earn: number
  eta: string
}

export interface ScanRecord {
  skinCondition: SkinConditionKey
  overall: number
  createdAt: string
}

export interface StoreState {
  screen: Screen
  /** Where to return after the auth screen closes. */
  returnTo: Screen
  authMode: AuthMode
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
  /** True once a guest has spent today's single trial scan. */
  guestScanUsed: boolean
}

export const initialState: StoreState = {
  screen: 'home',
  returnTo: 'home',
  authMode: 'signup',
  scanStep: 'intro',
  progress: 0,
  scanned: false,
  cart: {},
  selId: null,
  city: demoScenario.city,
  filter: 'All',
  chkStep: 1,
  lang: demoScenario.language,
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
  guestScanUsed: false,
}

export interface Totals {
  sub: number
  ship: number
  ptsUsed: number
  disc: number
  total: number
}

export function totalsOf(state: StoreState): Totals {
  const sub = Object.entries(state.cart).reduce((acc, [id, qty]) => {
    const product = products.find((p) => p.id === id)
    return acc + (product ? product.price * qty : 0)
  }, 0)
  const ship = Object.keys(state.cart).length ? shipping[state.ship].fee : 0
  const cap = Math.floor(sub * pointsRules.useCap) * pointsRules.pointsPerDollar
  const ptsUsed = state.usePoints ? Math.min(state.points, cap) : 0
  const disc = ptsUsed / pointsRules.pointsPerDollar
  const total = Math.max(0, sub + ship - disc)
  return { sub, ship, ptsUsed, disc, total }
}

export const usd = (n: number) => '$' + n.toFixed(2)
