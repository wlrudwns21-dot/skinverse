import type { Localized } from '../data/types'
import type { Slot } from './checklist'

/**
 * The steps a member may add to their own routine.
 *
 * A fixed list, not a text box. The base routine is built from measurements and
 * the weather and every line of it can be defended; a free-form field would put
 * unreviewed advice in the same list, in the same typeface, looking equally
 * authoritative. So a customer chooses from steps we are willing to stand
 * behind, and the base routine stays where the engine put it.
 *
 * `slot` is the half of the day the step belongs to. A few belong to both —
 * a lip mask is as good morning as night — and those carry `'any'`.
 */

export type ExtraSlot = Slot | 'any'

export interface ExtraPreset {
  id: string
  slot: ExtraSlot
  name: Localized
  /** One line on what it is for, shown under the name while choosing. */
  note: Localized
}

export const extraPresets: ExtraPreset[] = [
  {
    id: 'lipMask',
    slot: 'any',
    name: {
      ko: '립 마스크',
      en: 'Lip mask',
      zh: '唇膜',
      th: 'ลิปมาสก์',
    },
    note: {
      ko: '입술은 피지선이 없어 가장 먼저 트는 부위예요.',
      en: 'Lips have no oil glands, so they crack before anything else does.',
      zh: '嘴唇没有皮脂腺，所以总是最先干裂。',
      th: 'ริมฝีปากไม่มีต่อมไขมัน จึงแห้งแตกก่อนส่วนอื่น',
    },
  },
  {
    id: 'eyeCream',
    slot: 'any',
    name: {
      ko: '아이크림',
      en: 'Eye cream',
      zh: '眼霜',
      th: 'อายครีม',
    },
    note: {
      ko: '눈가 피부는 얼굴에서 가장 얇아 건조와 주름이 먼저 보입니다.',
      en: 'The thinnest skin on the face: dryness and lines show here first.',
      zh: '眼周是面部最薄的皮肤，干燥与细纹最先显现。',
      th: 'ผิวรอบดวงตาบางที่สุดบนใบหน้า ความแห้งและริ้วรอยจึงปรากฏก่อน',
    },
  },
  {
    id: 'neck',
    slot: 'any',
    name: {
      ko: '목까지 바르기',
      en: 'Take it down the neck',
      zh: '延伸至颈部',
      th: 'ทาต่อถึงลำคอ',
    },
    note: {
      ko: '목은 같은 자외선을 받지만 관리는 거의 받지 못합니다.',
      en: 'The neck takes the same UV as the face and almost none of the care.',
      zh: '颈部承受与面部相同的紫外线，却几乎得不到护理。',
      th: 'ลำคอเจอยูวีเท่าใบหน้า แต่แทบไม่ได้รับการดูแล',
    },
  },
  {
    id: 'sunscreenReapply',
    slot: 'am',
    name: {
      ko: '선크림 재도포',
      en: 'Reapply sunscreen',
      zh: '补涂防晒',
      th: 'ทากันแดดซ้ำ',
    },
    note: {
      ko: '차단 성분은 땀과 빛 자체로 분해돼요. UV 8 이상이면 필수.',
      en: 'Filters break down under sweat and light. Above UV 8 it is not optional.',
      zh: '防晒成分会被汗水和光照分解。UV 8 以上必须补涂。',
      th: 'สารกันแดดสลายจากเหงื่อและแสง เกินยูวี 8 คือต้องทาซ้ำ',
    },
  },
  {
    id: 'facialMist',
    slot: 'any',
    name: {
      ko: '수분 미스트',
      en: 'Hydrating mist',
      zh: '保湿喷雾',
      th: 'สเปรย์น้ำแร่',
    },
    note: {
      ko: '에어컨이나 난방 아래서 하루 중 수분을 다시 채웁니다.',
      en: 'Tops the water back up through a day under air conditioning or heating.',
      zh: '在空调或暖气环境中，白天随时补水。',
      th: 'เติมน้ำให้ผิวระหว่างวันในห้องแอร์หรือฮีตเตอร์',
    },
  },
  {
    id: 'sheetMask',
    slot: 'pm',
    name: {
      ko: '시트 마스크',
      en: 'Sheet mask',
      zh: '面膜',
      th: 'ชีทมาสก์',
    },
    note: {
      ko: '주 2–3회. 매일 하면 오히려 각질층이 무릅니다.',
      en: 'Two or three times a week. Daily and the barrier goes soggy instead.',
      zh: '每周 2~3 次。天天敷反而会让角质层过度水合。',
      th: 'สัปดาห์ละ 2–3 ครั้ง ถ้าทุกวันผิวจะอุ้มน้ำมากเกินไป',
    },
  },
  {
    id: 'exfoliate',
    slot: 'pm',
    name: {
      ko: '각질 정돈 (PHA)',
      en: 'Gentle exfoliation (PHA)',
      zh: '温和去角质 (PHA)',
      th: 'ผลัดผิวอ่อนโยน (PHA)',
    },
    note: {
      ko: '주 2회까지. 광은 연마가 아니라 수분에서 나옵니다.',
      en: 'Twice a week at most. Glow comes from water, not from sanding.',
      zh: '每周最多两次。光泽来自水分，而非打磨。',
      th: 'ไม่เกินสัปดาห์ละสองครั้ง ความเงามาจากน้ำ ไม่ใช่การขัด',
    },
  },
  {
    id: 'retinal',
    slot: 'pm',
    name: {
      ko: '레티날 (밤)',
      en: 'Retinal (night)',
      zh: '视黄醛（夜间）',
      th: 'เรตินัล (กลางคืน)',
    },
    note: {
      ko: '장벽이 자리를 잡은 뒤에. 다른 액티브와 같은 날 겹치지 마세요.',
      en: 'Only once the barrier is settled, and never stacked with another active.',
      zh: '待屏障稳定后再用，且勿与其他活性成分叠加。',
      th: 'ใช้เมื่อเกราะผิวแข็งแรงแล้ว และอย่าซ้อนกับแอคทีฟอื่น',
    },
  },
  {
    id: 'humidifier',
    slot: 'pm',
    name: {
      ko: '가습기 켜기',
      en: 'Run a humidifier',
      zh: '开加湿器',
      th: 'เปิดเครื่องทำความชื้น',
    },
    note: {
      ko: '자는 동안의 수분 손실이 하루 중 가장 큽니다.',
      en: 'The largest water loss of the day happens while you are asleep.',
      zh: '一天中水分流失最多的时段是睡眠中。',
      th: 'ผิวเสียน้ำมากที่สุดของวันระหว่างที่คุณหลับ',
    },
  },
  {
    id: 'water',
    slot: 'any',
    name: {
      ko: '물 한 잔',
      en: 'A glass of water',
      zh: '喝一杯水',
      th: 'น้ำหนึ่งแก้ว',
    },
    note: {
      ko: '바르는 수분만으로는 채워지지 않는 부분이 있습니다.',
      en: 'There is a part of this that no amount of topical hydration reaches.',
      zh: '有些缺水，是外用保湿补不回来的。',
      th: 'ความชุ่มชื้นบางส่วน สกินแคร์ทาภายนอกเติมให้ไม่ได้',
    },
  },
]

export const presetById = (id: string): ExtraPreset | undefined =>
  extraPresets.find((preset) => preset.id === id)

/** Which presets can be added to a given half of the day. */
export const presetsFor = (slot: Slot): ExtraPreset[] =>
  extraPresets.filter((preset) => preset.slot === slot || preset.slot === 'any')

/** How many a member may add per slot, so the list stays a routine and not a wishlist. */
export const MAX_EXTRAS_PER_SLOT = 5

export const extrasTitle: Localized = {
  ko: '내 루틴 추가',
  en: 'Add to my routine',
  zh: '添加到我的护理',
  th: 'เพิ่มในรูทีนของฉัน',
}

export const extrasSub: Localized = {
  ko: '기본 루틴은 분석 결과와 날씨로 정해집니다. 아래에서 직접 더할 수 있어요.',
  en: 'The base routine is set by your scan and the weather. These you choose yourself.',
  zh: '基础方案由检测结果与天气决定，以下步骤可自行添加。',
  th: 'รูทีนพื้นฐานกำหนดจากผลสแกนและสภาพอากาศ ส่วนด้านล่างคุณเลือกเอง',
}

export const addStep: Localized = {
  ko: '단계 추가',
  en: 'Add a step',
  zh: '添加步骤',
  th: 'เพิ่มขั้นตอน',
}

export const removeStep: Localized = {
  ko: '빼기',
  en: 'Remove',
  zh: '移除',
  th: 'นำออก',
}

export const extrasFull: Localized = {
  ko: '이 시간대는 5개까지 추가할 수 있어요.',
  en: 'Five added steps is the most for one part of the day.',
  zh: '同一时段最多添加 5 个步骤。',
  th: 'เพิ่มได้สูงสุด 5 ขั้นตอนต่อช่วงเวลา',
}
