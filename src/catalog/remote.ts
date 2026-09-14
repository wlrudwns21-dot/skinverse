import { supabase } from '../lib/supabase'
import { products as seedProducts } from '../data/products'
import { dailyMissions, rewards as seedRewards, weeklyMissions } from '../data/rewards'
import { pointsRules } from '../data/commerce'
import {
  toCatalogProduct,
  type CatalogMission,
  type CatalogProduct,
  type CatalogReward,
  type ProductRow,
  type StoreSettings,
} from './types'

export interface Catalog {
  products: CatalogProduct[]
  missions: CatalogMission[]
  rewards: CatalogReward[]
  settings: StoreSettings
}

/**
 * What the app renders before the first query returns, and what it falls back to
 * if the database is unreachable. Keeping `src/data` as the seed means a network
 * hiccup shows a slightly stale shop rather than an empty one.
 */
export const SEED_CATALOG: Catalog = {
  products: seedProducts.map((p) => ({ ...p, stock: 0, sold: 0, active: true })),
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
}

export async function loadCatalog(): Promise<Catalog> {
  if (!supabase) return SEED_CATALOG

  const [products, missions, rewards, settings] = await Promise.all([
    supabase.from('products').select('*').order('sort'),
    supabase.from('missions').select('*').order('sort'),
    supabase.from('rewards').select('*').order('sort'),
    supabase.from('store_settings').select('*').maybeSingle(),
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
  }
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
