import type { Lang } from '../data/types'
import type { ReasonKind } from '../routine/recommend'
import { sub, top } from './korean'

/**
 * How the report speaks.
 *
 * The findings themselves are decided in src/insights/report.ts — this file
 * only says them. Keeping the two apart means the rules can be reviewed without
 * reading copy, and the copy can be rewritten in four languages without anyone
 * touching a threshold by accident.
 *
 * Tone: state what was measured and what it means. No congratulating the
 * customer on a number that did not move, and no alarm over one that moved
 * within the noise — the thresholds in the report exist precisely so this file
 * is never asked to dress up a non-event.
 */
export interface InsightStrings {
  reportTitle: string
  reportSub: string

  weakest: (axis: string, score: number) => string
  even: (spread: number) => string
  strongest: (axis: string, score: number) => string

  overallUp: (delta: number, days: number) => string
  overallDown: (delta: number, days: number) => string
  axisUp: (axis: string, delta: number) => string
  axisDown: (axis: string, delta: number) => string

  weatherDriedOut: (delta: number, humidity: number) => string
  weatherHelped: (delta: number, humidity: number) => string

  skinAgeFlat: (age: number) => string
  skinAgeBetter: (age: number, delta: number) => string
  skinAgeWorse: (age: number, delta: number) => string

  zoneContrast: (tZone: string, uZone: string) => string
  vendorType: (label: string) => string
  oilinessUp: (delta: number) => string
  oilinessDown: (delta: number) => string
  firstScan: string

  /** Perfect Corp's eight skin-type labels, in the reader's language. */
  skinTypeLabel: Record<string, string>
  tZone: string
  uZone: string

  /** Why a product is being recommended, shown on its card. */
  reason: Record<ReasonKind, string>
  whyThis: string

  trendTitle: string
  trendSub: string
  noTrend: string
  scanCount: (n: number) => string
}

const ko: InsightStrings = {
  reportTitle: '분석 리포트',
  reportSub: '측정값이 실제로 말하는 것',

  weakest: (axis, score) => `${sub(axis)} ${score}점으로 가장 뒤처져 있어요. 이번 루틴은 여기에 집중합니다.`,
  even: (spread) => `여섯 항목이 ${spread}점 차이 안에 고르게 있어요. 특별히 급한 항목 없이 유지 관리 단계입니다.`,
  strongest: (axis, score) => `${top(axis)} ${score}점으로 좋은 상태예요. 지금 방식을 유지하세요.`,

  overallUp: (delta, days) => `${days}일 만에 종합 점수가 ${delta}점 올랐어요.`,
  overallDown: (delta, days) => `${days}일 만에 종합 점수가 ${delta}점 내려갔어요.`,
  axisUp: (axis, delta) => `${sub(axis)} ${delta}점 개선됐어요 — 가장 크게 변한 항목입니다.`,
  axisDown: (axis, delta) => `${sub(axis)} ${delta}점 떨어졌어요 — 가장 크게 변한 항목입니다.`,

  weatherDriedOut: (delta, humidity) =>
    `수분이 ${delta}점 내려갔지만, 같은 기간 습도도 ${Math.abs(humidity)}%p 떨어졌어요. 루틴 문제라기보다 공기가 건조해진 영향입니다.`,
  weatherHelped: (delta, humidity) =>
    `수분이 ${delta}점 올랐는데, 같은 기간 습도도 ${humidity}%p 올랐어요. 상당 부분은 날씨 덕입니다.`,

  skinAgeFlat: (age) => `AI 측정 피부 나이는 ${age}세입니다.`,
  skinAgeBetter: (age, delta) => `피부 나이가 ${delta}세 젊어져 ${age}세가 됐어요.`,
  skinAgeWorse: (age, delta) => `피부 나이가 ${delta}세 올라 ${age}세가 됐어요.`,

  zoneContrast: (t, u) => `T존은 ${t}, U존은 ${u}로 다르게 나왔어요. 부위별로 다른 제형을 쓰는 게 좋습니다.`,
  vendorType: (label) => `AI 판정 피부 타입: ${label}`,
  oilinessUp: (delta) => `유분 지수가 ${delta}점 좋아졌어요 (피지가 줄었습니다).`,
  oilinessDown: (delta) => `유분 지수가 ${delta}점 나빠졌어요 (피지가 늘었습니다).`,
  firstScan: '첫 분석이에요. 다음 분석부터 변화를 추적해드립니다.',

  skinTypeLabel: {
    Normal: '중성', Oily: '지성', Dry: '건성', Combination: '복합성', Redness: '민감성(홍조)',
    'Dry & Redness': '건성 · 홍조', 'Oily & Redness': '지성 · 홍조',
    'Combination & Redness': '복합성 · 홍조',
  },
  tZone: 'T존', uZone: 'U존',

  reason: {
    axisNeed: '가장 필요한 항목',
    focusAxis: '이번 집중 항목',
    axisFalling: '최근 하락 중',
    dryAir: '건조한 공기',
    humidAir: '높은 습도',
    heat: '높은 기온 · 피지 증가',
    cold: '추위 · 장벽 자극',
    uvLoad: '자외선 지수',
    oilySkin: '지성 피부',
    drySkin: '건성 피부',
  },
  whyThis: '추천 이유',

  trendTitle: '변화 추이',
  trendSub: '분석할 때의 습도와 함께 표시됩니다',
  noTrend: '분석을 두 번 이상 하면 변화 추이가 표시됩니다.',
  scanCount: (n) => `분석 ${n}회`,
}

const en: InsightStrings = {
  reportTitle: 'Analysis report',
  reportSub: 'What the measurements actually say',

  weakest: (axis, score) => `${axis} is furthest behind at ${score}. This routine targets it.`,
  even: (spread) => `All six axes sit within ${spread} points of each other. Nothing urgent — this is maintenance.`,
  strongest: (axis, score) => `${axis} is in good shape at ${score}. Keep doing what you are doing.`,

  overallUp: (delta, days) => `Your overall score rose ${delta} points in ${days} days.`,
  overallDown: (delta, days) => `Your overall score fell ${delta} points in ${days} days.`,
  axisUp: (axis, delta) => `${axis} improved by ${delta} points — the biggest change this time.`,
  axisDown: (axis, delta) => `${axis} fell by ${delta} points — the biggest change this time.`,

  weatherDriedOut: (delta, humidity) =>
    `Hydration fell ${delta} points, but humidity fell ${Math.abs(humidity)} points over the same period. That is the air, not your routine.`,
  weatherHelped: (delta, humidity) =>
    `Hydration rose ${delta} points, and humidity rose ${humidity} points over the same period. Much of this is the weather.`,

  skinAgeFlat: (age) => `Your AI-measured skin age is ${age}.`,
  skinAgeBetter: (age, delta) => `Your skin age dropped ${delta} years, to ${age}.`,
  skinAgeWorse: (age, delta) => `Your skin age rose ${delta} years, to ${age}.`,

  zoneContrast: (t, u) => `Your T-zone reads ${t} and your U-zone reads ${u}. Different textures on different areas will serve you better.`,
  vendorType: (label) => `AI skin type: ${label}`,
  oilinessUp: (delta) => `Your oiliness score improved by ${delta} points — less sebum.`,
  oilinessDown: (delta) => `Your oiliness score fell ${delta} points — more sebum.`,
  firstScan: 'This is your first analysis. From the next one, we will track what changes.',

  skinTypeLabel: {
    Normal: 'Normal', Oily: 'Oily', Dry: 'Dry', Combination: 'Combination', Redness: 'Redness-prone',
    'Dry & Redness': 'Dry · Redness-prone', 'Oily & Redness': 'Oily · Redness-prone',
    'Combination & Redness': 'Combination · Redness-prone',
  },
  tZone: 'T-zone', uZone: 'U-zone',

  reason: {
    axisNeed: 'Your lowest-scoring need',
    focusAxis: 'This cycle’s focus',
    axisFalling: 'Declining recently',
    dryAir: 'Dry air',
    humidAir: 'High humidity',
    heat: 'Heat · more sebum',
    cold: 'Cold · barrier stress',
    uvLoad: 'UV index',
    oilySkin: 'Oily skin',
    drySkin: 'Dry skin',
  },
  whyThis: 'Why this',

  trendTitle: 'Your trend',
  trendSub: 'Shown with the humidity at each scan',
  noTrend: 'Scan twice or more to see how your skin changes.',
  scanCount: (n) => `${n} scans`,
}

const zh: InsightStrings = {
  reportTitle: '分析报告',
  reportSub: '数据真正说明了什么',

  weakest: (axis, score) => `${axis}最为落后，仅 ${score} 分。本次方案将重点改善这一项。`,
  even: (spread) => `六项指标相差在 ${spread} 分以内，分布均衡。没有紧急项，属于维持阶段。`,
  strongest: (axis, score) => `${axis}状态良好，${score} 分。请保持目前的做法。`,

  overallUp: (delta, days) => `${days} 天内综合评分上升了 ${delta} 分。`,
  overallDown: (delta, days) => `${days} 天内综合评分下降了 ${delta} 分。`,
  axisUp: (axis, delta) => `${axis}提升了 ${delta} 分 — 本次变化最大的一项。`,
  axisDown: (axis, delta) => `${axis}下降了 ${delta} 分 — 本次变化最大的一项。`,

  weatherDriedOut: (delta, humidity) =>
    `水分下降了 ${delta} 分，但同期湿度也下降了 ${Math.abs(humidity)} 个百分点。这是空气变干，不是护肤方案的问题。`,
  weatherHelped: (delta, humidity) =>
    `水分上升了 ${delta} 分，同期湿度也上升了 ${humidity} 个百分点。其中相当一部分来自天气。`,

  skinAgeFlat: (age) => `AI 测定肌肤年龄为 ${age} 岁。`,
  skinAgeBetter: (age, delta) => `肌肤年龄年轻了 ${delta} 岁，现为 ${age} 岁。`,
  skinAgeWorse: (age, delta) => `肌肤年龄增加了 ${delta} 岁，现为 ${age} 岁。`,

  zoneContrast: (t, u) => `T 区为${t}，U 区为${u}，两者不同。建议分区使用不同质地的产品。`,
  vendorType: (label) => `AI 判定肤质：${label}`,
  oilinessUp: (delta) => `油脂指数改善了 ${delta} 分（皮脂减少）。`,
  oilinessDown: (delta) => `油脂指数下降了 ${delta} 分（皮脂增加）。`,
  firstScan: '这是你的第一次分析。从下次开始，我们会为你追踪变化。',

  skinTypeLabel: {
    Normal: '中性', Oily: '油性', Dry: '干性', Combination: '混合性', Redness: '易泛红',
    'Dry & Redness': '干性 · 易泛红', 'Oily & Redness': '油性 · 易泛红',
    'Combination & Redness': '混合性 · 易泛红',
  },
  tZone: 'T 区', uZone: 'U 区',

  reason: {
    axisNeed: '最需要改善的一项',
    focusAxis: '本轮重点',
    axisFalling: '近期下降',
    dryAir: '空气干燥',
    humidAir: '湿度偏高',
    heat: '高温 · 皮脂增多',
    cold: '寒冷 · 屏障受压',
    uvLoad: '紫外线指数',
    oilySkin: '油性肌肤',
    drySkin: '干性肌肤',
  },
  whyThis: '推荐理由',

  trendTitle: '变化趋势',
  trendSub: '与每次分析时的湿度一同显示',
  noTrend: '完成两次以上分析后即可查看变化趋势。',
  scanCount: (n) => `分析 ${n} 次`,
}

const th: InsightStrings = {
  reportTitle: 'รายงานการวิเคราะห์',
  reportSub: 'สิ่งที่ตัวเลขบอกจริง ๆ',

  weakest: (axis, score) => `${axis} ตามหลังมากที่สุดที่ ${score} คะแนน รูทีนรอบนี้จะเน้นที่จุดนี้`,
  even: (spread) => `ทั้งหกด้านห่างกันไม่เกิน ${spread} คะแนน ไม่มีอะไรเร่งด่วน เป็นช่วงดูแลรักษา`,
  strongest: (axis, score) => `${axis} อยู่ในเกณฑ์ดีที่ ${score} คะแนน ทำแบบเดิมต่อไปได้เลย`,

  overallUp: (delta, days) => `คะแนนรวมเพิ่มขึ้น ${delta} คะแนนใน ${days} วัน`,
  overallDown: (delta, days) => `คะแนนรวมลดลง ${delta} คะแนนใน ${days} วัน`,
  axisUp: (axis, delta) => `${axis} ดีขึ้น ${delta} คะแนน — เปลี่ยนแปลงมากที่สุดในรอบนี้`,
  axisDown: (axis, delta) => `${axis} ลดลง ${delta} คะแนน — เปลี่ยนแปลงมากที่สุดในรอบนี้`,

  weatherDriedOut: (delta, humidity) =>
    `ความชุ่มชื้นลดลง ${delta} คะแนน แต่ความชื้นในอากาศก็ลดลง ${Math.abs(humidity)} จุดในช่วงเดียวกัน นี่คืออากาศ ไม่ใช่รูทีนของคุณ`,
  weatherHelped: (delta, humidity) =>
    `ความชุ่มชื้นเพิ่มขึ้น ${delta} คะแนน และความชื้นในอากาศก็เพิ่มขึ้น ${humidity} จุดในช่วงเดียวกัน ส่วนใหญ่มาจากสภาพอากาศ`,

  skinAgeFlat: (age) => `อายุผิวที่ AI วัดได้คือ ${age} ปี`,
  skinAgeBetter: (age, delta) => `อายุผิวลดลง ${delta} ปี เหลือ ${age} ปี`,
  skinAgeWorse: (age, delta) => `อายุผิวเพิ่มขึ้น ${delta} ปี เป็น ${age} ปี`,

  zoneContrast: (t, u) => `ทีโซนเป็น${t} ส่วนยูโซนเป็น${u} ใช้เนื้อผลิตภัณฑ์ต่างกันในแต่ละบริเวณจะดีกว่า`,
  vendorType: (label) => `ประเภทผิวที่ AI ระบุ: ${label}`,
  oilinessUp: (delta) => `ค่าความมันดีขึ้น ${delta} คะแนน (ซีบัมลดลง)`,
  oilinessDown: (delta) => `ค่าความมันแย่ลง ${delta} คะแนน (ซีบัมเพิ่มขึ้น)`,
  firstScan: 'นี่คือการวิเคราะห์ครั้งแรกของคุณ ตั้งแต่ครั้งหน้าเราจะติดตามการเปลี่ยนแปลงให้',

  skinTypeLabel: {
    Normal: 'ผิวธรรมดา', Oily: 'ผิวมัน', Dry: 'ผิวแห้ง', Combination: 'ผิวผสม', Redness: 'ผิวแดงง่าย',
    'Dry & Redness': 'ผิวแห้ง · แดงง่าย', 'Oily & Redness': 'ผิวมัน · แดงง่าย',
    'Combination & Redness': 'ผิวผสม · แดงง่าย',
  },
  tZone: 'ทีโซน', uZone: 'ยูโซน',

  reason: {
    axisNeed: 'จุดที่ต้องการที่สุด',
    focusAxis: 'จุดเน้นรอบนี้',
    axisFalling: 'กำลังลดลง',
    dryAir: 'อากาศแห้ง',
    humidAir: 'ความชื้นสูง',
    heat: 'อากาศร้อน · ซีบัมมากขึ้น',
    cold: 'อากาศเย็น · เกราะผิวอ่อนล้า',
    uvLoad: 'ดัชนียูวี',
    oilySkin: 'ผิวมัน',
    drySkin: 'ผิวแห้ง',
  },
  whyThis: 'เหตุผลที่แนะนำ',

  trendTitle: 'แนวโน้มของคุณ',
  trendSub: 'แสดงพร้อมความชื้นในแต่ละครั้งที่วิเคราะห์',
  noTrend: 'วิเคราะห์ตั้งแต่สองครั้งขึ้นไปเพื่อดูแนวโน้ม',
  scanCount: (n) => `วิเคราะห์ ${n} ครั้ง`,
}

const table: Record<Lang, InsightStrings> = { ko, en, zh, th }

export const insightT = (lang: Lang): InsightStrings => table[lang]
