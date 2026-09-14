import type { Lang } from '../data/types'
import type {
  AmCleanse,
  AmMoisturiser,
  AmSpf,
  AmToner,
  HumidityBand,
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
    humidity: Record<HumidityBand, string>
    uv: Record<UvBand, string>
    temp: Record<TempBand, string>
  }
  /** One line per reading, explaining what it changes today. */
  why: {
    humidity: Record<HumidityBand, string>
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
}

export const routineStrings: Record<Lang, RoutineStrings> = {
  ko: {
    band: {
      humidity: { veryDry: '매우 건조', dry: '건조', comfortable: '쾌적', humid: '높음', veryHumid: '매우 높음' },
      uv: { low: '낮음', moderate: '보통', high: '높음', veryHigh: '매우 높음', extreme: '위험' },
      temp: { cold: '추움', cool: '선선', mild: '온화', warm: '따뜻', hot: '더움' },
    },
    why: {
      humidity: {
        veryDry: '공기가 수분을 빼앗는 수준이에요. 유분으로 덮어 수분 증발을 막아야 합니다.',
        dry: '건조한 편이라 수분을 얇게 여러 번 올리고 크림으로 잠가주세요.',
        comfortable: '수분이 적당해 평소 레이어링을 그대로 유지하면 됩니다.',
        humid: '습도가 높아 무거운 제형은 겉돕니다. 가벼운 젤로 바꾸세요.',
        veryHumid: '공기가 포화 상태예요. 젤 제형만 얇게, 유분은 최소로.',
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
  },

  en: {
    band: {
      humidity: { veryDry: 'Very dry', dry: 'Dry', comfortable: 'Comfortable', humid: 'Humid', veryHumid: 'Very humid' },
      uv: { low: 'Low', moderate: 'Moderate', high: 'High', veryHigh: 'Very high', extreme: 'Extreme' },
      temp: { cold: 'Cold', cool: 'Cool', mild: 'Mild', warm: 'Warm', hot: 'Hot' },
    },
    why: {
      humidity: {
        veryDry: 'The air is actively pulling water out of your skin. Seal it in with an occlusive layer.',
        dry: 'Dry air — layer thin hydration and lock it down with a cream.',
        comfortable: 'Humidity is in a good range. Keep your usual layering.',
        humid: 'High humidity: heavy textures will sit on the surface. Switch to a light gel.',
        veryHumid: 'The air is saturated. Gel textures only, and go easy on oils.',
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
  },

  zh: {
    band: {
      humidity: { veryDry: '极干', dry: '干燥', comfortable: '舒适', humid: '偏湿', veryHumid: '非常湿' },
      uv: { low: '低', moderate: '中等', high: '高', veryHigh: '很高', extreme: '极高' },
      temp: { cold: '寒冷', cool: '凉爽', mild: '温和', warm: '温暖', hot: '炎热' },
    },
    why: {
      humidity: {
        veryDry: '空气正在带走肌肤水分，需要用油分封闭锁水。',
        dry: '空气偏干，薄涂多层补水后用面霜锁住。',
        comfortable: '湿度适中，保持平时的叠加护肤即可。',
        humid: '湿度偏高，厚重质地会浮在表面，改用轻盈啫喱。',
        veryHumid: '空气接近饱和，只用啫喱质地，尽量减少油分。',
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
  },

  th: {
    band: {
      humidity: { veryDry: 'แห้งมาก', dry: 'แห้ง', comfortable: 'กำลังดี', humid: 'ชื้น', veryHumid: 'ชื้นมาก' },
      uv: { low: 'ต่ำ', moderate: 'ปานกลาง', high: 'สูง', veryHigh: 'สูงมาก', extreme: 'อันตราย' },
      temp: { cold: 'หนาว', cool: 'เย็น', mild: 'สบาย', warm: 'อุ่น', hot: 'ร้อน' },
    },
    why: {
      humidity: {
        veryDry: 'อากาศกำลังดึงน้ำออกจากผิว ต้องใช้น้ำมันเคลือบเพื่อกักความชุ่มชื้น',
        dry: 'อากาศแห้ง ลงน้ำบาง ๆ หลายชั้นแล้วปิดท้ายด้วยครีม',
        comfortable: 'ความชื้นกำลังดี ใช้การเลเยอร์ตามปกติได้เลย',
        humid: 'ความชื้นสูง เนื้อหนักจะลอยอยู่บนผิว เปลี่ยนเป็นเจลบางเบา',
        veryHumid: 'อากาศอิ่มตัว ใช้เนื้อเจลเท่านั้น และลดน้ำมันให้น้อยที่สุด',
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
  },
}

export function routineT(lang: Lang): RoutineStrings {
  return routineStrings[lang] ?? routineStrings.ko
}
