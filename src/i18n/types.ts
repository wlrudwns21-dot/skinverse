/**
 * The full string table for one language. Ported 1:1 from the `L` map in
 * `project/Skinverse.dc.html` — entries that interpolate numbers stay functions
 * so each language keeps its own word order.
 */
export interface Strings {
  // Header / shared
  myPage: string
  bag: string
  match: string

  // Home
  kicker: string
  heroT: string
  heroSub: string
  startBtn: string
  todayIn: string
  skinScore: string
  skinScoreU: string
  viewReport: string
  noScan: string
  matched: string
  allProducts: string
  todayMissions: string
  earnP: string

  // Scan — intro
  scanTitle: string
  scanSub: string
  selfiePh: string
  tip1: string
  tip2: string
  tip3: string
  beginScan: string
  demoNote: string

  // Scan — progress + results
  s1: string
  s2: string
  s3: string
  s4: string
  insight: string
  matchedBtn: string
  routineBtn: string
  rescan: string
  low: string
  fair: string
  good: string

  // Shop / detail
  shopTitle: string
  shopSub: string
  addBag: string
  buyNow: string
  whyT: string
  ingT: string

  // Cart
  cartTitle: string
  cartEmpty: string
  browse: string
  subtotal: string
  intlShip: string
  earnPreview: string
  checkout: string

  // Checkout — shipping
  shipTitle: string
  fullName: string
  country: string
  address: string
  shipMethod: string
  dhlDesc: string
  emsDesc: string
  toPayment: string

  // Checkout — payment
  payTitle: string
  shipFee: string
  ptsDisc: string
  total: string
  usePts: (points: string, discount: string) => string
  ptsNote: string
  payWith: string
  testNote: string
  loggedInAs: string
  payNow: string
  cancel: string
  processing: string

  // Checkout — confirmation
  confirmed: string
  confirmedSub: string
  orderNo: string
  paidVia: string
  delivery: string
  ptsEarned: string
  contShop: string
  viewMy: string

  // Routine
  routineTitle: string
  routineSub: string
  temp: string
  humidity: string
  adjust: string
  morning: string
  evening: string
  completeCta: string

  // Missions / rewards
  glowPts: string
  daily: string
  weekly: string
  redeem: string
  redeemed: string
  toLv: (points: string, level: string) => string
  maxLv: string
  streakLine: (days: number) => string

  // My page
  skinHistory: string
  orders: string
  inTransit: string
  noOrders: string
  settings: string
  language: string
  currency: string
  shipRegion: string
  reminders: string
  firstScan: string
  latest: string
  scanN: string

  /** Bottom nav labels: home, analysis, shop, routine, rewards. */
  tabs: [string, string, string, string, string]

  // Weather hints
  hintHumid: string
  hintDry: string
  hintMild: string
  advHumid: (humidity: number) => string
  advDry: (humidity: number) => string
  advMild: string
  advUvHi: (uv: number) => string
  advUvMid: (uv: number) => string
  advUvLo: string

  // Routine steps — morning
  st1: string
  st1n: string
  st2h: string
  st2d: string
  st2n: string
  target: string
  lowestNote: string
  st4h: string
  st4d: string
  st4hn: (humidity: number) => string
  st4dn: string
  spfRe: string
  uvIn: (uv: number, city: string) => string

  // Routine steps — evening
  pm1: string
  pm1h: string
  pm1n: string
  pm2: string
  pm2n: string
  pm3n: string
  pm4a: string
  pm4b: string
  pm4n: string

  // Toasts
  tAdded: string
  tNoPts: string
  tEarn: (points: number) => string
  tStreak: (points: number, day: number) => string
  tScanM: string
  tRedeem: (name: string) => string
}
