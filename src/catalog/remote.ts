import { supabase } from '../lib/supabase'
import { products as seedProducts } from '../data/products'
import { dailyMissions, rewards as seedRewards, weeklyMissions } from '../data/rewards'
import { pointsRules, shipping as seedShipping } from '../data/commerce'
import type { ShipMethod } from '../data/commerce'
import { FALLBACK_RATES, type FxRate, type FxRates } from '../money/fx'
import {
  toCatalogProduct,
  type CatalogMission,
  type CatalogProduct,
  type CatalogReward,
  type ProductRow,
  type StoreSettings,
} from './types'

export interface ShipRate {
  label: string
  fee: number
  eta: string
}

export interface Catalog {
  products: CatalogProduct[]
  missions: CatalogMission[]
  rewards: CatalogReward[]
  settings: StoreSettings
  /**
   * Postage, from the same table `place_order` charges from.
   *
   * Read rather than hard-coded so the checkout cannot quote one fee and the
   * server bill another — the price on the screen and the price in the order
   * have to come from one place.
   */
  shipping: Record<ShipMethod, ShipRate>
  /**
   * What each currency is worth, for display only.
   *
   * Read from the same table the operator edits, so a rate change reaches the
   * storefront on the next load rather than needing a deploy.
   */
  rates: FxRates
}

/**
 * What the app renders before the first query returns, and what it falls back to
 * if the database is unreachable. Keeping `src/data` as the seed means a network
 * hiccup shows a slightly stale shop rather than an empty one.
 */
export const SEED_CATALOG: Catalog = {
  // The seed carries dollar prices, so the won figure is derived at the
  // fallback rate rather than left at zero — a ₩0 product reads as free.
  products: seedProducts.map((p) => ({
    ...p,
    stock: 0,
    sold: 0,
    active: true,
    priceKrw: Math.round(p.price * FALLBACK_RATES.USD.krwPerUnit),
    useDays: 60,
  })),
  missions: [
    ...dailyMissions.map((m) => ({ id: m.id, kind: 'daily' as const, pts: m.pts, l: m.l, active: true })),
    ...weeklyMissions.map((m) => ({ id: m.id, kind: 'weekly' as const, pts: m.pts, l: m.l, active: true })),
  ],
  rewards: seedRewards.map((r) => ({ id: r.id, cost: r.cost, stock: 0, l: r.l, active: true })),
  settings: {
    earnPerDollar: pointsRules.earnPerDollar,
    useCapPct: Math.round(pointsRules.useCap * 100),
    streakBonus: 0,
  },
  shipping: seedShipping,
  rates: FALLBACK_RATES,
}

export async function loadCatalog(): Promise<Catalog> {
  if (!supabase) return SEED_CATALOG

  const [products, missions, rewards, settings, ship, rates] = await Promise.all([
    supabase.from('products').select('*').order('sort'),
    supabase.from('missions').select('*').order('sort'),
    supabase.from('rewards').select('*').order('sort'),
    supabase.from('store_settings').select('*').maybeSingle(),
    supabase.from('shipping_methods').select('id, label, fee, eta').order('sort'),
    supabase.from('fx_rates').select('code, label, symbol, krw_per_unit, decimals').order('sort'),
  ])

  if (products.error) {
    console.error('[skinverse] 카탈로그를 불러오지 못했습니다', products.error.message)
    return SEED_CATALOG
  }

  return {
    products: ((products.data ?? []) as ProductRow[]).map(toCatalogProduct),
    missions: (missions.data ?? []).map((m) => ({
      id: m.id as string,
      kind: m.kind as 'daily' | 'weekly',
      pts: m.points as number,
      l: m.label as CatalogMission['l'],
      active: m.active as boolean,
    })),
    rewards: (rewards.data ?? []).map((r) => ({
      id: r.id as string,
      cost: r.cost as number,
      stock: r.stock as number,
      l: r.label as CatalogReward['l'],
      active: r.active as boolean,
    })),
    settings: settings.data
      ? {
          earnPerDollar: settings.data.earn_per_dollar as number,
          useCapPct: settings.data.use_cap_pct as number,
          streakBonus: settings.data.streak_bonus as number,
        }
      : SEED_CATALOG.settings,
    shipping: readShipping(ship.data),
    rates: readRates(rates.data),
  }
}

/**
 * Fold the rate rows into a lookup.
 *
 * A missing or nonsensical rate is dropped rather than defaulted: `convert`
 * already refuses to guess, and showing the dollar price is the right answer
 * when we do not know what a currency is worth.
 */
function readRates(rows: unknown): FxRates {
  const out: FxRates = { ...FALLBACK_RATES }
  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const code = typeof row.code === 'string' ? row.code : ''
    const per = Number(row.krw_per_unit)
    if (!code || !Number.isFinite(per) || per <= 0) continue
    out[code] = {
      code,
      label: String(row.label ?? code),
      symbol: String(row.symbol ?? ''),
      krwPerUnit: per,
      decimals: Number(row.decimals ?? 2),
    } satisfies FxRate
  }
  return out
}

/**
 * Fold the shipping rows into the shape the checkout wants.
 *
 * A method missing from the table keeps its seed rate rather than becoming
 * free: a zero here would be quoted to the customer and then contradicted by
 * the server, which is the one outcome worth ruling out.
 */
function readShipping(rows: unknown): Record<ShipMethod, ShipRate> {
  const rates = { ...SEED_CATALOG.shipping }
  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const id = row.id as ShipMethod
    if (!(id in rates)) continue
    rates[id] = {
      label: (row.label as string) ?? rates[id].label,
      fee: typeof row.fee === 'number' ? row.fee : Number(row.fee ?? rates[id].fee),
      eta: (row.eta as string) ?? rates[id].eta,
    }
  }
  return rates
}

// ── operator writes ─────────────────────────────────────────────────────────

export async function setProductStock(id: string, stock: number): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('products').update({ stock: Math.max(0, stock) }).eq('id', id)
  if (error) console.error('[skinverse] 재고 저장 실패', error.message)
  return !error
}

export async function setProductActive(id: string, active: boolean): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('products').update({ active }).eq('id', id)
  if (error) console.error('[skinverse] 판매 상태 저장 실패', error.message)
  return !error
}

export async function setMissionPoints(id: string, points: number): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('missions').update({ points: Math.max(0, points) }).eq('id', id)
  if (error) console.error('[skinverse] 미션 보상 저장 실패', error.message)
  return !error
}

export async function setMissionActive(id: string, active: boolean): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('missions').update({ active }).eq('id', id)
  if (error) console.error('[skinverse] 미션 상태 저장 실패', error.message)
  return !error
}

export async function setRewardStock(id: string, stock: number): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('rewards').update({ stock: Math.max(0, stock) }).eq('id', id)
  if (error) console.error('[skinverse] 리워드 재고 저장 실패', error.message)
  return !error
}

/** Master-only: RLS rejects the update for a plain operator. */
export async function saveSettings(next: StoreSettings): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('store_settings')
    .update({
      earn_per_dollar: next.earnPerDollar,
      use_cap_pct: next.useCapPct,
      streak_bonus: next.streakBonus,
    })
    .eq('id', true)
  if (error) console.error('[skinverse] 포인트 설정 저장 실패', error.message)
  return !error
}

// ── rates, costs and the product form ───────────────────────────────────────

/**
 * Change what a currency is worth.
 *
 * Moving USD reprices the entire shop, because every product's charged price
 * is derived from its won price at that rate — which is why the caller is
 * expected to have shown the operator what the new prices will be first.
 */
export async function setFxRate(code: string, krwPerUnit: number): Promise<boolean> {
  if (!supabase) return false
  if (!Number.isFinite(krwPerUnit) || krwPerUnit <= 0) return false

  const { error } = await supabase
    .from('fx_rates')
    .update({ krw_per_unit: krwPerUnit, updated_at: new Date().toISOString() })
    .eq('code', code)
  if (error) console.error('[skinverse] 환율 저장 실패', error.message)
  return !error
}

/** Re-derive every charged price after the USD rate moved. */
export async function resyncPrices(): Promise<number | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('resync_product_prices')
  if (error) {
    console.error('[skinverse] 가격 재계산 실패', error.message)
    return null
  }
  const row = (data ?? {}) as Record<string, unknown>
  return row.ok === true ? Number(row.rowsChanged ?? 0) : null
}

/** Cost and margin, which only operators may read. */
export interface ProductCost {
  productId: string
  costKrw: number
  marginPct: number
  note: string
}

export async function loadProductCosts(): Promise<Record<string, ProductCost>> {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('product_costs')
    .select('product_id, cost_krw, margin_pct, note')
  if (error) {
    console.error('[skinverse] 원가 조회 실패', error.message)
    return {}
  }
  const out: Record<string, ProductCost> = {}
  for (const row of data ?? []) {
    out[row.product_id as string] = {
      productId: row.product_id as string,
      costKrw: Number(row.cost_krw ?? 0),
      marginPct: Number(row.margin_pct ?? 0),
      note: String(row.note ?? ''),
    }
  }
  return out
}

/**
 * The sale price a cost and a margin imply.
 *
 * Rounded to a whole won, because a price with a decimal in it is not a price
 * anyone in Korea writes. The operator can still override the result — margin
 * is a starting point, not a rule, and round numbers sell better than ₩39,203.
 */
export function priceFromMargin(costKrw: number, marginPct: number): number {
  if (!Number.isFinite(costKrw) || costKrw <= 0) return 0
  if (!Number.isFinite(marginPct) || marginPct <= -100) return 0
  return Math.round(costKrw * (1 + marginPct / 100))
}

/** The margin a cost and a sale price actually work out to. */
export function marginFromPrice(costKrw: number, priceKrw: number): number {
  if (!Number.isFinite(costKrw) || costKrw <= 0) return 0
  return ((priceKrw - costKrw) / costKrw) * 100
}

export async function saveProductCost(
  productId: string,
  costKrw: number,
  marginPct: number,
  note: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('product_costs').upsert({
    product_id: productId,
    cost_krw: Math.max(0, Math.round(costKrw)),
    margin_pct: marginPct,
    note,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('[skinverse] 원가 저장 실패', error.message)
  return !error
}

/**
 * Set the sale price, in won.
 *
 * The charged price follows from a database trigger rather than from anything
 * sent here — the browser must never be the thing that decides what a customer
 * is billed, which is the same rule the checkout follows.
 */
export async function setProductPrice(id: string, priceKrw: number): Promise<boolean> {
  if (!supabase) return false
  if (!Number.isFinite(priceKrw) || priceKrw < 0) return false

  const { error } = await supabase
    .from('products')
    .update({ price_krw: Math.round(priceKrw), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) console.error('[skinverse] 판매가 저장 실패', error.message)
  return !error
}

/** What a new catalogue entry needs before it can go on sale. */
export interface NewProduct {
  brand: string
  name: string
  kind: string
  ml: string
  tag: string
  metric: string
  gradient: string
  ingredients: string
  priceKrw: number
  stock: number
}

/**
 * Add a product.
 *
 * It arrives inactive whatever the operator intended. A new row has no
 * photograph, no localised copy and usually no stock, and a half-filled
 * product going straight onto the shelf is worse than one that needs a second
 * click — the storefront only shows `active` rows, so the second click is
 * where "is this ready?" gets answered.
 */
export async function createProduct(input: NewProduct): Promise<string | null> {
  if (!supabase) return null

  // Short, readable and unique enough: product ids appear in order lines that
  // are kept for five years, so they must not collide with an existing one.
  const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36)

  const { error } = await supabase.from('products').insert({
    id,
    brand: input.brand.trim(),
    name: input.name.trim(),
    kind: input.kind.trim(),
    ml: input.ml.trim(),
    tag: input.tag,
    metric: input.metric,
    gradient: input.gradient,
    ingredients: input.ingredients.trim(),
    // `price` is set by the trigger from price_krw; sending one here would be
    // the browser deciding what a customer pays.
    price: 0,
    price_krw: Math.max(0, Math.round(input.priceKrw)),
    stock: Math.max(0, Math.round(input.stock)),
    sold: 0,
    active: false,
    sort: 999,
  })

  if (error) {
    console.error('[skinverse] 상품 등록 실패', error.message)
    return null
  }
  return id
}

/**
 * How long one unit is expected to last.
 *
 * Only feeds the repurchase nudge, so a wrong value costs a mistimed
 * recommendation and nothing else — no price, no stock, no money.
 */
export async function setProductUseDays(id: string, days: number): Promise<boolean> {
  if (!supabase) return false
  const clamped = Math.max(1, Math.min(730, Math.round(days)))
  const { error } = await supabase.from('products').update({ use_days: clamped }).eq('id', id)
  if (error) console.error('[skinverse] 사용 기간 저장 실패', error.message)
  return !error
}
