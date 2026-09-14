/** Shared shapes for the sample data in this folder. */

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

export interface City {
  /** Temperature in °C — fallback until the live reading arrives. */
  t: number
  /** Relative humidity in % — fallback. */
  h: number
  /** UV index — fallback. */
  uv: number
  lat: number
  lon: number
}

/** A live reading, or the fallback standing in for one. */
export interface Weather {
  t: number
  h: number
  uv: number
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
  ing: string
  sub: Localized
  why: Localized
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

export type OrderStatus = 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'

export interface AdminOrder {
  no: string
  date: string
  name: string
  country: string
  amt: number
  carrier: 'DHL' | 'EMS'
  tracking: string
  status: OrderStatus
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
