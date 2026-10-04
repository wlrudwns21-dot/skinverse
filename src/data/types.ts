/** Shared shapes for the sample data in this folder. */

import type { Fit, Slot } from '../catalog/analysis'
import type { DetailHeights } from '../catalog/detailPages'

export type Lang = 'en' | 'ko' | 'zh' | 'th'

/** A string that exists in all four supported languages. */
export type Localized = Record<Lang, string>

/** The six diagnostic axes the AI scan reports on. */
export type MetricKey =
  | 'hydration'
  | 'elasticity'
  | 'pores'
  | 'pigmentation'
  | 'wrinkles'
  | 'sensitivity'

export type SkinConditionKey = 'dehydrated' | 'oily' | 'balanced'

/**
 * A place the routine can be built for.
 *
 * Coordinates only. Stored weather used to live here as a fallback, which meant
 * a routine could be built from numbers invented months earlier with nothing on
 * screen saying so. A missing reading is now shown as missing.
 */
export interface City {
  lat: number
  lon: number
}

/** A live reading, or the fallback standing in for one. */
export interface Weather {
  t: number
  h: number
  uv: number
  /**
   * Particulates, when the air-quality service answered.
   *
   * Optional because it is a second request to a second host, and because
   * every reading taken before this existed has none — the routine says
   * nothing about dust rather than guessing at it.
   */
  air?: { pm10: number; pm25: number }
  /**
   * The WMO weather code, when the forecast answered with one.
   *
   * Optional for the same reason as `air`: the sample reading predates it,
   * and a stored reading taken before this field existed has none. Nothing
   * reads it directly — it goes through `skyFor`, which treats a missing code
   * as a plain sky.
   */
  code?: number
}

export interface SkinCondition {
  overall: number
  m: Record<MetricKey, number>
  type: Localized
  sum: Localized
}

export interface MetricDef {
  k: MetricKey
  n: Localized
}

export type ProductTag = 'Hydration' | 'Soothing' | 'Pore' | 'Brightening' | 'SPF'

export interface Product {
  id: string
  brand: string
  name: string
  price: number
  tag: ProductTag
  /** Which scan axis this product answers to. `uv` matches on local UV index. */
  metric: MetricKey | 'uv'
  ml: string
  kind: string
  /** CSS gradient standing in for product photography. */
  g: string
  /**
   * Path under `public/` to the product's main shot, e.g.
   * `/products/<id>/main.webp`. Empty while a product has no photograph yet,
   * in which case `g` is what gets painted.
   */
  img: string
  ing: string
  /**
   * Page heights for the maker's detail artwork, by locale. Undefined falls
   * back to the table bundled with the build.
   */
  detail?: DetailHeights
  sub: Localized
  why: Localized
  /** The product line, e.g. 아토베리어365. Empty when the maker has none. */
  line: string
  /** Which of the two daily routines it belongs to. */
  slot: Slot
  /** Which step of that routine, keyed into `stepNames`. */
  step: string
  /** Whether a human checked `ing` against the maker's own label. */
  checked: boolean
  /** Which scan readings it speaks to, strongest first. */
  fits: Fit[]
  /** What the ingredient list shows. Statements about the list, not about skin. */
  pros: Localized[]
  /** What to watch for. Every verified product has at least two. */
  cons: Localized[]
}

export interface Mission {
  id: string
  pts: number
  l: Localized
}

export interface Reward {
  id: string
  cost: number
  l: Localized
}

/** `[pointsRequired, name]`, ascending. */
export type Level = [number, string]

/**
 * Where an order stands.
 *
 * The first five are the fulfilment states an operator moves an order through.
 * The last four are facts about the money, written only by a verified payment
 * webhook — an operator cannot select them and cannot undo them, which is why
 * they are deliberately absent from `orderStatusOrder`.
 */
export type OrderStatus =
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'partly_refunded'
  | 'refunded'
  | 'reversed'
  | 'payment_failed'

/** The states only PayPal may put an order into. */
export const PAYMENT_LOCKED: readonly OrderStatus[] = [
  'partly_refunded',
  'refunded',
  'reversed',
  'payment_failed',
]

export const isPaymentLocked = (s: OrderStatus): boolean => PAYMENT_LOCKED.includes(s)

export interface AdminOrder {
  no: string
  date: string
  name: string
  country: string
  amt: number
  /** How much of `amt` has already gone back. */
  refunded: number
  carrier: 'DHL' | 'EMS'
  tracking: string
  status: OrderStatus
  /** Whether money was actually captured, and so whether any can be returned. */
  capturable: boolean
}

export interface AdminProduct {
  id: string
  brand: string
  name: string
  kind: string
  ml: string
  price: number
  stock: number
  sold: number
  active: boolean
  g: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  country: string
  level: string
  pts: number
  activity: string
}

export interface AdminMission {
  id: string
  label: string
  cat: string
  pts: number
  on: boolean
}

export interface AdminReward {
  id: string
  name: string
  cost: number
  stock: number
}

export interface Kpi {
  label: string
  value: string
  delta: string
  deltaColor: string
}
