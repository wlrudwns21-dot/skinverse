import type { Strings } from './types'

export const zh: Strings = {
  myPage: '我的', bag: '购物袋', match: '匹配',
  kicker: 'AI 肌肤分析', heroT: '40秒读懂你的肌肤。',
  heroSub: '6项诊断，专属K-beauty护肤方案，首尔直邮全球。',
  startBtn: '开始分析', todayIn: '今日天气 ·', skinScore: '肌肤评分', skinScoreU: '肌肤评分',
  viewReport: '查看完整报告',
  noScan: '还没有分析记录。完成首次扫描即可解锁匹配产品和天气定制护肤方案。',
  matched: '为你匹配', allProducts: '全部商品', todayMissions: '今日任务', earnP: '赚积分',

  scanTitle: 'AI 肌肤分析', scanSub: '结合居住地气候的6项诊断。',
  selfiePh: '拖入自拍照（可选）', tip1: '均匀自然光线', tip2: '素颜无妆',
  tip3: '面部居中，头发后梳', beginScan: '开始扫描', demoNote: '演示模式 — 无照片也可进行',

  s1: '正在映射面部区域', s2: '正在测量水分与肤质', s3: '正在比对120万肌肤档案',
  s4: '正在生成专属方案', insight: 'AI 洞察', matchedBtn: '匹配产品',
  routineBtn: '创建方案', rescan: '重新分析',
  low: '偏低', fair: '一般', good: '良好',

  shopTitle: '商店', shopSub: '基于扫描结果推荐 · 首尔发货',
  addBag: '加入购物袋', buyNow: '立即购买', whyT: '为什么匹配你', ingT: '核心成分',

  cartTitle: '购物袋', cartEmpty: '购物袋是空的', browse: '浏览匹配产品',
  subtotal: '小计', intlShip: '首尔国际直邮', earnPreview: '预计获得积分',
  checkout: '去结算',

  shipTitle: '配送信息', fullName: '姓名', country: '国家 / 地区', address: '地址',
  shipMethod: '配送方式', dhlDesc: '3–5个工作日 · 可追踪 · 代办清关',
  emsDesc: '7–14个工作日 · 可追踪', toPayment: '继续付款',

  payTitle: '付款', shipFee: '运费', ptsDisc: '积分抵扣', total: '总计',
  usePts: (p, d) => '使用 ' + p + ' 积分 → 省 ' + d,
  ptsNote: '使用积分（最高抵订单30%）', payWith: '使用',
  testNote: '测试付款 — 不会真实扣款', loggedInAs: '当前登录', payNow: '立即支付',
  cancel: '取消', processing: '正在处理付款…',

  confirmed: '订单已确认', confirmedSub: '从首尔发货', orderNo: '订单号',
  paidVia: 'PayPal 支付', delivery: '预计送达', ptsEarned: '已获得积分',
  contShop: '继续购物', viewMy: '在我的页面查看',

  routineTitle: '气候护肤方案', routineSub: '结合扫描结果与当地天气',
  temp: '气温', humidity: '湿度', adjust: '今日调整', morning: '早间',
  evening: '晚间', completeCta: '完成今日护肤 → 赚积分',

  glowPts: '焕光积分', daily: '今日任务', weekly: '每周任务', redeem: '积分兑换',
  redeemed: '已兑换 ✓', toLv: (p, n) => '距 ' + n + ' 还需 ' + p + ' 积分', maxLv: '最高等级',
  streakLine: (d) => '连续 ' + d + ' 天',

  skinHistory: '肌肤记录', orders: '订单', inTransit: '运送中', noOrders: '暂无订单',
  settings: '设置', language: '语言', currency: '货币', shipRegion: '配送地区',
  reminders: '护肤提醒', firstScan: '首次分析', latest: '最新', scanN: '扫描',

  tabs: ['首页', '分析', '商店', '方案', '奖励'],

  hintHumid: '湿度高 — 今日建议啫喱质地', hintDry: '空气干燥 — 建议加护肤油',
  hintMild: '天气温和 — 常规护肤即可',
  advHumid: (h) => '湿度 ' + h + '% — 今天改用啫喱质地，跳过厚重面霜。',
  advDry: (h) => '空气干燥（' + h + '%）— 在面霜后叠加护肤油，夜间开加湿器。',
  advMild: '湿度舒适 — 保持常规叠加护肤。',
  advUvHi: (u) => 'UV ' + u + ' 极高：SPF50+，户外每3小时补涂。',
  advUvMid: (u) => 'UV ' + u + '：出门前涂SPF50+。',
  advUvLo: 'UV 中等 — 早间防晒一次即可。',

  st1: '弱酸性洁面啫喱', st1n: '温水，60秒', st2h: '保湿喷雾爽肤水',
  st2d: '精华水 ×2 层叠加', st2n: '轻拍，勿揉搓', target: '重点护理：',
  lowestNote: '最低分 —', st4h: '无油啫喱面霜', st4d: '神经酰胺面霜',
  st4hn: (h) => '适合 ' + h + '% 湿度的轻薄质地', st4dn: '锁住水分',
  spfRe: ' — 下午2点补涂', uvIn: (u, c) => c + ' UV 指数 ' + u,

  pm1: '双重清洁（卸妆膏 → 啫喱）', pm1h: '出汗出油的一天', pm1n: '彻底卸除防晒',
  pm2: '精华液', pm2n: '为活性成分打底', pm3n: '夜间吸收更好',
  pm4a: '大米神经酰胺睡眠面膜', pm4b: '屏障晚霜', pm4n: '每周2–3次',

  tAdded: '已加入购物袋', tNoPts: '积分不足',
  tEarn: (p) => '+' + p + ' 积分已到账',
  tStreak: (p, d) => '+' + p + ' 积分 · 连续第 ' + d + ' 天！',
  tScanM: '+30 积分 — 每周扫描任务完成',
  tRedeem: (n) => n + ' — 将随下个订单寄出',
}
