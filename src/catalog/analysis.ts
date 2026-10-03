import { metricDefs } from '../data/skin'
import type { Lang, Localized, MetricKey } from '../data/types'

/** How strongly a product speaks to one scan reading. */
export type FitStrength = 'primary' | 'secondary'

/** One product's claim on one scan axis, as stored in `products.fits`. */
export interface Fit {
  /** A scan axis, or 'uv' which matches on the local UV index instead. */
  axis: MetricKey | 'uv'
  strength: FitStrength
  note: Localized
}

export type Slot = 'am' | 'pm' | 'both'

/**
 * Axis names for the detail page.
 *
 * The six scan axes come from `metricDefs`, so the name a customer reads under
 * their own reading and the name they read on a product are the same word. UV
 * is added here because it is not a scan axis — it is matched on the local UV
 * index — and so has no row there.
 */
const UV: Localized = { ko: '자외선', en: 'UV', zh: '紫外线', th: 'รังสียูวี' }

export function axisName(axis: MetricKey | 'uv', lang: Lang): string {
  if (axis === 'uv') return UV[lang]
  return metricDefs.find((d) => d.k === axis)?.n[lang] ?? axis
}

/**
 * When in the day the product goes on.
 *
 * `am` says morning rather than "day" because the thing being answered is
 * which of the two routines it belongs to, not when sunlight is.
 */
export const slotNames: Record<Slot, Localized> = {
  am: { ko: '아침', en: 'Morning', zh: '早间', th: 'เช้า' },
  pm: { ko: '저녁', en: 'Evening', zh: '晚间', th: 'เย็น' },
  both: { ko: '아침 · 저녁', en: 'Morning & evening', zh: '早晚', th: 'เช้าและเย็น' },
}

/** Which step of the routine it is, in the order a routine is applied. */
export const stepNames: Record<string, Localized> = {
  cleanser: { ko: '클렌저', en: 'Cleanser', zh: '洁面', th: 'คลีนเซอร์' },
  toner: { ko: '토너 · 미스트', en: 'Toner / mist', zh: '化妆水 / 喷雾', th: 'โทนเนอร์ / มิสต์' },
  serum: { ko: '세럼', en: 'Serum', zh: '精华', th: 'เซรั่ม' },
  cream: { ko: '크림', en: 'Cream', zh: '面霜', th: 'ครีม' },
  spf: { ko: '자외선차단', en: 'Sunscreen', zh: '防晒', th: 'กันแดด' },
  mask: { ko: '마스크', en: 'Mask', zh: '面膜', th: 'มาสก์' },
}

export function stepName(step: string, lang: Lang): string {
  return stepNames[step]?.[lang] ?? step
}

/**
 * Headings for the analysis block.
 *
 * Worded as what they are rather than as what would sell better: the pros
 * heading says these were read off the ingredient list, and the cons heading
 * says to watch for them — neither claims a result on skin.
 */
export const analysisLabels = {
  routine: { ko: '루틴에서의 자리', en: 'Where it sits in a routine', zh: '在护肤流程中的位置', th: 'ตำแหน่งในรูทีน' },
  slot: { ko: '사용 시간', en: 'When', zh: '使用时间', th: 'เวลาใช้' },
  step: { ko: '단계', en: 'Step', zh: '步骤', th: 'ขั้นตอน' },
  fits: { ko: '어떤 피부에 맞는지', en: 'Which readings it answers', zh: '适合哪些肌肤指标', th: 'ตอบโจทย์ค่าใด' },
  pros: { ko: '성분에서 확인한 점', en: 'Read off the ingredient list', zh: '从成分表读到的', th: 'อ่านได้จากรายการส่วนผสม' },
  cons: { ko: '쓰기 전에 알아둘 점', en: 'Worth knowing before you use it', zh: '使用前需知', th: 'ควรรู้ก่อนใช้' },
  primary: { ko: '주', en: 'Primary', zh: '主要', th: 'หลัก' },
  secondary: { ko: '부', en: 'Also', zh: '次要', th: 'รอง' },
  /**
   * Shown in place of the analysis when the ingredient list is unverified.
   * A product in that state cannot be sold at all — the database refuses it —
   * so this exists for the operator previewing a draft, not for a shopper.
   */
  unchecked: {
    ko: '성분표가 아직 확인되지 않아 분석을 표시하지 않습니다.',
    en: 'The ingredient list has not been verified, so no analysis is shown.',
    zh: '成分表尚未核实，故不显示分析。',
    th: 'ยังไม่ได้ตรวจสอบรายการส่วนผสม จึงไม่แสดงผลวิเคราะห์',
  },
} satisfies Record<string, Localized>
