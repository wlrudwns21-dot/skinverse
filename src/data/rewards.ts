import type { Level, Mission, Reward } from './types'

/** SAMPLE DATA — daily missions. */
export const dailyMissions: Mission[] = [
  { id: 'm1', pts: 20, l: { en: 'Complete AM routine', ko: '아침 루틴 완료', zh: '完成早间护肤', th: 'ทำรูทีนเช้าครบ' } },
  { id: 'm2', pts: 10, l: { en: 'Apply SPF 50+', ko: '선크림 바르기', zh: '涂抹 SPF50+', th: 'ทากันแดด SPF50+' } },
  { id: 'm3', pts: 10, l: { en: 'Drink 1.5L water', ko: '물 1.5L 마시기', zh: '喝水1.5升', th: 'ดื่มน้ำ 1.5 ลิตร' } },
  { id: 'm4', pts: 20, l: { en: 'Complete PM routine', ko: '저녁 루틴 완료', zh: '完成晚间护肤', th: 'ทำรูทีนเย็นครบ' } },
]

/** SAMPLE DATA — weekly missions. `w2` is auto-claimed by the first scan. */
export const weeklyMissions: Mission[] = [
  { id: 'w1', pts: 50, l: { en: 'Use sheet mask 2×', ko: '시트 마스크 2회 사용', zh: '敷面膜2次', th: 'มาสก์แผ่น 2 ครั้ง' } },
  { id: 'w2', pts: 30, l: { en: 'Weekly AI skin scan', ko: '주간 AI 피부 스캔', zh: '每周AI肌肤扫描', th: 'สแกนผิว AI รายสัปดาห์' } },
]

/** SAMPLE DATA — point-redeemable rewards. */
export const rewards: Reward[] = [
  { id: 'r1', cost: 300, l: { en: 'Cica Cream Sample 5ml', ko: '시카 크림 샘플 5ml', zh: '积雪草面霜小样 5ml', th: 'เทสเตอร์ครีมซิก้า 5ml' } },
  { id: 'r2', cost: 500, l: { en: 'Glow Ampoule Sample 3ml', ko: '글로우 앰플 샘플 3ml', zh: '焕亮安瓶小样 3ml', th: 'เทสเตอร์แอมพูล 3ml' } },
  { id: 'r3', cost: 800, l: { en: 'Sheet Mask 3-Pack', ko: '시트 마스크 3매', zh: '面膜3片装', th: 'มาสก์แผ่น 3 ชิ้น' } },
  { id: 'r4', cost: 500, l: { en: '$5 Off Coupon', ko: '5달러 할인 쿠폰', zh: '5美元优惠券', th: 'คูปองลด $5' } },
]

/** SAMPLE DATA — level thresholds, ascending by point requirement. */
export const levels: Level[] = [
  [0, 'Glow Starter'],
  [500, 'Dewy'],
  [1500, 'Radiant'],
  [4000, 'Luminary'],
]
