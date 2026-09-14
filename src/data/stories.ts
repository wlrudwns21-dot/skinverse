import type { Lang, Localized } from './types'

/**
 * Skin Stories — the guides, cases and expert notes from the Seoul lab.
 *
 * One of them is marked `coreTip`: the single routine principle the routine
 * screen surfaces inline, because a customer reading their own routine is the
 * one moment a general principle lands. The rest are a list, which is where
 * further pieces get added.
 *
 * Kept as data rather than pages so the same entries can appear in more than
 * one place without being written twice, and so a new piece is one object.
 */

export type StoryCategory =
  | 'ingredient'
  | 'routineType'
  | 'trend'
  | 'weather'
  | 'case'
  | 'expert'

export interface Story {
  id: string
  category: StoryCategory
  /** Reading time in minutes, as published. */
  minutes: number
  title: Localized
  /** Two paragraphs. Kept separate so the list can show only the first. */
  body: [Localized, Localized]
  /**
   * The one story the routine screen shows inline, as its core tip.
   * Exactly one entry should carry this.
   */
  coreTip?: true
}

export const categoryNames: Record<StoryCategory, Localized> = {
  ingredient: { ko: '성분 가이드', en: 'Ingredients', zh: '成分指南', th: 'ส่วนผสม' },
  routineType: { ko: '타입별 루틴', en: 'Routine by type', zh: '分肤质方案', th: 'รูทีนตามสภาพผิว' },
  trend: { ko: 'K-뷰티 트렌드', en: 'K-beauty', zh: 'K-Beauty 趋势', th: 'เทรนด์ K-Beauty' },
  weather: { ko: '날씨×피부', en: 'Weather & skin', zh: '天气与肌肤', th: 'อากาศกับผิว' },
  case: { ko: '사용 사례', en: 'Case study', zh: '真实案例', th: 'กรณีศึกษา' },
  expert: { ko: '전문가 인터뷰', en: 'Expert note', zh: '专家访谈', th: 'บทสัมภาษณ์ผู้เชี่ยวชาญ' },
}

export const stories: Story[] = [
  {
    id: 'ceramide-hyaluron',
    category: 'ingredient',
    minutes: 3,
    // The routine's own advice in one place: this is the principle behind the
    // "layer, then seal" instruction the plan gives in dry air.
    coreTip: true,
    title: {
      ko: '세라마이드 × 히알루론: 장벽 듀오',
      en: 'Ceramide × hyaluronic acid: the barrier pair',
      zh: '神经酰胺 × 透明质酸：屏障搭档',
      th: 'เซราไมด์ × ไฮยาลูรอน: คู่หูเกราะผิว',
    },
    body: [
      {
        ko: '히알루론산은 수분을 끌어오고, 세라마이드는 그 수분을 가둡니다. 단독으로는 효과가 반감돼요 — 건조한 공기에서 밀봉 없는 휴멕턴트는 오히려 수분을 빼앗기고, 수분 부족 피부에 세라마이드만 바르면 부족한 상태 그대로 잠급니다.',
        en: 'Hyaluronic acid draws water in; ceramides hold it there. Alone each does half a job — an unsealed humectant in dry air loses water rather than gaining it, and ceramides over dehydrated skin simply lock in the shortage.',
        zh: '透明质酸负责吸水，神经酰胺负责锁水。单独使用效果都会减半 — 干燥空气中未封存的保湿剂反而会流失水分，而在缺水肌上只涂神经酰胺，只是把缺水状态封住。',
        th: 'ไฮยาลูรอนดึงน้ำเข้ามา เซราไมด์กักไว้ ใช้อย่างใดอย่างหนึ่งได้ผลครึ่งเดียว — สารกักน้ำที่ไม่ถูกปิดทับในอากาศแห้งจะยิ่งเสียน้ำ ส่วนเซราไมด์บนผิวที่ขาดน้ำก็แค่ล็อกความขาดน้ำเอาไว้',
      },
      {
        ko: '순서가 핵심입니다. 촉촉한 피부에 히알루론 먼저, 세라마이드 크림으로 마무리. 스캔에서 수분 점수가 60 미만이라면 액티브를 더하기 전에 이 조합을 아침저녁 4주간 유지하세요.',
        en: 'Order is the whole trick. Hyaluronic acid onto damp skin first, a ceramide cream to finish. If your scan puts hydration under 60, run this pair morning and night for four weeks before adding any active.',
        zh: '顺序才是关键。先在微湿的皮肤上用透明质酸，再用神经酰胺面霜收尾。若检测水分低于60分，先早晚坚持这一组合四周，再考虑加入活性成分。',
        th: 'ลำดับคือหัวใจ ทาไฮยาลูรอนบนผิวหมาด ๆ ก่อน แล้วปิดด้วยครีมเซราไมด์ ถ้าผลสแกนให้ความชุ่มชื้นต่ำกว่า 60 ให้ใช้คู่นี้เช้าเย็นสี่สัปดาห์ก่อนเพิ่มแอคทีฟใด ๆ',
      },
    ],
  },
  {
    id: 'oily-vs-dehydrated',
    category: 'routineType',
    minutes: 4,
    title: {
      ko: '지성 vs 수분 부족: 정반대 루틴',
      en: 'Oily is not dehydrated — and the routines are opposites',
      zh: '油性 vs 缺水：两种相反的护理',
      th: 'ผิวมันกับผิวขาดน้ำ: รูทีนตรงข้ามกัน',
    },
    body: [
      {
        ko: '지성은 피지가 과잉인 상태, 수분 부족은 물이 모자란 상태예요. 둘은 공존할 수 있고, 흔한 실수는 지성 피부를 박박 닦아 리바운드 유분을 부르거나, 휴멕턴트가 필요한 수분 부족 피부에 무거운 크림만 얹는 것.',
        en: 'Oily means too much sebum; dehydrated means too little water. They coexist happily, and the common mistakes are stripping oily skin until it rebounds oilier, and piling heavy cream onto dehydrated skin that needed humectants.',
        zh: '油性是皮脂过多，缺水是水分不足。两者可以同时存在。常见错误是把油性肌过度清洁导致出油反弹，以及给需要保湿剂的缺水肌只涂厚重面霜。',
        th: 'ผิวมันคือซีบัมมากเกิน ผิวขาดน้ำคือน้ำน้อยเกิน ทั้งสองเกิดพร้อมกันได้ ความผิดพลาดที่พบบ่อยคือล้างผิวมันจนแห้งแล้วยิ่งมัน และทาครีมหนักบนผิวขาดน้ำที่ต้องการสารกักน้ำ',
      },
      {
        ko: '지성: 주 2–3회 순한 PHA, 젤 타입 수분, 수분크림 생략 금지. 수분 부족: 폼클렌저 대신 젤, 물 같은 수분을 레이어링하고 세라마이드로 밀봉. 2주 뒤 재스캔으로 장벽 변화를 확인하세요.',
        en: 'Oily: gentle PHA two or three times a week, gel hydration, and never skip moisturiser. Dehydrated: gel instead of foam, layer watery hydration, seal with ceramides. Rescan after two weeks to see the barrier move.',
        zh: '油性：每周2~3次温和PHA、凝胶补水，且绝不省略保湿。缺水：以凝胶代替泡沫洁面，叠加水感保湿，再用神经酰胺封存。两周后重新检测，观察屏障变化。',
        th: 'ผิวมัน: PHA อ่อนโยนสัปดาห์ละ 2–3 ครั้ง เจลให้ความชุ่มชื้น และห้ามข้ามมอยส์เจอไรเซอร์ ผิวขาดน้ำ: ใช้เจลแทนโฟม เลเยอร์น้ำบาง ๆ แล้วปิดด้วยเซราไมด์ สแกนซ้ำใน 2 สัปดาห์เพื่อดูการเปลี่ยนแปลง',
      },
    ],
  },
  {
    id: 'glass-skin',
    category: 'trend',
    minutes: 3,
    title: {
      ko: '유리 피부는 필터가 아니라 루틴',
      en: 'Glass skin is a routine, not a filter',
      zh: '玻璃肌是护理出来的，不是滤镜',
      th: 'ผิวกระจกคือรูทีน ไม่ใช่ฟิลเตอร์',
    },
    body: [
      {
        ko: '유리 피부는 제품이 아니라, 고르게 수분을 머금은 매끈한 표면에 빛이 반사되는 상태예요. 방법은 무거운 크림 한 번 대신 가벼운 수분 여러 겹 — 촉촉할 때 에센스 토너를 세 번 나눠 두드리는 "3스킨법", 그리고 젤 수분크림으로 밀봉.',
        en: 'Glass skin is not a product. It is light reflecting off an evenly hydrated, smooth surface. The method is several light layers rather than one heavy cream — the "three-toner" habit of patting essence in three passes onto damp skin, then sealing with a gel moisturiser.',
        zh: '玻璃肌不是某件产品，而是光线在均匀含水、平滑的表面上反射的状态。做法是多层轻薄而非一次厚重 — 在微湿的皮肤上分三次拍入精华水的「三次爽肤」，再用凝胶面霜封存。',
        th: 'ผิวกระจกไม่ใช่ผลิตภัณฑ์ แต่คือแสงที่สะท้อนจากผิวเรียบที่ชุ่มชื้นสม่ำเสมอ วิธีคือหลายชั้นบางแทนครีมหนักชั้นเดียว — แตะเอสเซนส์สามรอบบนผิวหมาด แล้วปิดด้วยเจลมอยส์เจอไรเซอร์',
      },
      {
        ko: '건너뛸 것: 강한 각질 제거. 광은 연마가 아니라 수분과 온전한 표면에서 나옵니다. PHA 주 2회면 충분해요.',
        en: 'What to skip: aggressive exfoliation. The glow comes from water and an intact surface, not from sanding. PHA twice a week is plenty.',
        zh: '要跳过的是：强力去角质。光泽来自水分与完整的表面，而非打磨。PHA每周两次就够。',
        th: 'สิ่งที่ควรข้าม: การผลัดเซลล์ผิวรุนแรง ความเงางามมาจากน้ำและผิวที่สมบูรณ์ ไม่ใช่การขัด ใช้ PHA สัปดาห์ละสองครั้งก็พอ',
      },
    ],
  },
  {
    id: 'uv-index',
    category: 'weather',
    minutes: 3,
    title: {
      ko: '서울 피부과 의사처럼 UV 지수 읽기',
      en: 'Read the UV index like a Seoul dermatologist',
      zh: '像首尔皮肤科医生一样读紫外线指数',
      th: 'อ่านดัชนียูวีแบบหมอผิวหนังโซล',
    },
    body: [
      {
        ko: 'UV 지수의 체감 효과는 기하급수적이에요. UV 5에서는 맨 피부가 약 30분 만에 붉어지지만 UV 11에서는 10분도 안 걸립니다. 한국 피부과는 UV 8을 "재도포 필수" 기준선으로 봅니다.',
        en: 'The index scales faster than it looks. Bare skin reddens in about thirty minutes at UV 5 and in under ten at UV 11. Korean clinics treat UV 8 as the line where reapplication stops being optional.',
        zh: '紫外线指数的实际影响是指数级的。UV 5 时裸露皮肤约30分钟泛红，UV 11 时不到10分钟。韩国皮肤科把 UV 8 视为「必须补涂」的分界线。',
        th: 'ผลของดัชนียูวีเพิ่มเร็วกว่าที่เห็น ผิวเปล่าจะแดงใน 30 นาทีที่ยูวี 5 แต่ไม่ถึง 10 นาทีที่ยูวี 11 คลินิกเกาหลีถือว่ายูวี 8 คือเส้นที่การทาซ้ำไม่ใช่ทางเลือกอีกต่อไป',
      },
      {
        ko: '6 미만: 아침 SPF50+ 한 번이면 충분. 6–7: 외출 전마다 도포. 8 이상: 야외에서 3시간마다 재도포 + 모자 — 차단 성분은 땀과 빛 자체로도 분해돼요. 스캔에서 톤 불균형이 나왔다면 선크림은 예방이 아니라 치료입니다.',
        en: 'Under 6: one SPF50+ in the morning. 6–7: before every trip outside. 8 and up: reapply every three hours outdoors, and wear a hat — filters degrade under sweat and light itself. If your scan flagged uneven tone, sunscreen is not prevention, it is the treatment.',
        zh: '低于6：早晨一次 SPF50+ 即可。6~7：每次外出前涂抹。8以上：户外每3小时补涂并戴帽 — 防晒成分会因汗水与光照本身而降解。若检测显示肤色不均，防晒就不是预防而是治疗。',
        th: 'ต่ำกว่า 6: ทา SPF50+ ตอนเช้าครั้งเดียวพอ 6–7: ทาก่อนออกนอกบ้านทุกครั้ง 8 ขึ้นไป: ทาซ้ำทุก 3 ชั่วโมงเมื่ออยู่กลางแจ้งและสวมหมวก เพราะสารกันแดดเสื่อมจากเหงื่อและแสง หากผลสแกนพบสีผิวไม่สม่ำเสมอ กันแดดไม่ใช่การป้องกันแต่คือการรักษา',
      },
    ],
  },
  {
    id: 'yuna-4-weeks',
    category: 'case',
    minutes: 4,
    title: {
      ko: '4주 만에 62 → 78: 유나의 재스캔 기록',
      en: '62 to 78 in four weeks: Yuna’s rescan',
      zh: '四周从62到78：Yuna 的复检记录',
      th: 'จาก 62 เป็น 78 ใน 4 สัปดาห์: บันทึกของยูนา',
    },
    body: [
      {
        ko: '유나, 29세, 방콕 거주. 첫 스캔은 수분 42, 민감도 47 — 매일 에어컨 공기에 노출돼 심해진 전형적인 수분 부족·민감 패턴이었어요. 그는 루틴을 5단계로 줄이고 4주간 아무것도 바꾸지 않았습니다.',
        en: 'Yuna, 29, lives in Bangkok. Her first scan read hydration 42 and sensitivity 47 — the dehydrated, reactive pattern that daily air conditioning produces. She cut her routine to five steps and changed nothing for four weeks.',
        zh: 'Yuna，29岁，居住在曼谷。首次检测水分42、敏感度47 — 典型的因每日空调环境加剧的缺水敏感型。她把护理精简到五步，四周内不做任何改动。',
        th: 'ยูนา อายุ 29 อยู่กรุงเทพฯ สแกนครั้งแรกได้ความชุ่มชื้น 42 และความบอบบาง 47 — รูปแบบผิวขาดน้ำและไวที่เกิดจากอยู่ในแอร์ทุกวัน เธอลดรูทีนเหลือห้าขั้นและไม่เปลี่ยนอะไรเลยสี่สัปดาห์',
      },
      {
        ko: '바꾼 것: 약산성 클렌저, 촉촉할 때 히알루론 세럼, 밤엔 시카 크림, 오후 2시 선크림 재도포. 4주차 재스캔은 수분 63, 민감도 61, 종합 62 → 78. 결론 — 이것저것 바꿔 쓰던 "특별한" 제품보다 꾸준함이 이겼습니다.',
        en: 'What changed: a low-pH cleanser, hyaluronic serum onto damp skin, cica cream at night, sunscreen reapplied at two. The week-four rescan read hydration 63, sensitivity 61, overall 62 to 78. The lesson — consistency beat the rotating cast of special products she had been trying.',
        zh: '改动包括：低pH洁面、微湿时用透明质酸精华、夜间使用积雪草面霜、下午两点补涂防晒。第四周复检：水分63、敏感度61、综合分从62升到78。结论 — 坚持胜过不断更换的「特别」产品。',
        th: 'สิ่งที่เปลี่ยน: คลีนเซอร์ pH ต่ำ เซรั่มไฮยาลูรอนบนผิวหมาด ครีมซิก้าตอนกลางคืน และทากันแดดซ้ำบ่ายสองโมง สแกนซ้ำสัปดาห์ที่สี่ได้ความชุ่มชื้น 63 ความบอบบาง 61 คะแนนรวมจาก 62 เป็น 78 บทเรียนคือความสม่ำเสมอชนะผลิตภัณฑ์พิเศษที่เปลี่ยนไปเรื่อย ๆ',
      },
    ],
  },
  {
    id: 'dr-seo',
    category: 'expert',
    minutes: 5,
    title: {
      ko: '"액티브를 쫓지 마세요" — 서 원장, 서울',
      en: '“Stop chasing actives” — Dr Seo, Seoul',
      zh: '「别追着活性成分跑」— 徐院长，首尔',
      th: '“อย่าไล่ตามแอคทีฟ” — หมอซอ, โซล',
    },
    body: [
      {
        ko: '"해외 고객에게서 가장 많이 보는 실수는 액티브 중첩이에요. 준비되지 않은 장벽 위에 비타민C, 레티날, 산을 한 루틴에 다 올리죠. 한국에서는 장벽을 먼저 만듭니다. 액티브는 마지막 10%예요."',
        en: '“The mistake I see most in overseas patients is stacking actives — vitamin C, retinal and an acid in one routine, on a barrier that was never prepared for them. In Korea we build the barrier first. Actives are the last ten per cent.”',
        zh: '「我在海外患者身上最常见的错误是活性成分叠加 — 在毫无准备的屏障上同时使用维C、视黄醛和酸。在韩国我们先修护屏障，活性成分只是最后的10%。」',
        th: '“ความผิดพลาดที่พบบ่อยที่สุดในคนไข้ต่างชาติคือการซ้อนแอคทีฟ — วิตามินซี เรตินัล และกรด ในรูทีนเดียวบนเกราะผิวที่ไม่พร้อม ในเกาหลีเราสร้างเกราะผิวก่อน แอคทีฟคือ 10% สุดท้าย”',
      },
      {
        ko: '"두 번째 실수는 기후 무시. 서울의 건조한 겨울에 맞는 루틴은 방콕의 습도에서는 실패합니다. 트렌드가 아니라 날씨로 제형을 고르세요." 그녀의 원칙: 새 제품은 한 번에 하나, 2주 간격, 사이마다 재스캔.',
        en: '“The second is ignoring climate. A routine built for a dry Seoul winter fails in Bangkok humidity. Choose texture by the weather, not by the trend.” Her rule: one new product at a time, two weeks apart, with a rescan in between.',
        zh: '「第二个错误是忽视气候。为首尔干燥冬季设计的方案在曼谷的湿度下会失败。按天气而非潮流选择质地。」她的原则：一次只加一件新产品，间隔两周，中间复检一次。',
        th: '“ข้อที่สองคือมองข้ามสภาพอากาศ รูทีนที่ออกแบบสำหรับฤดูหนาวแห้งในโซลจะล้มเหลวในความชื้นกรุงเทพฯ เลือกเนื้อผลิตภัณฑ์ตามอากาศ ไม่ใช่ตามเทรนด์” หลักของเธอ: เพิ่มผลิตภัณฑ์ใหม่ทีละอย่าง ห่างกันสองสัปดาห์ และสแกนซ้ำระหว่างนั้น',
      },
    ],
  },
]

/**
 * Where a story's card photo lives.
 *
 * Derived from the id rather than stored on the entry, so a story can never
 * ship carrying a picture of a different one: the file in `public/stories/` is
 * named after the story it belongs to, or that story has no picture.
 */
export const storyImage = (story: Story) => `/stories/${story.id}.webp`

/** The one story the routine screen shows inline. */
export const coreTip = stories.find((story) => story.coreTip) ?? stories[0]

/** Everything else, in the order it should be listed. */
export const otherStories = stories.filter((story) => story !== coreTip)

export const storiesTitle: Localized = {
  ko: '스킨 스토리',
  en: 'Skin Stories',
  zh: '肌肤故事',
  th: 'เรื่องเล่าผิว',
}

export const storiesSub: Localized = {
  ko: '서울 랩이 전하는 가이드 · 사례 · 전문가 노트',
  en: 'Guides, cases and expert notes from the Seoul lab',
  zh: '来自首尔实验室的指南、案例与专家笔记',
  th: 'คู่มือ กรณีศึกษา และบันทึกผู้เชี่ยวชาญจากแล็บโซล',
}

export const coreTipLabel: Localized = {
  ko: '오늘의 핵심 팁',
  en: 'Core tip',
  zh: '核心要点',
  th: 'เคล็ดลับหลัก',
}

/** The "no filter" chip. */
export const storiesAll: Localized = {
  ko: '전체',
  en: 'All',
  zh: '全部',
  th: 'ทั้งหมด',
}

export const storiesEmpty: Localized = {
  ko: '이 카테고리는 곧 채워집니다.',
  en: 'More in this category is on the way.',
  zh: '该分类的内容即将上线。',
  th: 'เนื้อหาหมวดนี้กำลังจะมา',
}

export const storiesToRoutine: Localized = {
  ko: '오늘 날씨에 맞춘 내 루틴 보기',
  en: 'See my routine for today’s weather',
  zh: '查看今日天气对应的护理方案',
  th: 'ดูรูทีนสำหรับอากาศวันนี้',
}

/** The heading on the home screen's section. */
export const storiesHomeCta: Localized = {
  ko: '전체 보기',
  en: 'See all',
  zh: '查看全部',
  th: 'ดูทั้งหมด',
}

export const readMore: Localized = {
  ko: '더 읽기',
  en: 'Read more',
  zh: '阅读更多',
  th: 'อ่านต่อ',
}

export const minutesLabel = (minutes: number, lang: Lang): string =>
  lang === 'ko'
    ? `${minutes}분 읽기`
    : lang === 'zh'
      ? `阅读 ${minutes} 分钟`
      : lang === 'th'
        ? `อ่าน ${minutes} นาที`
        : `${minutes} min read`
