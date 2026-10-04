import type { Fit, FitStrength, Slot } from '../catalog/analysis'
import type { Localized, MetricKey, ProductTag } from './types'

/**
 * The AESTURA catalogue, as loaded from the supplier sheet.
 *
 * Price is the Lotte Duty Free selling price — the discounted one, not the
 * list price — carried in won, which is the currency products are authored in.
 * The dollar price a customer is charged is derived from it by the database.
 *
 * ── what every line here is allowed to say ──────────────────────────────────
 *
 * Each `pro` and `con` is a statement about the ingredient list, not a promise
 * about skin. "Niacinamide is third on the list" is a fact anyone can check
 * against the label; "this brightens" is a claim we are not entitled to make
 * except where the maker holds the 식약처 기능성 designation, which is noted
 * where it applies.
 *
 * `cons` is not a disclaimer section. A product with nothing to watch for is
 * one nobody read the list of, so every verified product has at least two.
 *
 * Products whose ingredient list the supplier has not published yet carry
 * `checked: false`, no analysis, and cannot be sold — the database enforces
 * that, because the alternative is writing the analysis from the product name.
 */

/* `Fit` and `FitStrength` live in `src/catalog/analysis.ts`, next to the labels
   that render them, and are re-exported here so a caller holding this file's
   products does not have to know that. */
export type { Fit, FitStrength }

export interface AesturaProduct {
  id: string
  /** The folder the detail pages live in, so a later upload can find its row. */
  folder: string
  line: string
  name: string
  nameKo: string
  ml: string
  kind: string
  /** 'single' or 'set' — a set prices and ships as one item. */
  bundle: 'single' | 'set'
  /** Lotte Duty Free selling price in won. Our price is the same. */
  krw: number
  /** Roughly how long one unit lasts, for the reorder reminder. */
  useDays: number
  tag: ProductTag
  /** The axis the match score is computed from. `fits` is what gets shown. */
  metric: MetricKey | 'uv'
  slot: Slot
  step: string
  gradient: string
  /**
   * Path under `public/` to the main product shot, e.g.
   * `/products/<id>/main.webp`. Empty until the product is photographed, in
   * which case `gradient` is what gets painted.
   */
  image: string
  sub: Localized
  why: Localized
  /** Whether the ingredient list below was checked against the maker's own. */
  checked: boolean
  ingredients: string
  inci: string
  fits: Fit[]
  pros: Localized[]
  cons: Localized[]
}

const G = {
  sand: 'linear-gradient(160deg,var(--surface-2),var(--ph-b))',
  sage: 'linear-gradient(160deg,var(--surface-2),var(--ph-a))',
  stone: 'linear-gradient(160deg,var(--surface-2),var(--ph-c))',
}

/* ── 에이시카365 흔적진정세럼 ─────────────────────────────────────────────────
   The analysis is shared between the single and the duo: same formula, same
   list, different box. Written once so the two can never drift apart. */
const ACICA_FITS: Fit[] = [
  {
    axis: 'sensitivity',
    strength: 'primary',
    note: {
      ko: '병풀에서 나온 성분 네 가지가 모두 들어 있습니다.',
      en: 'Carries all four of the compounds isolated from centella.',
      zh: '含有从积雪草中分离出的全部四种成分。',
      th: 'มีสารสำคัญจากใบบัวบกครบทั้งสี่ชนิด',
    },
  },
  {
    axis: 'pigmentation',
    strength: 'secondary',
    note: {
      ko: '나이아신아마이드로 미백 기능성을 받은 제품입니다.',
      en: 'Holds the Korean MFDS brightening designation, on niacinamide.',
      zh: '以烟酰胺取得韩国食药处美白功能性认证。',
      th: 'ได้รับการรับรองด้านความกระจ่างใสจาก MFDS เกาหลี ด้วยไนอาซินาไมด์',
    },
  },
  {
    axis: 'pores',
    strength: 'secondary',
    note: {
      ko: '글루코노락톤(PHA)이 pH 4.5에서 각질을 약하게 정돈합니다.',
      en: 'Gluconolactone, a PHA, works gently at the stated pH 4.5.',
      zh: '葡糖酸内酯（PHA）在标示的 pH4.5 下温和作用。',
      th: 'กลูโคโนแลกโตน (PHA) ทำงานอย่างอ่อนโยนที่ pH 4.5 ตามที่ระบุ',
    },
  },
]

const ACICA_PROS: Localized[] = [
  {
    ko: '아시아티코사이드·마데카식애씨드·아시아틱애씨드·마데카소사이드가 전부 따로 적혀 있습니다. 병풀추출물 한 줄로 끝내지 않았다는 뜻입니다.',
    en: 'Asiaticoside, madecassic acid, asiatic acid and madecassoside are each listed separately, rather than folded into one line of centella extract.',
    zh: '积雪草苷、羟基积雪草酸、积雪草酸、羟基积雪草苷分别列出，而非笼统写作积雪草提取物。',
    th: 'ระบุ asiaticoside, madecassic acid, asiatic acid และ madecassoside แยกกันทีละตัว ไม่ได้รวบเป็นสารสกัดใบบัวบกบรรทัดเดียว',
  },
  {
    ko: '나이아신아마이드가 여섯 번째입니다. 식약처 미백 고시 성분이 앞쪽에 있습니다.',
    en: 'Niacinamide is sixth on the list — the ingredient the brightening designation rests on, and well up the order.',
    zh: '烟酰胺位列第六。美白功能性所依据的成分排在前段。',
    th: 'ไนอาซินาไมด์อยู่ลำดับที่หก ซึ่งเป็นสารที่ใช้ขอรับรองความกระจ่างใส และอยู่ค่อนข้างต้นรายการ',
  },
  {
    ko: '스쿠알란·콜레스테롤·징크피씨에이가 함께 들어가, 각질을 정돈하는 제품인데도 장벽 쪽을 비워두지 않았습니다.',
    en: 'Squalane, cholesterol and zinc PCA sit alongside the acid, so a product that exfoliates is not one that only exfoliates.',
    zh: '角鲨烷、胆固醇与 PCA 锌同时在列，去角质的同时没有忽略屏障。',
    th: 'มีสควอเลน คอเลสเตอรอล และ zinc PCA ร่วมอยู่ด้วย ผลัดเซลล์ผิวโดยไม่ละเลยเกราะผิว',
  },
]

const ACICA_CONS: Localized[] = [
  {
    ko: '나이아신아마이드, 비타민C 유도체, PHA가 한 제품에 같이 있습니다. 처음에는 하루 걸러 쓰다가 늘려 보세요.',
    en: 'Niacinamide, a vitamin C derivative and a PHA all in one bottle. Start every other day and build up.',
    zh: '烟酰胺、维生素C衍生物与 PHA 同在一瓶。建议先隔日使用再逐渐增加。',
    th: 'มีไนอาซินาไมด์ อนุพันธ์วิตามินซี และ PHA อยู่ในขวดเดียว ควรเริ่มวันเว้นวันแล้วค่อยเพิ่ม',
  },
  {
    ko: 'PHA가 들어 있어, 쓰는 동안에는 낮에 자외선차단제를 함께 써야 합니다.',
    en: 'It contains a PHA, so sunscreen during the day is not optional while you are using it.',
    zh: '含 PHA，使用期间白天必须配合防晒。',
    th: 'มี PHA จึงต้องใช้ครีมกันแดดในเวลากลางวันตลอดช่วงที่ใช้',
  },
  {
    ko: '저녁 세럼 단계를 전제로 한 구성입니다. 아침에 쓰려면 자외선차단제를 반드시 덧발라야 합니다.',
    en: 'Built for the evening serum step. Using it in the morning means sunscreen over the top, every time.',
    zh: '配方以晚间精华步骤为前提。若早上使用，务必叠加防晒。',
    th: 'ออกแบบมาสำหรับขั้นตอนเซรั่มตอนกลางคืน หากใช้ตอนเช้าต้องทาครีมกันแดดทับทุกครั้ง',
  },
]

const ACICA_KO =
  '정제수, 글리세린, 부틸렌글라이콜, 다이프로필렌글라이콜, 베타인, 나이아신아마이드, 글루코노락톤, 1,2-헥산다이올, 다이에톡시에틸석시네이트, 트로메타민, 수크로오스스테아레이트, 스쿠알란, 하이드로제네이티드레시틴, 폴리글리세릴-10스테아레이트, 폴리글리세릴-10라우레이트, 카보머, 카프릴릴메티콘, 폴리아크릴레이트크로스폴리머-6, 에틸헥실글리세린, 콜레스테롤, 잔탄검, 아시아티코사이드, 마데카식애씨드, 아시아틱애씨드, 소듐하이알루로네이트, 셀룰로오스검, 3-O-에틸아스코빅애씨드, 징크피씨에이, 소듐글루코네이트, 글리세릴카프릴레이트, 마데카소사이드, 소듐트라이메타포스페이트'
const ACICA_INCI =
  'Water, Glycerin, Butylene Glycol, Dipropylene Glycol, Betaine, Niacinamide, Gluconolactone, 1,2-Hexanediol, Diethoxyethyl Succinate, Tromethamine, Sucrose Stearate, Squalane, Hydrogenated Lecithin, Polyglyceryl-10 Stearate, Polyglyceryl-10 Laurate, Carbomer, Caprylyl Methicone, Polyacrylate Crosspolymer-6, Ethylhexylglycerin, Cholesterol, Xanthan Gum, Asiaticoside, Madecassic Acid, Asiatic Acid, Sodium Hyaluronate, Cellulose Gum, 3-O-Ethyl Ascorbic Acid, Zinc PCA, Sodium Gluconate, Glyceryl Caprylate, Madecassoside, Sodium Trimetaphosphate'

export const aesturaProducts: AesturaProduct[] = [
  {
    id: 'ae-atobarrier365-cream-80',
    folder: 'Atobarrier365_Cream',
    line: '아토베리어365',
    name: 'Atobarrier365 Cream',
    nameKo: '아토베리어365 크림',
    ml: '80ml',
    kind: 'Cream',
    bundle: 'single',
    krw: 22842,
    useDays: 60,
    tag: 'Hydration',
    metric: 'hydration',
    slot: 'both',
    step: 'cream',
    gradient: G.sand,
    image: '/products/ae-atobarrier365-cream-80/main.webp',
    sub: {
      ko: '세라마이드 장벽 크림',
      en: 'Ceramide barrier cream',
      zh: '神经酰胺屏障面霜',
      th: 'ครีมเสริมเกราะผิวเซราไมด์',
    },
    why: {
      ko: '피부 장벽을 이루는 지질 세 종류가 한 제품에 다 들어 있어, 수분이 부족하다고 나온 날의 마지막 단계로 맞습니다.',
      en: 'All three lipid families that make up the skin barrier are in one jar, which is what the last step of a dry-reading day asks for.',
      zh: '构成皮肤屏障的三类脂质同在一罐，适合扫描显示缺水当天的最后一步。',
      th: 'มีไขมันครบทั้งสามกลุ่มที่ประกอบเป็นเกราะผิวในขวดเดียว เหมาะเป็นขั้นตอนสุดท้ายของวันที่ผลสแกนบอกว่าผิวขาดน้ำ',
    },
    checked: true,
    ingredients:
      '정제수, 부틸렌글라이콜, 글리세린, 부틸렌글라이콜다이카프릴레이트/다이카프레이트, 세틸에틸헥사노에이트, 스쿠알란, 펜타에리스리틸테트라아이소스테아레이트, 다이카프릴릴카보네이트, 베헤닐알코올, 다이메티콘, 하이드록시프로필비스팔미타마이드엠이에이, 스테아릭애씨드, 베타인, 만니톨, C14-22알코올, 팔미틱애씨드, 하이드록시프로필비스라우라마이드엠이에이, 아라키딜알코올, 콜레스테롤, 폴리아크릴레이트-13, C12-20알킬글루코사이드, 알란토인, 아라키딜글루코사이드, 나이아신아마이드, 세라마이드엔피, 글리세릴카프릴레이트, 에틸헥실글리세린, 하이드로제네이티드폴리아이소부텐, 카보머, 트로메타민, 다이메티콘올, 폴리글리세릴-10라우레이트, 하이드로제네이티드레시틴, 에틸헥실팔미테이트, 아크릴레이트/암모늄메타크릴레이트코폴리머, 솔비탄아이소스테아레이트, 실리카, 피토스핑고신, 스핑고리피드, 아라키딕애씨드, 토코페롤, 올레익애씨드',
    inci:
      'Water, Butylene Glycol, Glycerin, Butylene Glycol Dicaprylate/Dicaprate, Cetyl Ethylhexanoate, Squalane, Pentaerythrityl Tetraisostearate, Dicaprylyl Carbonate, Behenyl Alcohol, Dimethicone, Hydroxypropyl Bispalmitamide MEA, Stearic Acid, Betaine, Mannitol, C14-22 Alcohols, Palmitic Acid, Hydroxypropyl Bislauramide MEA, Arachidyl Alcohol, Cholesterol, Polyacrylate-13, C12-20 Alkyl Glucoside, Allantoin, Arachidyl Glucoside, Niacinamide, Ceramide NP, Glyceryl Caprylate, Ethylhexylglycerin, Hydrogenated Polyisobutene, Carbomer, Tromethamine, Dimethiconol, Polyglyceryl-10 Laurate, Hydrogenated Lecithin, Ethylhexyl Palmitate, Acrylates/Ammonium Methacrylate Copolymer, Sorbitan Isostearate, Silica, Phytosphingosine, Sphingolipids, Arachidic Acid, Tocopherol, Oleic Acid',
    fits: [
      {
        axis: 'hydration',
        strength: 'primary',
        note: {
          ko: '세라마이드·콜레스테롤·지방산이 모두 들어 있습니다.',
          en: 'Ceramide, cholesterol and fatty acids are all present.',
          zh: '神经酰胺、胆固醇与脂肪酸俱全。',
          th: 'มีทั้งเซราไมด์ คอเลสเตอรอล และกรดไขมัน',
        },
      },
      {
        axis: 'sensitivity',
        strength: 'secondary',
        note: {
          ko: '알란토인·판테놀 계열 대신 베타인과 만니톨이 자극을 덜어줍니다.',
          en: 'Allantoin with betaine and mannitol, rather than a fragrance-led soother.',
          zh: '以尿囊素搭配甜菜碱与甘露醇，而非依靠香料型舒缓成分。',
          th: 'ใช้อัลลันโทอินร่วมกับเบทาอีนและแมนนิทอล แทนสารปลอบประโลมที่มาพร้อมน้ำหอม',
        },
      },
    ],
    pros: [
      {
        ko: '세라마이드엔피, 콜레스테롤, 그리고 팔미틱·스테아릭·올레익·아라키딕애씨드까지 — 장벽을 이루는 지질 세 종류가 모두 적혀 있습니다. 하나만 넣고 장벽을 말하는 제품이 많습니다.',
        en: 'Ceramide NP, cholesterol, and palmitic, stearic, oleic and arachidic acids: all three lipid families the barrier is built from. Plenty of products name one and still say "barrier".',
        zh: '神经酰胺NP、胆固醇，以及棕榈酸、硬脂酸、油酸与花生酸——构成屏障的三类脂质全部在列。很多产品只含其一便自称屏障修护。',
        th: 'เซราไมด์ NP, คอเลสเตอรอล และกรดปาล์มิติก สเตียริก โอเลอิก อะราชิดิก ครบทั้งสามกลุ่มไขมันที่ประกอบเป็นเกราะผิว หลายผลิตภัณฑ์มีเพียงกลุ่มเดียวก็อ้างว่าเสริมเกราะแล้ว',
      },
      {
        ko: '하이드록시프로필비스팔미타마이드엠이에이와 비스라우라마이드엠이에이, 피토스핑고신, 스핑고리피드까지 세라마이드 계열이 여러 형태로 겹쳐 있습니다.',
        en: 'Hydroxypropyl bispalmitamide MEA, bislauramide MEA, phytosphingosine and sphingolipids stack several ceramide-family forms rather than relying on one.',
        zh: '羟丙基双棕榈酰胺MEA、双月桂酰胺MEA、植物鞘氨醇与鞘脂并存，以多种形式叠加而非依赖单一成分。',
        th: 'มี hydroxypropyl bispalmitamide MEA, bislauramide MEA, ไฟโตสฟิงโกซีน และสฟิงโกลิพิด ซ้อนกันหลายรูปแบบ ไม่ได้พึ่งตัวเดียว',
      },
      {
        ko: '나이아신아마이드와 알란토인이 함께 들어가, 수분과 지질 양쪽을 한 제품에서 맡습니다.',
        en: 'Niacinamide and allantoin sit alongside the lipids, so water and oil are handled in the same step.',
        zh: '烟酰胺与尿囊素同在，水分与油脂在同一步骤中兼顾。',
        th: 'ไนอาซินาไมด์และอัลลันโทอินอยู่ร่วมกับไขมัน จึงดูแลทั้งน้ำและน้ำมันในขั้นตอนเดียว',
      },
    ],
    cons: [
      {
        ko: '성분이 42종으로 많은 편입니다. 민감한 피부라면 귀 뒤나 팔 안쪽에 먼저 발라보고 하루를 두고 보세요.',
        en: 'Forty-two ingredients is a long list. On sensitive skin, try it behind an ear or inside a forearm first and leave it a day.',
        zh: '42种成分属偏多。敏感肌建议先在耳后或手臂内侧试用，观察一天。',
        th: 'ส่วนผสม 42 ชนิดถือว่ายาว ผิวแพ้ง่ายควรทดสอบหลังใบหูหรือท้องแขนก่อน แล้วรอดูหนึ่งวัน',
      },
      {
        ko: '다이메티콘과 하이드로제네이티드폴리아이소부텐 같은 폐색제가 들어 있어, 지성 피부에는 여름철에 무겁게 느껴질 수 있습니다.',
        en: 'Dimethicone and hydrogenated polyisobutene are occlusive, which oily skin can find heavy in summer.',
        zh: '含聚二甲基硅氧烷与氢化聚异丁烯等封闭性成分，油性肌夏季可能觉得厚重。',
        th: 'มีไดเมทิโคนและไฮโดรจิเนตพอลิไอโซบิวทีนซึ่งเป็นสารปิดกั้น ผิวมันอาจรู้สึกหนักในหน้าร้อน',
      },
    ],
  },

  {
    id: 'ae-atobarrier365-cream-mist-120',
    folder: 'Cream_Mist',
    line: '아토베리어365',
    name: 'Atobarrier365 Cream Mist',
    nameKo: '아토베리어365 크림미스트',
    ml: '120ml',
    kind: 'Mist',
    bundle: 'single',
    krw: 15228,
    useDays: 45,
    tag: 'Hydration',
    metric: 'hydration',
    slot: 'both',
    step: 'toner',
    gradient: G.sage,
    image: '/products/ae-atobarrier365-cream-mist-120/main.webp',
    sub: {
      ko: '유분을 품은 보습 미스트',
      en: 'Moisturising mist with oils',
      zh: '含油分的保湿喷雾',
      th: 'มิสต์บำรุงที่มีน้ำมันผสม',
    },
    why: {
      ko: '성분 16종으로 단순하고, 미스트인데 유분이 들어 있어 뿌린 수분이 그대로 날아가지 않습니다.',
      en: 'Sixteen ingredients, and unusually for a mist it carries oils, so what you spray does not simply evaporate off.',
      zh: '仅16种成分，且作为喷雾含有油分，喷上的水分不会直接蒸发。',
      th: 'ส่วนผสมเพียง 16 ชนิด และมีน้ำมันผสมอยู่ซึ่งไม่ค่อยพบในมิสต์ ความชุ่มชื้นที่พ่นจึงไม่ระเหยไปเฉย ๆ',
    },
    checked: true,
    ingredients:
      '정제수, 글리세린, 부틸렌글라이콜, 카프릴릭/카프릭트리글리세라이드, 하이드로제네이티드폴리(C6-14올레핀), 디메치콘, 세틸에칠헥사노에이트, 하이드록시프로필비스라우라마이드엠이에이, 1,2-헥산디올, 소듐서팩틴, 콜레스테롤, 글리세릴카프릴레이트, 디소듐이디티에이, 에칠헥실글리세린, 베헤닉애씨드, 토코페롤',
    inci:
      'Water, Glycerin, Butylene Glycol, Caprylic/Capric Triglyceride, Hydrogenated Poly(C6-14 Olefin), Dimethicone, Cetyl Ethylhexanoate, Hydroxypropyl Bislauramide MEA, 1,2-Hexanediol, Sodium Surfactin, Cholesterol, Glyceryl Caprylate, Disodium EDTA, Ethylhexylglycerin, Behenic Acid, Tocopherol',
    fits: [
      {
        axis: 'hydration',
        strength: 'primary',
        note: {
          ko: '글리세린이 두 번째, 유분이 네 번째부터 이어집니다.',
          en: 'Glycerin is second and the oils start at fourth.',
          zh: '甘油位列第二，油分自第四位起接续。',
          th: 'กลีเซอรีนอยู่ลำดับสอง และน้ำมันเริ่มตั้งแต่ลำดับสี่',
        },
      },
    ],
    pros: [
      {
        ko: '16종으로 구성이 단순합니다. 들어간 것이 적다는 건 맞지 않을 것도 적다는 뜻입니다.',
        en: 'Sixteen ingredients. A short list is also a short list of things that might not agree with you.',
        zh: '仅16种成分。成分少，意味着可能不合适的东西也少。',
        th: 'ส่วนผสม 16 ชนิด รายการที่สั้นก็หมายถึงสิ่งที่อาจไม่เข้ากับผิวก็น้อยตามไปด้วย',
      },
      {
        ko: '카프릴릭/카프릭트리글리세라이드와 세틸에칠헥사노에이트가 들어 있어, 수분만 뿌리고 끝나는 미스트와 다릅니다.',
        en: 'Caprylic/capric triglyceride and cetyl ethylhexanoate mean this is not a mist that sprays water and leaves.',
        zh: '含辛酸/癸酸甘油三酯与鲸蜡基乙基己酸酯，不同于只喷水便结束的喷雾。',
        th: 'มี caprylic/capric triglyceride และ cetyl ethylhexanoate จึงต่างจากมิสต์ที่พ่นแค่น้ำแล้วจบ',
      },
      {
        ko: '콜레스테롤과 하이드록시프로필비스라우라마이드엠이에이가 들어가 장벽 쪽도 조금 거듭니다.',
        en: 'Cholesterol and hydroxypropyl bislauramide MEA give it a small share of the barrier work too.',
        zh: '胆固醇与羟丙基双月桂酰胺MEA使其也分担了部分屏障工作。',
        th: 'คอเลสเตอรอลและ hydroxypropyl bislauramide MEA ทำให้มีส่วนช่วยเรื่องเกราะผิวอยู่บ้าง',
      },
    ],
    cons: [
      {
        ko: '세라마이드엔피는 없습니다. 크림을 대신하는 제품이 아니라 사이사이를 채우는 쪽입니다.',
        en: 'There is no ceramide NP here. It fills the gaps between steps rather than replacing the cream.',
        zh: '不含神经酰胺NP。它是步骤之间的补充，而非面霜的替代。',
        th: 'ไม่มีเซราไมด์ NP จึงเป็นตัวเติมระหว่างขั้นตอน ไม่ใช่ตัวแทนครีม',
      },
      {
        ko: '유분이 들어 있어 메이크업 위에 뿌리면 뭉칠 수 있습니다. 베이스 전에 쓰는 편이 낫습니다.',
        en: 'The oils can disturb makeup if you spray over it. Better before base than after.',
        zh: '含油分，喷在妆面上可能导致搓泥。建议在上妆前使用。',
        th: 'น้ำมันอาจทำให้เมคอัพเป็นคราบหากพ่นทับ ใช้ก่อนลงเบสจะดีกว่า',
      },
    ],
  },

  {
    id: 'ae-regederm365-capsule-serum-30',
    folder: 'Regederm365_Capsule_Serum',
    line: '리제덤365',
    name: 'Regederm365 Capsule Serum',
    nameKo: '리제덤365 모공탄력 캡슐세럼',
    ml: '30ml',
    kind: 'Serum',
    bundle: 'single',
    krw: 32631,
    useDays: 60,
    tag: 'Pore',
    metric: 'pores',
    slot: 'pm',
    step: 'serum',
    gradient: G.stone,
    image: '/products/ae-regederm365-capsule-serum-30/main.webp',
    sub: {
      ko: '모공·탄력 캡슐 세럼',
      en: 'Pore and firmness capsule serum',
      zh: '毛孔弹力胶囊精华',
      th: 'เซรั่มแคปซูลดูแลรูขุมขนและความกระชับ',
    },
    why: {
      ko: '나이아신아마이드가 세 번째에 적혀 있고 아데노신이 함께 들어가, 미백과 주름개선 두 가지 기능성을 모두 받았습니다.',
      en: 'Niacinamide is third on the list and adenosine is in there with it — the two designations this product holds.',
      zh: '烟酰胺位列第三，并含腺苷，对应该产品同时取得的美白与抗皱两项功能性认证。',
      th: 'ไนอาซินาไมด์อยู่ลำดับสามและมีอะดีโนซีนร่วมด้วย ตรงกับการรับรองสองด้านที่ผลิตภัณฑ์นี้ได้รับ',
    },
    checked: true,
    ingredients:
      '정제수, 부틸렌글라이콜, 나이아신아마이드, 글리세린, 다이메티콘, 1,2-헥산다이올, 하이드로제네이티드폴리데센, 스테아릭애씨드, 하이드록시프로필비스팔미타마이드엠이에이, 만니톨, 다이메티콘/비닐다이메티콘크로스폴리머, 폴리메틸메타크릴레이트, 카보머, 티몰트라이메톡시신나메이트, 소듐하이알루로네이트, 잔탄검, 글리세릴카프릴레이트, 소듐스테아로일글루타메이트, 소듐폴리아크릴로일다이메틸타우레이트, 아크릴레이트/암모늄메타크릴레이트코폴리머, 다이소듐이디티에이, 에틸헥실글리세린, 아데노신, 트로메타민, 콜레스테롤, 덱스트린, 카카오추출물, 실리카, 올레아놀릭애씨드, 3-O-에틸아스코빅애씨드, 하이드롤라이즈드익스텐신, 호호바씨오일, 폴리글리세릴-10라우레이트, 토코페롤, 하이드로제네이티드레시틴',
    inci:
      'Water, Butylene Glycol, Niacinamide, Glycerin, Dimethicone, 1,2-Hexanediol, Hydrogenated Polydecene, Stearic Acid, Hydroxypropyl Bispalmitamide MEA, Mannitol, Dimethicone/Vinyl Dimethicone Crosspolymer, Polymethyl Methacrylate, Carbomer, Thymol Trimethoxycinnamate, Sodium Hyaluronate, Xanthan Gum, Glyceryl Caprylate, Sodium Stearoyl Glutamate, Sodium Polyacryloyldimethyl Taurate, Acrylates/Ammonium Methacrylate Copolymer, Disodium EDTA, Ethylhexylglycerin, Adenosine, Tromethamine, Cholesterol, Dextrin, Theobroma Cacao (Cocoa) Extract, Silica, Oleanolic Acid, 3-O-Ethyl Ascorbic Acid, Hydrolyzed Extensin, Simmondsia Chinensis (Jojoba) Seed Oil, Polyglyceryl-10 Laurate, Tocopherol, Hydrogenated Lecithin',
    fits: [
      {
        axis: 'pores',
        strength: 'primary',
        note: {
          ko: '올레아놀릭애씨드와 실리카·폴리메틸메타크릴레이트가 함께 들어 있습니다.',
          en: 'Oleanolic acid, with silica and polymethyl methacrylate alongside it.',
          zh: '含齐墩果酸，并搭配二氧化硅与聚甲基丙烯酸甲酯。',
          th: 'มีกรดโอลีอะโนลิก ร่วมกับซิลิกาและโพลีเมทิลเมทาคริเลต',
        },
      },
      {
        axis: 'wrinkles',
        strength: 'secondary',
        note: {
          ko: '아데노신 — 식약처 주름개선 고시 성분입니다.',
          en: 'Adenosine, the ingredient behind the wrinkle-care designation.',
          zh: '腺苷，即抗皱功能性认证所依据的成分。',
          th: 'อะดีโนซีน สารที่ใช้ขอรับรองด้านริ้วรอย',
        },
      },
      {
        axis: 'pigmentation',
        strength: 'secondary',
        note: {
          ko: '나이아신아마이드와 3-O-에틸아스코빅애씨드가 함께 있습니다.',
          en: 'Niacinamide with 3-O-ethyl ascorbic acid.',
          zh: '烟酰胺与3-O-乙基抗坏血酸同在。',
          th: 'ไนอาซินาไมด์ร่วมกับ 3-O-ethyl ascorbic acid',
        },
      },
    ],
    pros: [
      {
        ko: '나이아신아마이드가 세 번째입니다. 미백 고시 성분이 물·부틸렌글라이콜 바로 다음에 온다는 뜻입니다.',
        en: 'Niacinamide is third — straight after water and butylene glycol, which is as far up the order as it realistically goes.',
        zh: '烟酰胺位列第三，紧随水与丁二醇之后，已是实际可能的靠前位置。',
        th: 'ไนอาซินาไมด์อยู่ลำดับสาม ถัดจากน้ำและบิวทิลีนไกลคอล ซึ่งถือว่าอยู่ต้นรายการเท่าที่เป็นไปได้',
      },
      {
        ko: '아데노신이 함께 들어가 미백과 주름개선 두 가지 기능성을 모두 받았습니다. 한쪽만 받은 제품이 더 흔합니다.',
        en: 'Adenosine is in there too, so it holds both the brightening and the wrinkle-care designations. One of the two is the more common case.',
        zh: '同时含腺苷，故兼具美白与抗皱两项功能性认证。多数产品只取得其中之一。',
        th: 'มีอะดีโนซีนด้วย จึงได้รับการรับรองทั้งด้านความกระจ่างใสและริ้วรอย ซึ่งโดยทั่วไปมักได้เพียงอย่างเดียว',
      },
      {
        ko: '하이드록시프로필비스팔미타마이드엠이에이와 콜레스테롤이 들어 있어, 각질·모공 쪽 제품인데도 장벽을 비워두지 않았습니다.',
        en: 'Hydroxypropyl bispalmitamide MEA and cholesterol are present, so a pore-focused serum still has something for the barrier.',
        zh: '含羟丙基双棕榈酰胺MEA与胆固醇，即便是针对毛孔的精华也兼顾了屏障。',
        th: 'มี hydroxypropyl bispalmitamide MEA และคอเลสเตอรอล เซรั่มที่เน้นรูขุมขนจึงยังดูแลเกราะผิวด้วย',
      },
    ],
    cons: [
      {
        ko: '나이아신아마이드가 상위에 있는 제품은 민감한 피부에서 일시적인 홍조가 나타나기도 합니다. 하루 걸러 시작해 보세요.',
        en: 'Niacinamide this high up can bring a temporary flush on sensitive skin. Start every other night.',
        zh: '烟酰胺排位靠前，敏感肌可能出现一过性泛红。建议先隔晚使用。',
        th: 'ไนอาซินาไมด์ที่อยู่ต้นรายการอาจทำให้ผิวแพ้ง่ายแดงชั่วคราว ควรเริ่มแบบวันเว้นวัน',
      },
      {
        ko: '3-O-에틸아스코빅애씨드가 들어 있어, 쓰는 동안에는 낮에 자외선차단제가 필요합니다.',
        en: 'It contains 3-O-ethyl ascorbic acid, so daytime sunscreen is needed while you are on it.',
        zh: '含3-O-乙基抗坏血酸，使用期间白天需要防晒。',
        th: 'มี 3-O-ethyl ascorbic acid จึงต้องใช้ครีมกันแดดตอนกลางวันระหว่างที่ใช้',
      },
      {
        ko: '실리콘과 폴리메틸메타크릴레이트가 들어가 발린 직후 매끈하게 느껴집니다. 그 질감을 모공이 메워진 것으로 읽지 마세요.',
        en: 'Silicones and polymethyl methacrylate make it feel smooth on contact. That texture is not the same thing as a pore having changed.',
        zh: '硅类与聚甲基丙烯酸甲酯令上脸即刻顺滑。这种肤感并不等同于毛孔本身发生了变化。',
        th: 'ซิลิโคนและโพลีเมทิลเมทาคริเลตทำให้รู้สึกเรียบทันทีที่ทา สัมผัสนั้นไม่เท่ากับรูขุมขนเปลี่ยนไปจริง',
      },
    ],
  },

  {
    id: 'ae-dermauv365-mineral-40',
    folder: 'DermaUV365_Mineral_Sunscreen',
    line: '더마UV365',
    name: 'DermaUV365 Mineral Sunscreen SPF50+ PA++++',
    nameKo: '더마UV365 장벽수분 무기자차 선크림',
    ml: '40ml',
    kind: 'Sunscreen',
    bundle: 'single',
    krw: 20666,
    useDays: 45,
    tag: 'SPF',
    metric: 'uv',
    slot: 'am',
    step: 'spf',
    gradient: G.sage,
    image: '/products/ae-dermauv365-mineral-40/main.webp',
    sub: {
      ko: '징크 단일 무기자차 · SPF50+ PA++++',
      en: 'Zinc-only mineral sunscreen · SPF50+ PA++++',
      zh: '纯氧化锌物理防晒 · SPF50+ PA++++',
      th: 'กันแดดกายภาพสูตรซิงก์ล้วน · SPF50+ PA++++',
    },
    why: {
      ko: '자외선차단 성분이 징크옥사이드 하나뿐이고, 선크림인데 세라마이드엔피와 히알루론산 세 가지가 함께 들어 있습니다.',
      en: 'Zinc oxide is the only UV filter, and for a sunscreen it carries ceramide NP and three forms of hyaluronic acid.',
      zh: '防晒剂仅氧化锌一种，且作为防晒产品含神经酰胺NP与三种玻尿酸。',
      th: 'ใช้ซิงก์ออกไซด์เป็นสารกันแดดเพียงตัวเดียว และมีเซราไมด์ NP กับไฮยาลูรอนสามรูปแบบ ซึ่งไม่ค่อยพบในครีมกันแดด',
    },
    checked: true,
    ingredients:
      '정제수, 징크옥사이드, 사이클로헥사실록세인, 프로판다이올, 부틸옥틸살리실레이트, 프로필헵틸카프릴레이트, 아이소도데케인, 폴리글리세릴-3폴리다이메틸실록시에틸다이메티콘, 카프릴릴메티콘, 다이실록세인, 다이스테아다이모늄헥토라이트, 마그네슘설페이트, 트라이에톡시카프릴릴실레인, 1,2-헥산다이올, 폴리메틸실세스퀴옥세인, 폴리글리세릴-2다이폴리하이드록시스테아레이트, 라우릴폴리글리세릴-3폴리다이메틸실록시에틸다이메티콘, 알란토인, 카프릴릴글라이콜, 글리세릴카프릴레이트, 에틸헥실글리세린, 소듐하이알루로네이트, 세라마이드엔피, 토코페롤, 소듐아세틸레이티드하이알루로네이트, 하이드롤라이즈드하이알루로닉애씨드',
    inci:
      'Water, Zinc Oxide, Cyclohexasiloxane, Propanediol, Butyloctyl Salicylate, Propylheptyl Caprylate, Isododecane, Polyglyceryl-3 Polydimethylsiloxyethyl Dimethicone, Caprylyl Methicone, Disiloxane, Disteardimonium Hectorite, Magnesium Sulfate, Triethoxycaprylylsilane, 1,2-Hexanediol, Polymethylsilsesquioxane, Polyglyceryl-2 Dipolyhydroxystearate, Lauryl Polyglyceryl-3 Polydimethylsiloxyethyl Dimethicone, Allantoin, Caprylyl Glycol, Glyceryl Caprylate, Ethylhexylglycerin, Sodium Hyaluronate, Ceramide NP, Tocopherol, Sodium Acetylated Hyaluronate, Hydrolyzed Hyaluronic Acid',
    fits: [
      {
        axis: 'uv',
        strength: 'primary',
        note: {
          ko: 'SPF50+ / PA++++, 징크옥사이드 단일 차단.',
          en: 'SPF50+ / PA++++, filtered by zinc oxide alone.',
          zh: 'SPF50+ / PA++++，仅以氧化锌防护。',
          th: 'SPF50+ / PA++++ ป้องกันด้วยซิงก์ออกไซด์เพียงตัวเดียว',
        },
      },
      {
        axis: 'hydration',
        strength: 'secondary',
        note: {
          ko: '히알루론산 세 가지와 세라마이드엔피가 함께 들어 있습니다.',
          en: 'Three forms of hyaluronic acid, with ceramide NP.',
          zh: '三种玻尿酸形式，并含神经酰胺NP。',
          th: 'ไฮยาลูรอนสามรูปแบบ พร้อมเซราไมด์ NP',
        },
      },
      {
        axis: 'sensitivity',
        strength: 'secondary',
        note: {
          ko: '화학 자외선차단 성분이 들어 있지 않습니다.',
          en: 'No chemical UV filters in the list.',
          zh: '配方中不含化学防晒剂。',
          th: 'ไม่มีสารกันแดดเคมีอยู่ในรายการ',
        },
      },
    ],
    pros: [
      {
        ko: '자외선차단 성분이 징크옥사이드 하나입니다. 무기·유기를 섞어 백탁을 줄인 제품이 많은데, 이건 섞지 않았습니다.',
        en: 'Zinc oxide is the only filter. Many so-called mineral sunscreens blend in a chemical one to cut the white cast; this does not.',
        zh: '防晒剂仅氧化锌一种。不少标榜物理防晒的产品会掺入化学防晒剂以减轻泛白，此款没有。',
        th: 'ใช้ซิงก์ออกไซด์เป็นสารกันแดดตัวเดียว ครีมกันแดดกายภาพหลายตัวผสมสารเคมีเพื่อลดความวอก แต่ตัวนี้ไม่ได้ผสม',
      },
      {
        ko: '선크림인데 세라마이드엔피와 히알루론산 세 가지가 들어 있습니다. 자외선차단제가 건조하다는 문제를 성분으로 덮었습니다.',
        en: 'A sunscreen with ceramide NP and three hyaluronic acids in it — the usual complaint about sunscreen answered in the formula rather than in the copy.',
        zh: '防晒产品中含神经酰胺NP与三种玻尿酸，以配方而非文案回应了防晒易干的常见问题。',
        th: 'ครีมกันแดดที่มีเซราไมด์ NP และไฮยาลูรอนสามรูปแบบ ตอบข้อครหาเรื่องความแห้งด้วยสูตร ไม่ใช่ด้วยคำโฆษณา',
      },
      {
        ko: '알란토인이 들어가 자극을 덜어주고, 향료는 적혀 있지 않습니다.',
        en: 'Allantoin for comfort, and no fragrance appears on the list.',
        zh: '含尿囊素以降低刺激，成分表中未见香料。',
        th: 'มีอัลลันโทอินช่วยลดการระคายเคือง และไม่พบน้ำหอมในรายการ',
      },
    ],
    cons: [
      {
        ko: '무기자차는 바른 직후 하얗게 뜰 수 있습니다. 한 번에 두껍게 바르기보다 얇게 두 번 나눠 바르는 편이 낫습니다.',
        en: 'Mineral filters can leave a white cast. Two thin layers sit better than one thick one.',
        zh: '物理防晒可能泛白。分两次薄涂比一次厚涂更服帖。',
        th: 'สารกันแดดกายภาพอาจทิ้งคราบขาว ทาบาง ๆ สองรอบจะเนียนกว่าทาหนารอบเดียว',
      },
      {
        ko: '실리콘 베이스라 저녁에는 클렌징을 꼼꼼히 해야 합니다. 물로만 씻어내기는 어렵습니다.',
        en: 'It is silicone-based, so it needs a proper cleanse at night. Water alone will not take it off.',
        zh: '以硅类为基底，晚间需认真卸洗，仅用清水难以洗净。',
        th: 'เป็นสูตรซิลิโคน จึงต้องล้างให้สะอาดในตอนกลางคืน น้ำเปล่าอย่างเดียวล้างไม่ออก',
      },
    ],
  },

  {
    id: 'ae-acica365-soothing-serum-40',
    folder: 'ACICA365_Soothing_Serum',
    line: '에이시카365',
    name: 'ACICA365 Soothing Serum pH4.5',
    nameKo: '에이시카365 흔적진정세럼 pH4.5',
    ml: '40ml',
    kind: 'Serum',
    bundle: 'single',
    krw: 26105,
    useDays: 60,
    tag: 'Soothing',
    metric: 'sensitivity',
    slot: 'pm',
    step: 'serum',
    gradient: G.sage,
    image: '/products/ae-acica365-soothing-serum-40/main.webp',
    sub: {
      ko: '병풀 4종 진정 세럼 · pH4.5',
      en: 'Four-compound centella serum · pH4.5',
      zh: '积雪草四重舒缓精华 · pH4.5',
      th: 'เซรั่มใบบัวบกสี่สาร · pH4.5',
    },
    why: {
      ko: '병풀에서 나온 성분 네 가지가 추출물 한 줄이 아니라 각각 적혀 있고, 나이아신아마이드로 미백 기능성을 받았습니다.',
      en: 'The four centella compounds are listed one by one rather than as a single extract, and niacinamide carries the brightening designation.',
      zh: '四种积雪草成分逐一列出，而非合并为一行提取物，并以烟酰胺取得美白功能性认证。',
      th: 'สารจากใบบัวบกสี่ชนิดถูกระบุทีละตัว ไม่ได้รวบเป็นสารสกัดบรรทัดเดียว และได้รับรองความกระจ่างใสด้วยไนอาซินาไมด์',
    },
    checked: true,
    ingredients: ACICA_KO,
    inci: ACICA_INCI,
    fits: ACICA_FITS,
    pros: ACICA_PROS,
    cons: ACICA_CONS,
  },

  {
    id: 'ae-acica365-soothing-serum-duo',
    folder: 'ACICA365_Soothing_Serum_Duo',
    line: '에이시카365',
    name: 'ACICA365 Soothing Serum pH4.5 Duo',
    nameKo: '에이시카365 흔적진정세럼 pH4.5 듀오',
    ml: '40ml × 2',
    kind: 'Serum',
    bundle: 'set',
    krw: 46771,
    useDays: 120,
    tag: 'Soothing',
    metric: 'sensitivity',
    slot: 'pm',
    step: 'serum',
    gradient: G.sage,
    image: '',
    sub: {
      ko: '흔적진정세럼 2개 세트',
      en: 'Two bottles of the soothing serum',
      zh: '舒缓精华两瓶装',
      th: 'เซรั่มปลอบประโลม แพ็กสองขวด',
    },
    why: {
      ko: '단품과 같은 제품 두 개입니다. 하루 걸러 시작해 넉 달쯤 쓰는 분량이라, 한 통으로는 변화를 보기 어려운 성분 구성에 맞습니다.',
      en: 'Two bottles of the same serum. About four months at every-other-day use, which suits a formula you are meant to build up slowly.',
      zh: '与单品相同的产品两瓶。按隔日使用约可用四个月，适合需要循序渐进的配方。',
      th: 'เซรั่มตัวเดียวกันสองขวด ใช้แบบวันเว้นวันได้ราวสี่เดือน เหมาะกับสูตรที่ต้องค่อย ๆ เพิ่มความถี่',
    },
    checked: true,
    ingredients: ACICA_KO,
    inci: ACICA_INCI,
    fits: ACICA_FITS,
    pros: ACICA_PROS,
    cons: ACICA_CONS,
  },

  /* ── not for sale ──────────────────────────────────────────────────────────
     The detail pages are finished, but the maker has not published an
     ingredient list for the renewed 80ml. Everything this app says about a
     product is derived from that list, so there is nothing to say yet — and
     the database will refuse to let it go on sale until there is. */
  {
    id: 'ae-atobarrier365-hydro-soothing-80',
    folder: 'Hydro_Soothing_Cream',
    line: '아토베리어365',
    name: 'Atobarrier365 Hydro Soothing Cream',
    nameKo: '아토베리어365 하이드로 수딩크림',
    ml: '80ml',
    kind: 'Cream',
    bundle: 'single',
    krw: 22842,
    useDays: 60,
    tag: 'Soothing',
    metric: 'sensitivity',
    slot: 'both',
    step: 'cream',
    gradient: G.stone,
    image: '/products/ae-atobarrier365-hydro-soothing-80/main.webp',
    sub: { ko: '', en: '', zh: '', th: '' },
    why: { ko: '', en: '', zh: '', th: '' },
    checked: false,
    ingredients: '',
    inci: '',
    fits: [],
    pros: [],
    cons: [],
  },
]
