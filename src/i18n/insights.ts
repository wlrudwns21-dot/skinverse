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

  /** The overlay viewer and the full concern list. */
  map: { title: string; sub: string; none: string; expires: string }
  detail: {
    title: string; sub: string; skinType: string
    tapForMore: string; measured: string; whatToDo: string
  }

  /** The panel that shows what the routine was decided from. */
  basis: {
    title: string; sub: string; show: string; hide: string
    weatherTitle: string; derivedTitle: string; faceTitle: string
    temp: string; humidity: string; uv: string
    vpd: string; vpdHelp: string
    absHumidity: string; absHumidityHelp: string
    dewPoint: string; dewPointHelp: string
    occlusiveYes: string; occlusiveNo: string
    drynessLoad: string; sebumLoad: string; coldStress: string; loadHelp: string
    weakest: string; weakestHelp: (axis: string) => string
    hydrationRead: (score: number, threshold: number) => string
    hydrationOk: (score: number, threshold: number) => string
  }

  trendTitle: string
  trendSub: string
  noTrend: string
  scanCount: (n: number) => string

  /** The chart's axis picker: the overall score, or one measurement. */
  trendOverall: string

  /**
   * The whole record in one line — the distance travelled since the first
   * scan, which the scan-to-scan findings cannot show.
   */
  sinceFirst: string
  sinceFirstUp: (delta: number, scans: number, days: number) => string
  sinceFirstDown: (delta: number, scans: number, days: number) => string
  sinceFirstFlat: (scans: number, days: number) => string

  /** On the home card: how the latest scan compares with the one before it. */
  vsLastUp: (delta: number) => string
  vsLastDown: (delta: number) => string
  vsLastFlat: string
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

  map: {
    title: '피부 맵',
    sub: '항목을 누르면 내 사진 위에 실제 검출 결과가 표시됩니다',
    none: '이번 분석에서는 검출 이미지를 받지 못했어요. 점수는 아래에서 확인하실 수 있습니다.',
    expires: '검출 이미지는 이 화면에서만 잠시 표시되며 저장되지 않습니다.',
  },
  detail: {
    title: '항목별 상세', sub: 'AI가 측정한 16개 항목 전체',
    skinType: 'AI 판정 피부 타입', tapForMore: '눌러서 자세히',
    measured: '무엇을 잰 값인가요', whatToDo: '이럴 땐',
  },

  basis: {
    title: '이 루틴의 근거', sub: '무엇을 재서 이렇게 나왔는지', show: '자세히', hide: '접기',
    weatherTitle: '측정한 날씨', derivedTitle: '피부에 실제로 작용하는 값', faceTitle: 'AI 분석에서 읽은 값',
    temp: '기온', humidity: '상대습도', uv: '자외선 지수',
    vpd: '수증기압차(VPD)',
    vpdHelp: '피부 표면(32°C 포화)과 공기의 압력 차이. 수분을 끌어내는 실제 힘이에요.',
    absHumidity: '절대습도',
    absHumidityHelp: '공기가 실제로 품고 있는 물의 양. 상대습도와 달리 기온에 속지 않습니다.',
    dewPoint: '이슬점',
    dewPointHelp: '24°C를 넘으면 땀이 마르지 않아 무거운 제형이 겉돕니다.',
    occlusiveYes: '이슬점이 24°C를 넘었습니다 — 땀이 증발하지 않아 크림·오일은 흡수되지 않고 겉돕니다. 분석 결과와 무관하게 젤 제형을 적용했습니다.',
    occlusiveNo: '이슬점이 24°C 아래라 땀이 정상적으로 증발합니다. 제형 선택은 건조 부하와 분석 결과가 결정합니다.',
    drynessLoad: '건조 부하', sebumLoad: '피지 부하', coldStress: '한랭 자극',
    loadHelp: '건조 부하는 절대습도와 수증기압차를, 피지 부하는 기온과 이슬점을 조합한 값입니다(0~100). 피지 축에는 상대습도를 넣지 않습니다 — 온도가 같으면 습도는 피지 분비를 바꾸지 않기 때문이에요.',
    weakest: '가장 낮은 항목',
    weakestHelp: (axis) => `${axis}이(가) 가장 낮게 나와, 아침·저녁 트리트먼트 단계를 여기에 맞췄습니다.`,
    hydrationRead: (score, threshold) => `수분 ${score}점으로 기준(${threshold}점) 아래입니다. 날씨와 별개로 제형을 한 단계 더 리치하게 올렸습니다.`,
    hydrationOk: (score, threshold) => `수분 ${score}점으로 기준(${threshold}점) 이상입니다. 제형은 날씨만으로 결정했습니다.`,
  },

  trendTitle: '변화 추이',
  trendSub: '분석할 때의 습도와 함께 표시됩니다',
  noTrend: '분석을 두 번 이상 하면 변화 추이가 표시됩니다.',
  scanCount: (n) => `분석 ${n}회`,
  trendOverall: '종합 점수',
  sinceFirst: '첫 분석 이후',
  sinceFirstUp: (d, n, days) => `첫 분석 이후 ${d}점 올랐어요 · ${n}회 · ${days}일`,
  sinceFirstDown: (d, n, days) => `첫 분석 이후 ${d}점 내려갔어요 · ${n}회 · ${days}일`,
  sinceFirstFlat: (n, days) => `첫 분석 이후 큰 변화 없음 · ${n}회 · ${days}일`,
  vsLastUp: (d) => `지난 분석보다 +${d}`,
  vsLastDown: (d) => `지난 분석보다 −${d}`,
  vsLastFlat: '지난 분석과 비슷',
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

  map: {
    title: 'Skin map',
    sub: 'Tap a concern to see what was actually detected, on your own photo',
    none: 'No detection images came back with this analysis. The scores are below.',
    expires: 'Detection images are shown here only and are never stored.',
  },
  detail: {
    title: 'Every reading', sub: 'All sixteen concerns the AI measured',
    skinType: 'AI skin type', tapForMore: 'Tap for detail',
    measured: 'What this measures', whatToDo: 'What to do',
  },

  basis: {
    title: 'Why this routine', sub: 'What was measured to arrive at it', show: 'Detail', hide: 'Hide',
    weatherTitle: 'Measured conditions', derivedTitle: 'What that does to skin', faceTitle: 'Read from your analysis',
    temp: 'Temperature', humidity: 'Relative humidity', uv: 'UV index',
    vpd: 'Vapour pressure deficit',
    vpdHelp: 'The gap between your skin surface (32°C, saturated) and the air. This is the force pulling water out.',
    absHumidity: 'Absolute humidity',
    absHumidityHelp: 'How much water the air is really carrying. Unlike the percentage, it is not fooled by temperature.',
    dewPoint: 'Dew point',
    dewPointHelp: 'Past 24°C sweat stops evaporating and heavy textures sit on the surface.',
    occlusiveYes: 'The dew point is above 24°C — sweat is not evaporating, so creams and oils will sit on top rather than absorb. A gel was chosen regardless of what the analysis said.',
    occlusiveNo: 'The dew point is below 24°C, so sweat evaporates normally. Texture was decided by the dryness load and your analysis.',
    drynessLoad: 'Dryness load', sebumLoad: 'Sebum load', coldStress: 'Cold stress',
    loadHelp: 'Dryness load combines absolute humidity with the vapour pressure deficit; sebum load combines temperature with dew point (0–100). Relative humidity is deliberately absent from the sebum axis — at a fixed temperature it does not change sebum output.',
    weakest: 'Lowest reading',
    weakestHelp: (axis) => `${axis} came back lowest, so the morning and evening treatment steps target it.`,
    hydrationRead: (score, threshold) => `Hydration measured ${score}, below the ${threshold} threshold. The texture was moved one step richer independently of the weather.`,
    hydrationOk: (score, threshold) => `Hydration measured ${score}, at or above the ${threshold} threshold, so texture was decided by the weather alone.`,
  },

  trendTitle: 'Your trend',
  trendSub: 'Shown with the humidity at each scan',
  noTrend: 'Scan twice or more to see how your skin changes.',
  scanCount: (n) => `${n} scans`,
  trendOverall: 'Overall',
  sinceFirst: 'Since your first scan',
  sinceFirstUp: (d, n, days) => `Up ${d} points since your first scan · ${n} scans · ${days} days`,
  sinceFirstDown: (d, n, days) => `Down ${d} points since your first scan · ${n} scans · ${days} days`,
  sinceFirstFlat: (n, days) => `Holding steady since your first scan · ${n} scans · ${days} days`,
  vsLastUp: (d) => `+${d} on your last scan`,
  vsLastDown: (d) => `−${d} on your last scan`,
  vsLastFlat: 'Level with your last scan',
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

  map: {
    title: '肌肤地图',
    sub: '点击项目，在你的照片上查看实际检测结果',
    none: '本次分析未返回检测图像，评分见下方。',
    expires: '检测图像仅在此页面临时显示，不会被保存。',
  },
  detail: {
    title: '各项详情', sub: 'AI 测定的全部 16 个项目',
    skinType: 'AI 判定肤质', tapForMore: '点击查看详情',
    measured: '这项测的是什么', whatToDo: '该怎么做',
  },

  basis: {
    title: '这套方案的依据', sub: '测了什么才得出这个结果', show: '详情', hide: '收起',
    weatherTitle: '实测天气', derivedTitle: '对皮肤实际起作用的量', faceTitle: '从AI分析中读取',
    temp: '气温', humidity: '相对湿度', uv: '紫外线指数',
    vpd: '水汽压差（VPD）',
    vpdHelp: '皮肤表面（32°C饱和）与空气之间的压差，这才是带走水分的真正作用力。',
    absHumidity: '绝对湿度',
    absHumidityHelp: '空气实际含有的水量。与百分比不同，它不会被气温误导。',
    dewPoint: '露点',
    dewPointHelp: '超过24°C时汗液不再蒸发，厚重质地会浮在表面。',
    occlusiveYes: '露点高于24°C — 汗液无法蒸发，面霜与油类只会浮在表面而不被吸收。因此无论分析结果如何，均采用凝胶质地。',
    occlusiveNo: '露点低于24°C，汗液正常蒸发。质地由干燥负荷与分析结果共同决定。',
    drynessLoad: '干燥负荷', sebumLoad: '皮脂负荷', coldStress: '低温刺激',
    loadHelp: '干燥负荷结合绝对湿度与水汽压差；皮脂负荷结合气温与露点（0~100）。皮脂轴刻意不含相对湿度 — 温度固定时湿度不改变皮脂分泌。',
    weakest: '最低项',
    weakestHelp: (axis) => `${axis}的分数最低，因此早晚的精华步骤针对这一项。`,
    hydrationRead: (score, threshold) => `水分为 ${score} 分，低于 ${threshold} 分的阈值。已在天气之外额外将质地提升一档。`,
    hydrationOk: (score, threshold) => `水分为 ${score} 分，达到或高于 ${threshold} 分阈值，质地仅由天气决定。`,
  },

  trendTitle: '变化趋势',
  trendSub: '与每次分析时的湿度一同显示',
  noTrend: '完成两次以上分析后即可查看变化趋势。',
  scanCount: (n) => `分析 ${n} 次`,
  trendOverall: '综合评分',
  sinceFirst: '自首次分析以来',
  sinceFirstUp: (d, n, days) => `自首次分析以来上升 ${d} 分 · ${n} 次 · ${days} 天`,
  sinceFirstDown: (d, n, days) => `自首次分析以来下降 ${d} 分 · ${n} 次 · ${days} 天`,
  sinceFirstFlat: (n, days) => `自首次分析以来基本持平 · ${n} 次 · ${days} 天`,
  vsLastUp: (d) => `较上次 +${d}`,
  vsLastDown: (d) => `较上次 −${d}`,
  vsLastFlat: '与上次持平',
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

  map: {
    title: 'แผนผังผิว',
    sub: 'แตะแต่ละหัวข้อเพื่อดูสิ่งที่ตรวจพบจริงบนรูปของคุณ',
    none: 'การวิเคราะห์ครั้งนี้ไม่มีภาพผลตรวจกลับมา ดูคะแนนได้ด้านล่าง',
    expires: 'ภาพผลตรวจแสดงเฉพาะหน้านี้และไม่ถูกจัดเก็บ',
  },
  detail: {
    title: 'รายละเอียดแต่ละหัวข้อ', sub: 'ครบทั้ง 16 หัวข้อที่ AI วัด',
    skinType: 'ประเภทผิวที่ AI ระบุ', tapForMore: 'แตะเพื่อดูรายละเอียด',
    measured: 'หัวข้อนี้วัดอะไร', whatToDo: 'ควรทำอย่างไร',
  },

  basis: {
    title: 'ที่มาของรูทีนนี้', sub: 'วัดอะไรมาจึงได้ผลนี้', show: 'รายละเอียด', hide: 'ย่อ',
    weatherTitle: 'สภาพอากาศที่วัดได้', derivedTitle: 'สิ่งที่ส่งผลต่อผิวจริง ๆ', faceTitle: 'อ่านจากผลวิเคราะห์',
    temp: 'อุณหภูมิ', humidity: 'ความชื้นสัมพัทธ์', uv: 'ดัชนียูวี',
    vpd: 'ส่วนต่างแรงดันไอน้ำ (VPD)',
    vpdHelp: 'ช่องว่างระหว่างผิว (32°C อิ่มตัว) กับอากาศ นี่คือแรงที่ดึงน้ำออกจากผิวจริง ๆ',
    absHumidity: 'ความชื้นสัมบูรณ์',
    absHumidityHelp: 'ปริมาณน้ำที่อากาศมีอยู่จริง ต่างจากเปอร์เซ็นต์ตรงที่ไม่ถูกอุณหภูมิหลอก',
    dewPoint: 'จุดน้ำค้าง',
    dewPointHelp: 'เกิน 24°C เหงื่อจะไม่ระเหยและเนื้อหนักจะลอยอยู่บนผิว',
    occlusiveYes: 'จุดน้ำค้างสูงกว่า 24°C — เหงื่อไม่ระเหย ครีมและออยล์จะลอยอยู่บนผิวแทนที่จะซึม จึงเลือกเนื้อเจลไม่ว่าผลวิเคราะห์จะเป็นอย่างไร',
    occlusiveNo: 'จุดน้ำค้างต่ำกว่า 24°C เหงื่อระเหยได้ตามปกติ เนื้อผลิตภัณฑ์จึงตัดสินจากภาระความแห้งและผลวิเคราะห์',
    drynessLoad: 'ภาระความแห้ง', sebumLoad: 'ภาระซีบัม', coldStress: 'ความเครียดจากความเย็น',
    loadHelp: 'ภาระความแห้งรวมความชื้นสัมบูรณ์กับส่วนต่างแรงดันไอน้ำ ส่วนภาระซีบัมรวมอุณหภูมิกับจุดน้ำค้าง (0–100) แกนซีบัมไม่มีความชื้นสัมพัทธ์โดยตั้งใจ เพราะเมื่ออุณหภูมิคงที่ ความชื้นไม่เปลี่ยนการผลิตซีบัม',
    weakest: 'หัวข้อที่ต่ำที่สุด',
    weakestHelp: (axis) => `${axis} ได้คะแนนต่ำที่สุด ขั้นตอนบำรุงเช้าและเย็นจึงเน้นที่จุดนี้`,
    hydrationRead: (score, threshold) => `ความชุ่มชื้นวัดได้ ${score} ต่ำกว่าเกณฑ์ ${threshold} จึงปรับเนื้อผลิตภัณฑ์ให้เข้มขึ้นหนึ่งระดับนอกเหนือจากสภาพอากาศ`,
    hydrationOk: (score, threshold) => `ความชุ่มชื้นวัดได้ ${score} ถึงหรือสูงกว่าเกณฑ์ ${threshold} เนื้อผลิตภัณฑ์จึงตัดสินจากสภาพอากาศเพียงอย่างเดียว`,
  },

  trendTitle: 'แนวโน้มของคุณ',
  trendSub: 'แสดงพร้อมความชื้นในแต่ละครั้งที่วิเคราะห์',
  noTrend: 'วิเคราะห์ตั้งแต่สองครั้งขึ้นไปเพื่อดูแนวโน้ม',
  scanCount: (n) => `วิเคราะห์ ${n} ครั้ง`,
  trendOverall: 'คะแนนรวม',
  sinceFirst: 'นับจากการวิเคราะห์ครั้งแรก',
  sinceFirstUp: (d, n, days) => `เพิ่มขึ้น ${d} คะแนนนับจากครั้งแรก · ${n} ครั้ง · ${days} วัน`,
  sinceFirstDown: (d, n, days) => `ลดลง ${d} คะแนนนับจากครั้งแรก · ${n} ครั้ง · ${days} วัน`,
  sinceFirstFlat: (n, days) => `คงที่นับจากครั้งแรก · ${n} ครั้ง · ${days} วัน`,
  vsLastUp: (d) => `+${d} จากครั้งก่อน`,
  vsLastDown: (d) => `−${d} จากครั้งก่อน`,
  vsLastFlat: 'เท่ากับครั้งก่อน',
}

const table: Record<Lang, InsightStrings> = { ko, en, zh, th }

export const insightT = (lang: Lang): InsightStrings => table[lang]
