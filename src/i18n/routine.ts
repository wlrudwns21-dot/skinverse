import type { Lang } from '../data/types'
import type {
  AmCleanse,
  AmMoisturiser,
  AmSpf,
  AmToner,
  DrynessBand,
  PmCleanse,
  PmNight,
  TempBand,
  UvBand,
} from '../routine/rules'

/**
 * Copy for the weather-driven routine: what each band is called, why today's
 * reading changes the advice, and the name of every step variant.
 *
 * Kept beside the rules rather than in the general screen copy so that adding a
 * band or a variant means editing one file, and the compiler names every
 * language still missing a translation.
 */
export interface RoutineStrings {
  band: {
    humidity: Record<DrynessBand, string>
    uv: Record<UvBand, string>
    temp: Record<TempBand, string>
  }
  /** One line per reading, explaining what it changes today. */
  why: {
    humidity: Record<DrynessBand, string>
    uv: Record<UvBand, string>
    temp: Record<TempBand, string>
  }
  step: {
    amCleanse: Record<AmCleanse, string>
    amToner: Record<AmToner, string>
    amMoisturiser: Record<AmMoisturiser, string>
    amSpf: Record<AmSpf, string>
    pmCleanse: Record<PmCleanse, string>
    pmNight: Record<PmNight, string>
    /** Fixed steps that do not vary with the weather. */
    amTreatment: string
    pmEssence: string
    pmTreatment: string
  }
  note: {
    amCleanse: string
    amToner: string
    pmEssence: string
    pmTreatment: string
    /** "가장 낮은 항목 — 수분" */
    weakest: (metric: string) => string
  }
  /** Heading above the three band chips. */
  basis: string
  basisHint: string

  /** The checklist: ticking steps off, and what the record adds up to. */
  check: {
    title: string
    sub: string
    /** "아침 루틴은 오전 4시–12시에 체크할 수 있어요" */
    windowShut: (slot: string) => string
    amWindow: string
    pmWindow: string
    doneToday: (done: number, total: number) => string
    allDone: string
    /** The adherence chart. */
    historyTitle: string
    historySub: string
    streak: (days: number) => string
    bestStreak: (days: number) => string
    rate: (pct: number) => string
    noHistory: string
    /** The legend for the scan scores drawn over the bars. */
    scanDot: string
    memberOnly: string
  }

  /** The weather reading's age, and the control that refreshes it. */
  refresh: string
  refreshing: string
  measuredJustNow: string
  measuredMinutesAgo: (minutes: number) => string
  measuredHoursAgo: (hours: number) => string
}

export const routineStrings: Record<Lang, RoutineStrings> = {
  ko: {
    band: {
      humidity: { humid: '습함', mild: '쾌적', drying: '건조해짐', harsh: '건조', severe: '매우 건조' },
      uv: { low: '낮음', moderate: '보통', high: '높음', veryHigh: '매우 높음', extreme: '위험' },
      temp: { cold: '추움', cool: '선선', mild: '온화', warm: '따뜻', hot: '더움' },
    },
    why: {
      humidity: {
        humid: '공기가 이미 물을 머금고 있어 땀이 잘 마르지 않아요. 무거운 제형은 겉돕니다 — 가벼운 젤로.',
        mild: '수분 증발 부담이 적은 날이에요. 평소 레이어링을 그대로 유지하면 됩니다.',
        drying: '공기가 수분을 조금씩 끌어가는 구간이에요. 얇게 여러 번 올리고 크림으로 잠가주세요.',
        harsh: '증발 압력이 높습니다. 휴멕턴트만으로는 오히려 빼앗겨요 — 반드시 유분으로 덮으세요.',
        severe: '피부와 공기의 수증기압 차가 매우 큽니다. 밀폐력 있는 제형으로 증발을 막아야 해요.',
      },
      uv: {
        low: '자외선이 약하지만 광노화는 누적됩니다. 기본 차단은 유지하세요.',
        moderate: '외출 전 SPF50+ 한 번이면 충분합니다.',
        high: '실외 활동 시 3시간마다 덧발라주세요.',
        veryHigh: '차단제 없이 노출하면 화상 위험이 있습니다. 3시간마다 재도포.',
        extreme: '한낮 노출을 피하고 2시간마다 재도포, 모자와 선글라스를 함께 쓰세요.',
      },
      temp: {
        cold: '찬 바람과 실내 난방이 동시에 수분을 뺏습니다. 세안은 순하게.',
        cool: '피지 분비가 줄어드는 시기라 보습을 조금 올려도 좋습니다.',
        mild: '피부에 부담이 적은 기온이에요.',
        warm: '피지 분비가 늘어납니다. 제형을 가볍게 가져가세요.',
        hot: '땀과 피지가 함께 늘어 저녁 이중 세안이 중요합니다.',
      },
    },
    step: {
      amCleanse: { gentle: '무자극 크림 클렌저', gel: '약산성 젤 클렌저' },
      amToner: { layered: '에센스 토너 2–3회 레이어링', standard: '수분 토너', mist: '수분 미스트 토너' },
      amMoisturiser: {
        richOil: '세라마이드 크림 + 페이셜 오일',
        rich: '세라마이드 크림',
        standard: '수분 크림',
        gel: '오일프리 젤 수분크림',
      },
      amSpf: {
        spf50: 'SPF50+ PA++++',
        reapply3h: 'SPF50+ PA++++ — 3시간마다 재도포',
        reapply2h: 'SPF50+ PA++++ — 2시간마다 재도포 · 모자·선글라스',
      },
      pmCleanse: { single: '젤 클렌저', double: '이중 세안 (클렌징 밤 → 젤)' },
      pmNight: {
        maskHumidifier: '슬리핑 마스크 + 가습기',
        creamOil: '배리어 나이트 크림 + 오일 1–2방울',
        barrier: '배리어 나이트 크림',
      },
      amTreatment: '집중 케어',
      pmEssence: '트리트먼트 에센스',
      pmTreatment: '집중 케어',
    },
    note: {
      amCleanse: '미온수로 60초, 문지르지 않기',
      amToner: '문지르지 말고 두드려 흡수',
      pmEssence: '액티브 성분 흡수 준비',
      pmTreatment: '저녁 흡수율이 더 높습니다',
      weakest: (m) => '가장 낮은 항목 — ' + m,
    },
    basis: '오늘의 판단 기준',
    basisHint: '아래 세 가지 측정값이 각 단계를 결정합니다.',
    check: {
      title: '오늘의 루틴 체크',
      sub: '각 단계는 해당 시간대에만 체크할 수 있어요.',
      windowShut: (slot) => `${slot}에 체크할 수 있어요`,
      amWindow: '오전 4시–12시',
      pmWindow: '오후 5시–자정',
      doneToday: (done, total) => `오늘 ${total}단계 중 ${done}단계`,
      allDone: '오늘 루틴 완료 🎉',
      historyTitle: '루틴 달성도',
      historySub: '매일의 달성률과 그때의 분석 점수',
      streak: (days) => `연속 ${days}일`,
      bestStreak: (days) => `최고 ${days}일`,
      rate: (pct) => `전체 달성률 ${pct}%`,
      noHistory: '체크를 시작하면 여기에 기록이 쌓입니다.',
      scanDot: '● AI 분석 점수',
      memberOnly: '루틴 체크는 회원만 이용할 수 있어요.',
    },
    refresh: '새로고침',
    refreshing: '불러오는 중…',
    measuredJustNow: '방금 측정',
    measuredMinutesAgo: (m) => `${m}분 전 측정`,
    measuredHoursAgo: (h) => `${h}시간 전 측정`,
  },

  en: {
    band: {
      humidity: { humid: 'Humid', mild: 'Comfortable', drying: 'Drying', harsh: 'Dry', severe: 'Very dry' },
      uv: { low: 'Low', moderate: 'Moderate', high: 'High', veryHigh: 'Very high', extreme: 'Extreme' },
      temp: { cold: 'Cold', cool: 'Cool', mild: 'Mild', warm: 'Warm', hot: 'Hot' },
    },
    why: {
      humidity: {
        humid: 'The air is already carrying water and sweat is not evaporating. Heavy textures will sit on top — use a light gel.',
        mild: 'Little evaporative pull today. Keep your usual layering.',
        drying: 'The air is starting to pull water out. Layer thin hydration and seal it with a cream.',
        harsh: 'Strong evaporative pull. Humectants alone will lose water — they need an occlusive over them.',
        severe: 'A very large vapour pressure gap between your skin and the air. Only an occlusive finish will hold water in.',
      },
      uv: {
        low: 'UV is weak, but photoageing accumulates. Keep your daily SPF.',
        moderate: 'One application of SPF50+ before heading out covers the day.',
        high: 'Reapply every three hours while you are outdoors.',
        veryHigh: 'Unprotected skin can burn. Reapply every three hours.',
        extreme: 'Avoid midday sun, reapply every two hours, and add a hat and sunglasses.',
      },
      temp: {
        cold: 'Cold wind and indoor heating strip moisture together. Cleanse gently.',
        cool: 'Sebum output drops in cooler air — a richer moisturiser is fine.',
        mild: 'An easy temperature for skin.',
        warm: 'Sebum output is rising. Keep textures light.',
        hot: 'Sweat and sebum together make the evening double cleanse matter.',
      },
    },
    step: {
      amCleanse: { gentle: 'Gentle cream cleanser', gel: 'Low-pH gel cleanser' },
      amToner: { layered: 'Essence toner, 2–3 layers', standard: 'Hydrating toner', mist: 'Hydrating mist toner' },
      amMoisturiser: {
        richOil: 'Ceramide cream + facial oil',
        rich: 'Ceramide cream',
        standard: 'Hydrating moisturiser',
        gel: 'Oil-free gel moisturiser',
      },
      amSpf: {
        spf50: 'SPF50+ PA++++',
        reapply3h: 'SPF50+ PA++++ — reapply every 3h',
        reapply2h: 'SPF50+ PA++++ — reapply every 2h · hat & sunglasses',
      },
      pmCleanse: { single: 'Gel cleanser', double: 'Double cleanse (balm → gel)' },
      pmNight: {
        maskHumidifier: 'Sleeping mask + humidifier',
        creamOil: 'Barrier night cream + 1–2 drops of oil',
        barrier: 'Barrier night cream',
      },
      amTreatment: 'Target',
      pmEssence: 'Treatment essence',
      pmTreatment: 'Target',
    },
    note: {
      amCleanse: 'Lukewarm water, 60 seconds, no scrubbing',
      amToner: 'Pat in — do not rub',
      pmEssence: 'Preps skin for actives',
      pmTreatment: 'Absorption is higher at night',
      weakest: (m) => 'Lowest score — ' + m,
    },
    basis: "Today's inputs",
    basisHint: 'These three readings decide every step below.',
    check: {
      title: "Today's routine",
      sub: 'Each step can be ticked only during its own part of the day.',
      windowShut: (slot) => `Can be ticked ${slot}`,
      amWindow: '4am–noon',
      pmWindow: '5pm–midnight',
      doneToday: (done, total) => `${done} of ${total} today`,
      allDone: 'Routine complete today 🎉',
      historyTitle: 'Routine adherence',
      historySub: 'What you did each day, and what the scans said',
      streak: (days) => `${days}-day streak`,
      bestStreak: (days) => `Best ${days}`,
      rate: (pct) => `${pct}% overall`,
      noHistory: 'Start ticking steps off and the record builds here.',
      scanDot: '● Analysis score',
      memberOnly: 'Ticking the routine off is for members.',
    },
    refresh: 'Refresh',
    refreshing: 'Updating…',
    measuredJustNow: 'Just measured',
    measuredMinutesAgo: (m) => `Measured ${m} min ago`,
    measuredHoursAgo: (h) => `Measured ${h}h ago`,
  },

  zh: {
    band: {
      humidity: { humid: '潮湿', mild: '舒适', drying: '渐干', harsh: '干燥', severe: '极干' },
      uv: { low: '低', moderate: '中等', high: '高', veryHigh: '很高', extreme: '极高' },
      temp: { cold: '寒冷', cool: '凉爽', mild: '温和', warm: '温暖', hot: '炎热' },
    },
    why: {
      humidity: {
        humid: '空气本身含水量高，汗液不易蒸发。厚重质地会浮在表面 — 请换成轻盈凝胶。',
        mild: '蒸发压力不大，维持平时的叠加护理即可。',
        drying: '空气开始带走水分。请薄涂多层保湿，再用面霜封存。',
        harsh: '蒸发压力较强。只用保湿剂反而会流失水分，必须以封闭性产品覆盖。',
        severe: '皮肤与空气的水汽压差极大，需要封闭性质地来阻止水分蒸发。',
      },
      uv: {
        low: '紫外线较弱，但光老化会累积，请保持日常防晒。',
        moderate: '出门前涂一次 SPF50+ 即可。',
        high: '户外活动时每 3 小时补涂一次。',
        veryHigh: '未防护的皮肤可能晒伤，每 3 小时补涂。',
        extreme: '避免正午外出，每 2 小时补涂，并佩戴帽子和墨镜。',
      },
      temp: {
        cold: '冷风和室内暖气同时带走水分，清洁要温和。',
        cool: '气温转凉皮脂减少，可以适当加强保湿。',
        mild: '对肌肤负担较小的温度。',
        warm: '皮脂分泌增加，质地要更轻盈。',
        hot: '汗液与皮脂叠加，晚间双重清洁很重要。',
      },
    },
    step: {
      amCleanse: { gentle: '温和乳霜洁面', gel: '弱酸性洁面啫喱' },
      amToner: { layered: '精华水叠加 2–3 层', standard: '保湿爽肤水', mist: '保湿喷雾爽肤水' },
      amMoisturiser: {
        richOil: '神经酰胺面霜 + 护肤油',
        rich: '神经酰胺面霜',
        standard: '保湿面霜',
        gel: '无油啫喱面霜',
      },
      amSpf: {
        spf50: 'SPF50+ PA++++',
        reapply3h: 'SPF50+ PA++++ — 每 3 小时补涂',
        reapply2h: 'SPF50+ PA++++ — 每 2 小时补涂 · 帽子与墨镜',
      },
      pmCleanse: { single: '洁面啫喱', double: '双重清洁（卸妆膏 → 啫喱）' },
      pmNight: {
        maskHumidifier: '睡眠面膜 + 加湿器',
        creamOil: '屏障晚霜 + 1–2 滴护肤油',
        barrier: '屏障晚霜',
      },
      amTreatment: '重点护理',
      pmEssence: '精华液',
      pmTreatment: '重点护理',
    },
    note: {
      amCleanse: '温水 60 秒，不要揉搓',
      amToner: '轻拍吸收，勿揉搓',
      pmEssence: '为活性成分打底',
      pmTreatment: '夜间吸收更好',
      weakest: (m) => '最低项 — ' + m,
    },
    basis: '今日判断依据',
    basisHint: '以下三项数值决定每个步骤。',
    check: {
      title: '今日护理打卡',
      sub: '每个步骤只能在对应时段勾选。',
      windowShut: (slot) => `可在${slot}勾选`,
      amWindow: '凌晨4点–中午',
      pmWindow: '下午5点–午夜',
      doneToday: (done, total) => `今日 ${done}/${total} 步`,
      allDone: '今日护理已完成 🎉',
      historyTitle: '护理达成度',
      historySub: '每天的完成率，以及当时的检测分数',
      streak: (days) => `连续 ${days} 天`,
      bestStreak: (days) => `最佳 ${days} 天`,
      rate: (pct) => `总体完成率 ${pct}%`,
      noHistory: '开始打卡后，记录会累积在这里。',
      scanDot: '● AI 检测分数',
      memberOnly: '护理打卡仅限会员使用。',
    },
    refresh: '刷新',
    refreshing: '更新中…',
    measuredJustNow: '刚刚测量',
    measuredMinutesAgo: (m) => `${m} 分钟前测量`,
    measuredHoursAgo: (h) => `${h} 小时前测量`,
  },

  th: {
    band: {
      humidity: { humid: 'ชื้น', mild: 'สบาย', drying: 'เริ่มแห้ง', harsh: 'แห้ง', severe: 'แห้งมาก' },
      uv: { low: 'ต่ำ', moderate: 'ปานกลาง', high: 'สูง', veryHigh: 'สูงมาก', extreme: 'อันตราย' },
      temp: { cold: 'หนาว', cool: 'เย็น', mild: 'สบาย', warm: 'อุ่น', hot: 'ร้อน' },
    },
    why: {
      humidity: {
        humid: 'อากาศมีความชื้นสูงและเหงื่อไม่ระเหย เนื้อผลิตภัณฑ์หนักจะลอยอยู่บนผิว — ใช้เจลบางเบา',
        mild: 'แรงดึงน้ำจากผิวต่ำ ใช้รูทีนเลเยอร์ตามปกติได้',
        drying: 'อากาศเริ่มดึงน้ำออกจากผิว ให้เลเยอร์บาง ๆ หลายชั้นแล้วปิดด้วยครีม',
        harsh: 'แรงระเหยสูง ใช้สารกักน้ำอย่างเดียวจะยิ่งเสียน้ำ ต้องปิดทับด้วยออคคลูซีฟ',
        severe: 'ความต่างของแรงดันไอน้ำระหว่างผิวกับอากาศสูงมาก ต้องใช้เนื้อที่ปิดผิวเพื่อกักน้ำไว้',
      },
      uv: {
        low: 'UV อ่อน แต่ความเสื่อมจากแสงสะสมได้ ทากันแดดประจำวันต่อไป',
        moderate: 'ทา SPF50+ ครั้งเดียวก่อนออกจากบ้านก็เพียงพอ',
        high: 'ทาซ้ำทุก 3 ชั่วโมงเมื่ออยู่กลางแจ้ง',
        veryHigh: 'ผิวที่ไม่ป้องกันอาจไหม้ได้ ทาซ้ำทุก 3 ชั่วโมง',
        extreme: 'เลี่ยงแดดช่วงเที่ยง ทาซ้ำทุก 2 ชั่วโมง พร้อมหมวกและแว่นกันแดด',
      },
      temp: {
        cold: 'ลมหนาวและเครื่องทำความร้อนดึงความชุ่มชื้นพร้อมกัน ล้างหน้าให้อ่อนโยน',
        cool: 'อากาศเย็นทำให้ความมันลดลง เพิ่มความเข้มข้นของมอยส์เจอไรเซอร์ได้',
        mild: 'อุณหภูมิที่ผิวรับได้สบาย',
        warm: 'ความมันเริ่มเพิ่มขึ้น ใช้เนื้อบางเบา',
        hot: 'เหงื่อและความมันรวมกัน ทำให้ดับเบิลคลีนซิ่งตอนเย็นสำคัญมาก',
      },
    },
    step: {
      amCleanse: { gentle: 'ครีมล้างหน้าสูตรอ่อนโยน', gel: 'เจลล้างหน้า pH ต่ำ' },
      amToner: { layered: 'เอสเซนส์โทนเนอร์ 2–3 ชั้น', standard: 'โทนเนอร์เพิ่มความชุ่มชื้น', mist: 'มิสต์โทนเนอร์' },
      amMoisturiser: {
        richOil: 'ครีมเซราไมด์ + เฟเชียลออยล์',
        rich: 'ครีมเซราไมด์',
        standard: 'มอยส์เจอไรเซอร์เพิ่มความชุ่มชื้น',
        gel: 'เจลมอยส์เจอไรเซอร์ไร้น้ำมัน',
      },
      amSpf: {
        spf50: 'SPF50+ PA++++',
        reapply3h: 'SPF50+ PA++++ — ทาซ้ำทุก 3 ชม.',
        reapply2h: 'SPF50+ PA++++ — ทาซ้ำทุก 2 ชม. · หมวกและแว่นกันแดด',
      },
      pmCleanse: { single: 'เจลล้างหน้า', double: 'ดับเบิลคลีนซิ่ง (บาล์ม → เจล)' },
      pmNight: {
        maskHumidifier: 'สลีปปิ้งมาสก์ + เครื่องทำความชื้น',
        creamOil: 'ไนท์ครีมฟื้นฟูเกราะผิว + ออยล์ 1–2 หยด',
        barrier: 'ไนท์ครีมฟื้นฟูเกราะผิว',
      },
      amTreatment: 'เน้นดูแล',
      pmEssence: 'ทรีตเมนต์เอสเซนส์',
      pmTreatment: 'เน้นดูแล',
    },
    note: {
      amCleanse: 'น้ำอุ่น 60 วินาที ไม่ถูแรง',
      amToner: 'ตบเบา ๆ อย่าถู',
      pmEssence: 'เตรียมผิวรับแอคทีฟ',
      pmTreatment: 'กลางคืนดูดซึมดีกว่า',
      weakest: (m) => 'คะแนนต่ำสุด — ' + m,
    },
    basis: 'เกณฑ์ของวันนี้',
    basisHint: 'ค่าทั้งสามนี้กำหนดทุกขั้นตอนด้านล่าง',
    check: {
      title: 'รูทีนวันนี้',
      sub: 'แต่ละขั้นตอนติ๊กได้เฉพาะช่วงเวลาของมัน',
      windowShut: (slot) => `ติ๊กได้ช่วง${slot}`,
      amWindow: 'ตี 4 – เที่ยง',
      pmWindow: '17:00 – เที่ยงคืน',
      doneToday: (done, total) => `วันนี้ ${done} จาก ${total} ขั้น`,
      allDone: 'ทำรูทีนครบแล้ววันนี้ 🎉',
      historyTitle: 'ความสม่ำเสมอของรูทีน',
      historySub: 'สิ่งที่ทำในแต่ละวัน และคะแนนสแกนในตอนนั้น',
      streak: (days) => `ต่อเนื่อง ${days} วัน`,
      bestStreak: (days) => `สูงสุด ${days} วัน`,
      rate: (pct) => `โดยรวม ${pct}%`,
      noHistory: 'เริ่มติ๊กแล้วบันทึกจะสะสมที่นี่',
      scanDot: '● คะแนนวิเคราะห์',
      memberOnly: 'การติ๊กรูทีนสำหรับสมาชิกเท่านั้น',
    },
    refresh: 'รีเฟรช',
    refreshing: 'กำลังอัปเดต…',
    measuredJustNow: 'วัดเมื่อครู่',
    measuredMinutesAgo: (m) => `วัดเมื่อ ${m} นาทีที่แล้ว`,
    measuredHoursAgo: (h) => `วัดเมื่อ ${h} ชม. ที่แล้ว`,
  },
}

export function routineT(lang: Lang): RoutineStrings {
  return routineStrings[lang] ?? routineStrings.ko
}
