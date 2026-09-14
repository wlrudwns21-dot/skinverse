import type { MetricDef, SkinCondition, SkinConditionKey } from './types'

/**
 * SAMPLE DATA — the three canned scan outcomes the prototype demos.
 * Replace with the real analysis response from your AI scan service.
 */
export const conditions: Record<SkinConditionKey, SkinCondition> = {
  dehydrated: {
    overall: 62,
    m: { hydration: 42, elasticity: 71, pores: 55, pigmentation: 63, wrinkles: 78, sensitivity: 47 },
    type: {
      en: 'Dehydrated · Sensitive-prone',
      ko: '수분 부족 · 민감성',
      zh: '缺水 · 易敏感',
      th: 'ผิวขาดน้ำ · แพ้ง่าย',
    },
    sum: {
      en: 'Your moisture barrier is running low — water loss is elevated, which amplifies sensitivity. Focus on humectant layering and barrier repair for 4 weeks, and keep actives gentle.',
      ko: '수분 장벽이 약해져 수분 손실이 높고 민감도가 올라간 상태예요. 앞으로 4주간 보습 레이어링과 장벽 회복에 집중하고, 액티브 성분은 순하게 유지하세요.',
      zh: '你的水分屏障偏弱 — 经皮失水偏高，会放大敏感。接下来4周专注保湿叠加与屏障修护，活性成分保持温和。',
      th: 'เกราะความชุ่มชื้นของคุณอ่อนแอ — ผิวสูญเสียน้ำสูงจึงไวต่อการระคายเคือง โฟกัสการเลเยอร์มอยส์เจอไรเซอร์และฟื้นฟูเกราะผิว 4 สัปดาห์ และใช้แอคทีฟอ่อนโยน',
    },
  },
  oily: {
    overall: 68,
    m: { hydration: 58, elasticity: 74, pores: 38, pigmentation: 66, wrinkles: 82, sensitivity: 60 },
    type: {
      en: 'Oily · Congestion-prone',
      ko: '지성 · 모공 관리 필요',
      zh: '油性 · 易堵塞毛孔',
      th: 'ผิวมัน · รูขุมขนอุดตันง่าย',
    },
    sum: {
      en: 'Sebum output is high and pores show congestion around the T-zone. Prioritize gentle PHA exfoliation and lightweight hydration — do not strip the skin, it rebounds with more oil.',
      ko: '피지 분비가 많고 T존 모공에 막힘이 보여요. 순한 PHA 각질 케어와 가벼운 수분 공급을 우선하세요 — 과하게 닦아내면 오히려 유분이 늘어납니다.',
      zh: '皮脂分泌旺盛，T区毛孔有堵塞。优先温和PHA去角质与轻盈补水 — 不要过度清洁，否则会反弹出更多油。',
      th: 'ผิวผลิตซีบัมมากและรูขุมขนบริเวณทีโซนอุดตัน ให้เน้นผลัดเซลล์ผิวด้วย PHA อ่อนโยนและเติมน้ำแบบบางเบา — อย่าล้างจนผิวแห้งตึง เพราะผิวจะยิ่งผลิตน้ำมัน',
    },
  },
  balanced: {
    overall: 81,
    m: { hydration: 72, elasticity: 80, pores: 70, pigmentation: 74, wrinkles: 84, sensitivity: 76 },
    type: {
      en: 'Balanced · Maintenance',
      ko: '균형 잡힌 피부 · 유지 관리',
      zh: '均衡 · 保养维持',
      th: 'ผิวสมดุล · ดูแลรักษา',
    },
    sum: {
      en: 'Skin is in healthy equilibrium. Maintain the barrier with consistent SPF and antioxidant support — prevention is the whole game from here.',
      ko: '피부가 건강한 균형 상태예요. 꾸준한 자외선 차단과 항산화 케어로 장벽을 유지하세요 — 지금부터는 예방이 전부입니다.',
      zh: '肌肤处于健康平衡状态。坚持防晒与抗氧化护理来维持屏障 — 从现在起，预防就是一切。',
      th: 'ผิวอยู่ในสมดุลที่ดี รักษาเกราะผิวด้วยกันแดดสม่ำเสมอและสารต้านอนุมูลอิสระ — จากนี้ไปการป้องกันคือทุกอย่าง',
    },
  },
}

/** The six axes, in the order they are listed on the results screen. */
export const metricDefs: MetricDef[] = [
  { k: 'hydration', n: { en: 'Hydration', ko: '수분', zh: '水分', th: 'ความชุ่มชื้น' } },
  { k: 'elasticity', n: { en: 'Elasticity', ko: '탄력', zh: '弹性', th: 'ความยืดหยุ่น' } },
  { k: 'pores', n: { en: 'Pores', ko: '모공', zh: '毛孔', th: 'รูขุมขน' } },
  { k: 'pigmentation', n: { en: 'Pigmentation', ko: '색소침착', zh: '色素沉着', th: 'จุดด่างดำ' } },
  { k: 'wrinkles', n: { en: 'Fine Lines', ko: '주름', zh: '细纹', th: 'ริ้วรอย' } },
  { k: 'sensitivity', n: { en: 'Sensitivity', ko: '민감도', zh: '敏感度', th: 'ความบอบบาง' } },
]

export const defaultSkinCondition: SkinConditionKey = 'dehydrated'
