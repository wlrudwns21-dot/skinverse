import type { Localized, ProductTag } from '../data/types'

export type ChipKey = 'All' | ProductTag

/** Shop filter labels, in the order the chips are rendered. */
export const chipLabels: Record<ChipKey, Localized> = {
  All: { en: 'All', ko: '전체', zh: '全部', th: 'ทั้งหมด' },
  Hydration: { en: 'Hydration', ko: '수분', zh: '补水', th: 'เติมน้ำ' },
  Soothing: { en: 'Soothing', ko: '진정', zh: '舒缓', th: 'ปลอบประโลม' },
  Pore: { en: 'Pore', ko: '모공', zh: '毛孔', th: 'รูขุมขน' },
  Brightening: { en: 'Brightening', ko: '미백', zh: '焕亮', th: 'ผิวกระจ่างใส' },
  SPF: { en: 'SPF', ko: '자외선 차단', zh: '防晒', th: 'กันแดด' },
}

export const chipKeys = Object.keys(chipLabels) as ChipKey[]
