import type { Lang, Localized } from '../data/types'

/**
 * Everything the analysis measures, named and explained.
 *
 * The vendor answers in its own vocabulary — `redness`, `tear_trough`,
 * `dark_circle_v2` — and a score beside a word nobody recognises is not
 * information. "Sensitivity 50" tells a customer nothing about their face; it
 * only asks them to trust a number. Each entry here says what was measured and
 * what a low score means for them.
 *
 * Every score runs the same way: higher is better. That is the vendor's own
 * scale ("a higher score indicates healthier and more aesthetically pleasing
 * skin condition"), and keeping it uniform means no axis needs a mental flip.
 */

export type ConcernGroup = 'hydration' | 'texture' | 'tone' | 'firmness' | 'eyes'

export interface ConcernDef {
  /** Their SD key. The HD response uses `hd` instead; both map here. */
  sd: string
  hd: string
  group: ConcernGroup
  name: Localized
  /** What the number actually measures. */
  means: Localized
  /** What a low score calls for. */
  low: Localized
}

export const CONCERNS: ConcernDef[] = [
  {
    sd: 'moisture', hd: 'hd_moisture', group: 'hydration',
    name: { ko: '수분', en: 'Hydration', zh: '水分', th: 'ความชุ่มชื้น' },
    means: {
      ko: '각질층이 머금고 있는 수분량이에요. 낮으면 당김·각질·잔주름이 먼저 나타납니다.',
      en: 'How much water the surface layer is holding. Low readings show up first as tightness, flaking and fine lines.',
      zh: '角质层的含水量。偏低时最先出现紧绷、脱屑和细纹。',
      th: 'ปริมาณน้ำที่ชั้นผิวกักเก็บไว้ ค่าต่ำจะแสดงออกเป็นผิวตึง ลอก และริ้วรอยเล็ก ๆ ก่อน',
    },
    low: {
      ko: '촉촉할 때 히알루론 레이어링 → 세라마이드로 밀봉. 액티브는 잠시 쉬어가세요.',
      en: 'Layer humectants onto damp skin, then seal with ceramides. Pause actives for a while.',
      zh: '在微湿的皮肤上叠加保湿成分，再用神经酰胺封存。暂停使用活性成分。',
      th: 'เลเยอร์สารกักน้ำบนผิวหมาด ๆ แล้วปิดด้วยเซราไมด์ พักการใช้แอคทีฟไว้ก่อน',
    },
  },
  {
    sd: 'oiliness', hd: 'hd_oiliness', group: 'hydration',
    name: { ko: '유분', en: 'Oil balance', zh: '油脂平衡', th: 'สมดุลความมัน' },
    means: {
      ko: '피지 분비량의 균형이에요. 낮으면 피지가 과한 상태 — 모공 막힘과 트러블로 이어집니다.',
      en: 'How balanced sebum output is. A low score means too much of it, which leads to clogging and breakouts.',
      zh: '皮脂分泌的平衡度。分数低表示油脂过多，容易堵塞毛孔并长痘。',
      th: 'ความสมดุลของการผลิตซีบัม คะแนนต่ำแปลว่ามันมากเกินไป นำไปสู่รูขุมขนอุดตันและสิว',
    },
    low: {
      ko: '과하게 닦아내지 마세요 — 오히려 더 늘어납니다. 약산성 세안 + 젤 수분으로 충분해요.',
      en: 'Do not strip it — that rebounds with more oil. A low-pH cleanse and gel hydration is enough.',
      zh: '不要过度清洁，否则会反弹出更多油。低pH洁面加凝胶保湿就够了。',
      th: 'อย่าล้างจนผิวแห้งตึง เพราะจะยิ่งมัน ใช้คลีนเซอร์ pH ต่ำและเจลให้ความชุ่มชื้นก็พอ',
    },
  },
  {
    sd: 'pore', hd: 'hd_pore', group: 'texture',
    name: { ko: '모공', en: 'Pores', zh: '毛孔', th: 'รูขุมขน' },
    means: {
      ko: '모공이 얼마나 눈에 띄는지예요. 피지와 각질이 쌓이면 넓어 보입니다.',
      en: 'How visible your pores are. They read wider when sebum and dead cells build up inside them.',
      zh: '毛孔的明显程度。皮脂和角质堆积时会显得更粗大。',
      th: 'ความชัดของรูขุมขน จะดูกว้างขึ้นเมื่อมีซีบัมและเซลล์ผิวสะสม',
    },
    low: {
      ko: '주 2~3회 순한 BHA·PHA로 모공 속을 비워주세요. 물리적 스크럽은 피하고요.',
      en: 'Clear them with a gentle BHA or PHA two or three times a week. Skip physical scrubs.',
      zh: '每周2~3次使用温和的BHA或PHA清理毛孔，避免物理磨砂。',
      th: 'ใช้ BHA หรือ PHA อ่อนโยนสัปดาห์ละ 2–3 ครั้ง เลี่ยงสครับแบบเม็ด',
    },
  },
  {
    sd: 'texture', hd: 'hd_texture', group: 'texture',
    name: { ko: '피부결', en: 'Texture', zh: '肤质纹理', th: 'เนื้อผิว' },
    means: {
      ko: '표면이 얼마나 매끈한지예요. 빛이 고르게 반사되면 이른바 "유리 피부"로 보입니다.',
      en: 'How even the surface is. Light reflects evenly off smooth skin — that is what reads as glass skin.',
      zh: '表面的平滑程度。光线在平滑肌肤上均匀反射，这就是所谓的玻璃肌。',
      th: 'ความเรียบเนียนของผิว แสงสะท้อนสม่ำเสมอบนผิวเรียบ นั่นคือที่มาของผิวกระจก',
    },
    low: {
      ko: '각질 관리보다 수분이 먼저예요. 매끈함은 연마가 아니라 수분에서 나옵니다.',
      en: 'Hydration before exfoliation. Smoothness comes from water, not from sanding the surface.',
      zh: '先补水再去角质。平滑来自水分，而不是打磨表面。',
      th: 'เติมน้ำก่อนผลัดเซลล์ ความเรียบเนียนมาจากความชุ่มชื้น ไม่ใช่การขัดผิว',
    },
  },
  {
    sd: 'acne', hd: 'hd_acne', group: 'texture',
    name: { ko: '트러블', en: 'Blemishes', zh: '痘痘', th: 'สิว' },
    means: {
      ko: '여드름·뾰루지의 양이에요. 피지, 각질, 염증이 함께 작용한 결과입니다.',
      en: 'How much active breakout there is. Sebum, dead cells and inflammation all feed into it.',
      zh: '当前痘痘的数量。由皮脂、角质与炎症共同造成。',
      th: 'ปริมาณสิวที่กำลังเกิด เกิดจากซีบัม เซลล์ผิวที่ตกค้าง และการอักเสบร่วมกัน',
    },
    low: {
      ko: '진정 성분(마데카소사이드·판테놀)과 국소 BHA를 쓰되, 장벽을 먼저 지키세요.',
      en: 'Soothing actives and spot BHA — but protect the barrier first.',
      zh: '使用舒缓成分与局部BHA，但要先护好屏障。',
      th: 'ใช้สารปลอบประโลมและ BHA เฉพาะจุด แต่ต้องดูแลเกราะผิวก่อน',
    },
  },
  {
    sd: 'age_spot', hd: 'hd_age_spot', group: 'tone',
    name: { ko: '색소침착', en: 'Dark spots', zh: '色斑', th: 'จุดด่างดำ' },
    means: {
      ko: '기미·잡티 등 짙은 색소가 뭉친 정도예요. 대부분 누적된 자외선이 원인입니다.',
      en: 'Patches of concentrated pigment. Accumulated sun exposure is the usual cause.',
      zh: '色素集中形成的斑点。多数由累积的紫外线照射造成。',
      th: 'บริเวณที่เม็ดสีรวมตัวกันเข้ม มักเกิดจากแสงแดดสะสม',
    },
    low: {
      ko: '선크림이 치료입니다. 나이아신아마이드·비타민C를 더하되, 자외선 차단이 먼저예요.',
      en: 'Sunscreen is the treatment. Add niacinamide or vitamin C, but protection comes first.',
      zh: '防晒就是治疗。可加入烟酰胺或维生素C，但防晒优先。',
      th: 'กันแดดคือการรักษา เสริมไนอาซินาไมด์หรือวิตามินซีได้ แต่กันแดดต้องมาก่อน',
    },
  },
  {
    sd: 'radiance', hd: 'hd_radiance', group: 'tone',
    name: { ko: '광채', en: 'Radiance', zh: '光泽', th: 'ความกระจ่างใส' },
    means: {
      ko: '피부 톤의 밝기와 생기예요. 낮으면 칙칙하고 지쳐 보입니다.',
      en: 'The brightness and life in your skin tone. Low readings look dull and tired.',
      zh: '肤色的明亮度与生气。偏低时显得暗沉疲惫。',
      th: 'ความสว่างและความมีชีวิตชีวาของสีผิว ค่าต่ำจะดูหมองคล้ำและอ่อนล้า',
    },
    low: {
      ko: '항산화(비타민C·페룰산)와 충분한 수분. 각질이 쌓이면 빛이 흩어집니다.',
      en: 'Antioxidants and enough water. Built-up dead cells scatter light instead of reflecting it.',
      zh: '抗氧化成分与充足水分。角质堆积会让光线散射而非反射。',
      th: 'สารต้านอนุมูลอิสระและความชุ่มชื้นที่เพียงพอ เซลล์ผิวที่สะสมจะทำให้แสงกระจายแทนที่จะสะท้อน',
    },
  },
  {
    sd: 'redness', hd: 'hd_redness', group: 'tone',
    name: { ko: '민감도(홍조)', en: 'Sensitivity (redness)', zh: '敏感度（泛红）', th: 'ความบอบบาง (ผิวแดง)' },
    means: {
      ko: '피부가 얼마나 붉게 올라와 있는지를 잰 값이에요. 장벽이 약해지면 혈관이 비쳐 붉어지고, 따갑거나 화끈거리기 쉬워집니다. 낮을수록 자극에 예민한 상태예요.',
      en: 'How much redness is showing. A weakened barrier lets vessels show through and makes skin sting or flush easily. A low score means it is reacting to things it should tolerate.',
      zh: '泛红的程度。屏障受损时血管更明显，皮肤容易刺痛发烫。分数低表示对刺激过于敏感。',
      th: 'ระดับความแดงของผิว เมื่อเกราะผิวอ่อนแอ เส้นเลือดจะเห็นชัดและผิวแสบร้อนง่าย คะแนนต่ำแปลว่าผิวไวต่อสิ่งกระตุ้น',
    },
    low: {
      ko: '액티브를 멈추고 장벽부터 회복하세요. 판테놀·시카·세라마이드, 그리고 뜨거운 물 피하기.',
      en: 'Stop the actives and rebuild the barrier first — panthenol, cica, ceramides, and no hot water.',
      zh: '停用活性成分，先修复屏障：泛醇、积雪草、神经酰胺，并避免热水。',
      th: 'หยุดแอคทีฟแล้วฟื้นเกราะผิวก่อน — แพนทีนอล ซิก้า เซราไมด์ และเลี่ยงน้ำร้อน',
    },
  },
  {
    sd: 'firmness', hd: 'hd_firmness', group: 'firmness',
    name: { ko: '탄력', en: 'Firmness', zh: '弹性', th: 'ความยืดหยุ่น' },
    means: {
      ko: '피부가 얼마나 탱탱하게 받쳐주는지예요. 콜라겐과 탄력섬유가 줄면 낮아집니다.',
      en: 'How well the skin springs back. It falls as collagen and elastin thin out.',
      zh: '肌肤的回弹能力。随着胶原蛋白与弹力纤维减少而下降。',
      th: 'ความสามารถในการคืนตัวของผิว ลดลงเมื่อคอลลาเจนและอีลาสตินบางลง',
    },
    low: {
      ko: '자외선 차단이 가장 큰 예방책이에요. 펩타이드·레티날은 장벽이 안정된 뒤에.',
      en: 'Sun protection prevents most of it. Peptides and retinal once the barrier is settled.',
      zh: '防晒是最有效的预防。屏障稳定后再使用胜肽或视黄醛。',
      th: 'กันแดดคือการป้องกันที่ได้ผลที่สุด ใช้เปปไทด์หรือเรตินัลเมื่อเกราะผิวแข็งแรงแล้ว',
    },
  },
  {
    sd: 'wrinkle', hd: 'hd_wrinkle', group: 'firmness',
    name: { ko: '주름', en: 'Lines', zh: '皱纹', th: 'ริ้วรอย' },
    means: {
      ko: '이마·눈가·팔자 등 주름의 깊이와 양이에요. 수분이 부족하면 실제보다 더 깊어 보입니다.',
      en: 'The depth and spread of lines across forehead, eyes and nasolabial folds. Dehydration makes them look deeper than they are.',
      zh: '额头、眼周与法令纹的深度与数量。缺水时会显得比实际更深。',
      th: 'ความลึกและจำนวนริ้วรอยบนหน้าผาก รอบตา และร่องแก้ม ผิวขาดน้ำจะทำให้ดูลึกกว่าจริง',
    },
    low: {
      ko: '먼저 수분을 채우면 상당수가 옅어져요. 그 다음이 레티노이드입니다.',
      en: 'Hydrate first — a good share of them soften. Retinoids come after that.',
      zh: '先补水，很多细纹会淡化。之后再考虑视黄醇类。',
      th: 'เติมน้ำก่อน ริ้วรอยจำนวนมากจะดูจางลง แล้วค่อยใช้เรตินอยด์',
    },
  },
  {
    sd: 'dark_circle_v2', hd: 'hd_dark_circle', group: 'eyes',
    name: { ko: '다크서클', en: 'Dark circles', zh: '黑眼圈', th: 'รอยคล้ำใต้ตา' },
    means: {
      ko: '눈 밑이 어두워진 정도예요. 색소, 얇은 피부에 비친 혈관, 그림자가 섞여 나타납니다.',
      en: 'How dark the under-eye reads. Pigment, vessels showing through thin skin, and shadow all contribute.',
      zh: '眼下的暗沉程度。由色素、透出的血管与阴影共同造成。',
      th: 'ความคล้ำใต้ดวงตา เกิดจากเม็ดสี เส้นเลือดที่เห็นผ่านผิวบาง และเงา',
    },
    low: {
      ko: '원인에 따라 답이 달라요. 색소면 나이아신아마이드, 혈관·그림자면 수면과 자극 줄이기.',
      en: 'The fix depends on the cause: niacinamide for pigment, sleep and less rubbing for vessels and shadow.',
      zh: '解法取决于成因：色素型用烟酰胺，血管与阴影型靠睡眠与减少揉眼。',
      th: 'วิธีแก้ขึ้นกับสาเหตุ: ไนอาซินาไมด์สำหรับเม็ดสี นอนให้พอและเลี่ยงการขยี้ตาสำหรับเส้นเลือดและเงา',
    },
  },
  {
    sd: 'eye_bag', hd: 'hd_eye_bag', group: 'eyes',
    name: { ko: '눈밑 지방', en: 'Eye bags', zh: '眼袋', th: 'ถุงใต้ตา' },
    means: {
      ko: '눈 밑이 부풀어 나온 정도예요. 부기와 지방층 위치가 함께 작용합니다.',
      en: 'How much the under-eye puffs out. Fluid retention and the position of the fat pad both play a part.',
      zh: '眼下的膨出程度。水肿与脂肪垫位置共同作用。',
      th: 'ระดับความบวมใต้ตา เกิดจากการคั่งของน้ำและตำแหน่งชั้นไขมัน',
    },
    low: {
      ko: '스킨케어로 바꾸기 어려운 항목이에요. 염분·수면 관리가 부기에는 도움이 됩니다.',
      en: 'Not something skincare moves much. Salt and sleep help with the fluid part.',
      zh: '护肤能改善的空间有限。控制盐分与睡眠有助于消除水肿。',
      th: 'สกินแคร์ช่วยได้จำกัด ควบคุมโซเดียมและการนอนช่วยเรื่องอาการบวม',
    },
  },
  {
    sd: 'tear_trough', hd: 'hd_tear_trough', group: 'eyes',
    name: { ko: '눈밑 꺼짐', en: 'Tear trough', zh: '泪沟', th: 'ร่องใต้ตา' },
    means: {
      ko: '눈 밑에서 광대로 이어지는 골이 얼마나 파였는지예요. 그림자 때문에 다크서클처럼 보입니다.',
      en: 'How deep the groove from the inner eye toward the cheek runs. Its shadow is often mistaken for a dark circle.',
      zh: '从内眼角延伸到脸颊的凹陷深度。其阴影常被误认为黑眼圈。',
      th: 'ความลึกของร่องจากหัวตาลงมายังแก้ม เงาของมันมักถูกเข้าใจผิดว่าเป็นรอยคล้ำ',
    },
    low: {
      ko: '구조적인 부분이라 화장품으로는 한계가 있어요. 보습으로 그림자를 완화하는 정도입니다.',
      en: 'Structural, so cosmetics only go so far — hydration softens the shadow a little.',
      zh: '属于结构性问题，护肤品作用有限，保湿可略微淡化阴影。',
      th: 'เป็นเรื่องโครงสร้าง เครื่องสำอางช่วยได้จำกัด ความชุ่มชื้นช่วยลดเงาได้เล็กน้อย',
    },
  },
  {
    sd: 'droopy_upper_eyelid', hd: 'hd_droopy_upper_eyelid', group: 'eyes',
    name: { ko: '윗눈꺼풀 처짐', en: 'Upper lid droop', zh: '上眼睑下垂', th: 'เปลือกตาบนหย่อน' },
    means: {
      ko: '윗눈꺼풀이 내려온 정도예요. 눈가 피부가 얇아지고 탄력이 줄면서 나타납니다.',
      en: 'How far the upper lid has settled. Thinning skin and lost elasticity around the eye drive it.',
      zh: '上眼睑下垂的程度。眼周皮肤变薄、弹性下降所致。',
      th: 'ระดับการหย่อนของเปลือกตาบน เกิดจากผิวรอบตาบางลงและความยืดหยุ่นลดลง',
    },
    low: {
      ko: '눈가는 얼굴에서 가장 얇아요. 자외선 차단과 가벼운 아이크림 정도가 현실적입니다.',
      en: 'The eye area is the thinnest skin you have. Sun protection and a light eye cream is the realistic ceiling.',
      zh: '眼周是全脸最薄的皮肤。防晒加清爽眼霜是较现实的做法。',
      th: 'ผิวรอบตาบางที่สุดบนใบหน้า กันแดดและอายครีมเนื้อบางคือสิ่งที่ทำได้จริง',
    },
  },
  {
    sd: 'droopy_lower_eyelid', hd: 'hd_droopy_lower_eyelid', group: 'eyes',
    name: { ko: '아랫눈꺼풀 처짐', en: 'Lower lid droop', zh: '下眼睑下垂', th: 'เปลือกตาล่างหย่อน' },
    means: {
      ko: '아래 눈꺼풀이 늘어진 정도예요. 눈 밑 그늘이 길어 보이게 만듭니다.',
      en: 'How slack the lower lid sits. It lengthens the shadow under the eye.',
      zh: '下眼睑的松弛程度，会让眼下阴影显得更长。',
      th: 'ความหย่อนของเปลือกตาล่าง ทำให้เงาใต้ตาดูยาวขึ้น',
    },
    low: {
      ko: '문지르지 않는 게 가장 큰 관리예요. 클렌징할 때도 눈가는 살살.',
      en: 'Not rubbing is most of the care. Go gently around the eye when cleansing too.',
      zh: '不揉眼就是最好的护理。清洁时眼周也要轻柔。',
      th: 'การไม่ขยี้ตาคือการดูแลที่สำคัญที่สุด ตอนล้างหน้าก็ต้องเบามือรอบดวงตา',
    },
  },
]

const BY_KEY = new Map<string, ConcernDef>()
for (const c of CONCERNS) {
  BY_KEY.set(c.sd, c)
  BY_KEY.set(c.hd, c)
}

/** Look a reading up by whichever key the response used. */
export const concernOf = (key: string): ConcernDef | undefined => BY_KEY.get(key)

export const GROUP_ORDER: ConcernGroup[] = ['hydration', 'texture', 'tone', 'firmness', 'eyes']

export const groupNames: Record<ConcernGroup, Localized> = {
  hydration: { ko: '수분 · 유분', en: 'Water & oil', zh: '水分与油脂', th: 'น้ำและความมัน' },
  texture: { ko: '결 · 모공', en: 'Texture & pores', zh: '纹理与毛孔', th: 'เนื้อผิวและรูขุมขน' },
  tone: { ko: '톤 · 색소', en: 'Tone & pigment', zh: '肤色与色素', th: 'สีผิวและเม็ดสี' },
  firmness: { ko: '탄력 · 주름', en: 'Firmness & lines', zh: '弹性与皱纹', th: 'ความยืดหยุ่นและริ้วรอย' },
  eyes: { ko: '눈가', en: 'Eye area', zh: '眼周', th: 'รอบดวงตา' },
}

/**
 * The regions the vendor reports separately, and what they are.
 *
 * T-zone and U-zone are standard in Korean skincare and mean nothing to most
 * people elsewhere, so they are spelled out rather than assumed.
 */
export const regionNames: Record<string, Localized> = {
  whole: { ko: '얼굴 전체', en: 'Whole face', zh: '整脸', th: 'ทั้งใบหน้า' },
  t_zone: { ko: 'T존 (이마·코)', en: 'T-zone (forehead & nose)', zh: 'T区（额头与鼻子）', th: 'ทีโซน (หน้าผากและจมูก)' },
  u_zone: { ko: 'U존 (양볼·턱)', en: 'U-zone (cheeks & jaw)', zh: 'U区（双颊与下巴）', th: 'ยูโซน (แก้มและกราม)' },
  forehead: { ko: '이마', en: 'Forehead', zh: '额头', th: 'หน้าผาก' },
  nose: { ko: '코', en: 'Nose', zh: '鼻子', th: 'จมูก' },
  cheek: { ko: '볼', en: 'Cheeks', zh: '脸颊', th: 'แก้ม' },
  glabellar: { ko: '미간', en: 'Between brows', zh: '眉间', th: 'ระหว่างคิ้ว' },
  crowfeet: { ko: '눈가', en: 'Crow’s feet', zh: '眼尾', th: 'หางตา' },
  periocular: { ko: '눈 주변', en: 'Around the eyes', zh: '眼周', th: 'รอบดวงตา' },
  nasolabial: { ko: '팔자 주름', en: 'Nasolabial', zh: '法令纹', th: 'ร่องแก้ม' },
  marionette: { ko: '입가', en: 'Marionette', zh: '木偶纹', th: 'ร่องมุมปาก' },
}

export const regionName = (region: string, lang: Lang): string =>
  regionNames[region]?.[lang] ?? region

/** T-zone and U-zone explained, for the skin-type reading. */
export const zoneHelp: Localized = {
  ko: 'T존은 이마와 코를 잇는 부분, U존은 양볼과 턱선이에요. 두 구역은 피지량이 달라서 타입이 다르게 나오는 게 흔합니다.',
  en: 'The T-zone is the forehead and nose; the U-zone is the cheeks and jawline. They produce different amounts of oil, so a different reading on each is normal.',
  zh: 'T区指额头与鼻子，U区指双颊与下巴。两区出油量不同，检测结果不一致很常见。',
  th: 'ทีโซนคือหน้าผากและจมูก ยูโซนคือแก้มและกราม สองบริเวณนี้ผลิตความมันต่างกัน ผลจึงมักไม่เหมือนกัน',
}
