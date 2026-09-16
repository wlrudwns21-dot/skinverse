import type { Strings } from './types'

export const en: Strings = {
  myPage: 'MY', bag: 'Bag', match: 'match',
  kicker: 'AI SKIN ANALYSIS', heroT: 'Your skin, decoded in 40 seconds.',
  heroSub: '6-point diagnosis, matched K-beauty routine, shipped worldwide from Seoul.',
  startBtn: 'Start Analysis', todayIn: 'Today in', skinScore: 'Skin Score', skinScoreU: 'SKIN SCORE',
  viewReport: 'View full report',
  noScan: 'No analysis yet. Run your first scan to unlock matched products and a weather-tuned routine.',
  matched: 'Matched for you', allProducts: 'All products', todayMissions: "Today's missions", earnP: 'Earn P',

  scanTitle: 'AI Skin Analysis', scanSub: '6-point diagnostic mapped to your climate.',
  selfiePh: 'Drop a selfie (optional)', tip1: 'Even, natural light', tip2: 'Bare skin, no makeup',
  tip3: 'Face centered, hair back', beginScan: 'Begin Scan', demoNote: 'Demo mode — works without a photo',

  s1: 'Mapping facial zones', s2: 'Measuring hydration & texture', s3: 'Comparing 1.2M skin profiles',
  s4: 'Building your routine', insight: 'AI Insight', matchedBtn: 'Matched products',
  routineBtn: 'Build routine', rescan: 'Rescan',
  low: 'Low', fair: 'Fair', good: 'Good',

  shopTitle: 'Shop', shopSub: 'Matched to your scan · ships from Seoul',
  addBag: 'Add to Bag', buyNow: 'Buy Now', whyT: 'Why it matched you', ingT: 'Key ingredients',

  cartTitle: 'Your Bag', cartEmpty: 'Your bag is empty', browse: 'Browse matched products',
  subtotal: 'Subtotal', intlShip: 'Intl. shipping from Seoul', earnPreview: "Points you'll earn",
  checkout: 'Checkout',

  shipTitle: 'Shipping', fullName: 'FULL NAME', country: 'COUNTRY / REGION', address: 'ADDRESS',
  shipMethod: 'SHIPPING METHOD', dhlDesc: '3–5 business days · tracked · customs handled',
  emsDesc: '7–14 business days · tracked', toPayment: 'Continue to Payment',

  payTitle: 'Payment', shipFee: 'Shipping', ptsDisc: 'Points discount', total: 'Total',
  usePts: (p, d) => 'Use ' + p + ' P → save ' + d,
  ptsNote: 'Use points (up to 30% of order)', payWith: 'Pay with',
  testNote: 'Test payment — no real charge', loggedInAs: 'Logged in as', payNow: 'Pay Now',
  cancel: 'Cancel', processing: 'Processing payment…',

  confirmed: 'Order confirmed', confirmedSub: 'Shipping from Seoul', orderNo: 'Order no.',
  paidVia: 'Paid via PayPal', delivery: 'Delivery', ptsEarned: 'Points earned',
  contShop: 'Continue shopping', viewMy: 'View in My Page',

  routineTitle: 'Climate Routine', routineSub: 'Tuned to your scan + local weather',
  temp: 'Temp', humidity: 'Humidity', adjust: "Today's adjustment", morning: 'Morning',
  evening: 'Evening', completeCta: "Complete today's routine → earn P",

  glowPts: 'GLOW POINTS', daily: 'Daily missions', weekly: 'Weekly', redeem: 'Redeem',
  redeemed: 'Redeemed ✓', toLv: (p, n) => p + ' P to ' + n, maxLv: 'Max level',
  streakLine: (d) => d + '-day streak',

  skinHistory: 'Skin history', orders: 'Orders', inTransit: 'In transit', noOrders: 'No orders yet',
  settings: 'Settings', language: 'Language', currency: 'Currency', shipRegion: 'Shipping region',
  reminders: 'Routine reminders', firstScan: 'First analysis', latest: 'Latest', scanN: 'Scan',

  tabs: ['Home', 'Analysis', 'Shop', 'Routine', 'Rewards'],

  hintHumid: 'High humidity — gel textures today', hintDry: 'Dry air — add facial oil',
  hintMild: 'Mild day — standard routine',
  advHumid: (h) => 'Humidity is ' + h + '% — switch to gel textures and skip heavy occlusives today. ',
  advDry: (h) => 'Air is dry (' + h + '%) — add a facial oil over moisturizer and run a humidifier at night. ',
  advMild: 'Comfortable humidity — keep your standard layering. ',
  advUvHi: (u) => 'UV ' + u + ' is very high: SPF50+, reapply every 3h outdoors.',
  advUvMid: (u) => 'UV ' + u + ': SPF50+ before going out.',
  advUvLo: 'UV is moderate — one SPF application covers the day.',

  st1: 'Low-pH Gel Cleanser', st1n: 'lukewarm water, 60s', st2h: 'Hydrating Mist Toner',
  st2d: 'Essence Toner ×2 layers', st2n: "pat, don't rub", target: 'Target:',
  lowestNote: 'lowest score —', st4h: 'Oil-free Gel Moisturizer', st4d: 'Ceramide Cream',
  st4hn: (h) => 'lightweight for ' + h + '% humidity', st4dn: 'seals in hydration',
  spfRe: ' — reapply 2PM', uvIn: (u, c) => 'UV index ' + u + ' in ' + c,

  pm1: 'Double Cleanse (balm → gel)', pm1h: 'sweat + sebum day', pm1n: 'removes SPF fully',
  pm2: 'Treatment Essence', pm2n: 'prep for actives', pm3n: 'PM absorption is higher',
  pm4a: 'Rice Ceramide Sleep Mask', pm4b: 'Barrier Night Cream', pm4n: '2–3× per week',

  tAdded: 'Added to bag', tNoPts: 'Not enough points',
  tSoldOut: 'This reward has run out',
  tOrderFailed: 'The order could not be placed. Please check your bag',
  tLeaveRequested: 'Your withdrawal request has been received',
  tLeaveCancelled: 'Withdrawal request cancelled',
  tStockShort: (name, left) =>
    left > 0 ? `Only ${left} of ${name} left` : `${name} has sold out`,
  tEarn: (p) => '+' + p + ' P earned',
  tStreak: (p, d) => '+' + p + ' P · Streak day ' + d + '!',
  tScanM: '+30 P — Weekly scan mission cleared',
  tRedeem: (n) => n + ' — added to your next order',
}
