import { demoAccount, demoScenario } from '../data/account'
import type { ShipMethod } from '../data/commerce'
import { pointsRules, shipping } from '../data/commerce'
import { products } from '../data/products'
import type { Lang, SkinConditionKey } from '../data/types'
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

export type ScanStep = 'intro' | 'scanning' | 'results'

export interface PlacedOrder {
  no: string
  total: string
  earn: number
  eta: string
}

export interface StoreState {
  screen: Screen
  scanStep: ScanStep
  /** 0–100 during the scan animation. */
  progress: number
  scanned: boolean
  /** Points earned/spent since the session started, added to the starting balance. */
  pd: number
  streak: number
  /** Guards the once-per-session streak bonus. */
  streakAwarded: boolean
  cart: Record<string, number>
  selId: string | null
  city: string
  filter: ChipKey
  done: Record<string, boolean>
  redeemed: Record<string, boolean>
  chkStep: 1 | 2 | 3
  lang: Lang
  skinCondition: SkinConditionKey
  name: string
  addr: string
  country: string
  ship: ShipMethod
  usePoints: boolean
  /** PayPal sandbox modal open. */
  pp: boolean
  ppBusy: boolean
  order: PlacedOrder | null
  toast: string
  notif: boolean
}

export const initialState: StoreState = {
  screen: 'home',
  scanStep: 'intro',
  progress: 0,
  scanned: false,
  pd: 0,
  streak: demoAccount.streak,
  streakAwarded: false,
  cart: {},
  selId: null,
  city: demoScenario.city,
  filter: 'All',
  done: { ...demoAccount.doneMissions },
  redeemed: {},
  chkStep: 1,
  lang: demoScenario.language,
  skinCondition: demoScenario.skinCondition,
  name: demoAccount.name,
  addr: demoAccount.addr,
  country: demoAccount.country,
  ship: 'dhl',
  usePoints: true,
  pp: false,
  ppBusy: false,
  order: null,
  toast: '',
  notif: demoAccount.routineReminders,
}

export function pointsOf(state: StoreState): number {
  return demoAccount.startingPoints + state.pd
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
  const ptsUsed = state.usePoints ? Math.min(pointsOf(state), cap) : 0
  const disc = ptsUsed / pointsRules.pointsPerDollar
  const total = Math.max(0, sub + ship - disc)
  return { sub, ship, ptsUsed, disc, total }
}

export const usd = (n: number) => '$' + n.toFixed(2)
