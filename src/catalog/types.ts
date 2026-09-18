import type { Localized, MetricKey, Product, ProductTag } from '../data/types'

/** A catalogue row: the storefront's view of a product plus its operational fields. */
export interface CatalogProduct extends Product {
  stock: number
  sold: number
  active: boolean
  /** The price as the operator authored it, in won. `price` is derived. */
  priceKrw: number
  /** Roughly how many days one unit lasts, for estimating a repurchase. */
  useDays: number
}

export interface CatalogMission {
  id: string
  kind: 'daily' | 'weekly'
  pts: number
  l: Localized
  active: boolean
}

export interface CatalogReward {
  id: string
  cost: number
  stock: number
  l: Localized
  active: boolean
}

export interface StoreSettings {
  /** Points granted per $1 spent. */
  earnPerDollar: number
  /** Share of the order total points may cover, as a percentage. */
  useCapPct: number
  /** Extra points for clearing every daily mission. */
  streakBonus: number
}

/** Shape of a `products` row as it comes back from PostgREST. */
export interface ProductRow {
  id: string
  brand: string
  name: string
  price: string | number
  /** The authored price, in won. `price` is derived from it. */
  price_krw?: string | number | null
  use_days?: number | null
  tag: string
  metric: string
  ml: string
  kind: string
  gradient: string
  ingredients: string
  sub: Localized
  why: Localized
  stock: number
  sold: number
  active: boolean
  sort: number
}

export function toCatalogProduct(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    price: Number(row.price),
    priceKrw: Number(row.price_krw ?? 0),
    useDays: Number(row.use_days ?? 60),
    tag: row.tag as ProductTag,
    metric: row.metric as MetricKey | 'uv',
    ml: row.ml,
    kind: row.kind,
    g: row.gradient,
    ing: row.ingredients,
    sub: row.sub,
    why: row.why,
    stock: row.stock,
    sold: row.sold,
    active: row.active,
  }
}
