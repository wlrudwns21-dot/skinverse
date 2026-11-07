import type { Strings } from './types'

/**
 * Japanese.
 *
 * Translated from the Korean, which is where this copy is written and argued
 * over; the English, Chinese and Thai were made the same way. Plain です・ます
 * throughout, and no adjective the Korean does not have — this shop's whole
 * manner is to say what was measured and let the reader decide, and a
 * translation that brightens the tone is a translation that changes the claim.
 *
 * `dust` is 大気汚染 rather than PM2.5, because `airBand` takes the worse of the
 * PM10 and PM2.5 readings. Labelling the column PM2.5 would name one of the two
 * and then sometimes show the other one's band.
 */
export const ja: Strings = {
  myPage: 'MY', bag: 'バッグ', match: 'マッチ',
  provisionalPrice: '仮の価格',
  provisionalNote: 'この商品はまだ免税店での販売価格を確認できていないため、当店で仮に定めた価格を表示しています。確認でき次第、訂正します。',
  kicker: 'AI 肌診断', heroT: '40秒で読み取る、あなたの肌。',
  heroSub: '6項目の診断、あなた向けの K-ビューティー ルーティン、ソウルから世界へ配送。',
  startBtn: '診断をはじめる', todayIn: '今日の天気 ·', skinScore: '肌スコア', skinScoreU: '肌スコア',
  viewReport: 'レポート全体を見る',
  noScan: 'まだ診断の記録がありません。最初のスキャンで、あなた向けの商品と天気に合わせたルーティンが開きます。',
  matched: 'おすすめ', allProducts: 'すべての商品', todayMissions: '今日のミッション', earnP: 'ポイントを受け取る',

  scanTitle: 'AI 肌診断', scanSub: 'お住まいの地域の気候まで反映する6項目の診断。',
  selfiePh: 'セルフィーをドラッグ＆ドロップ（任意）', tip1: '明るく均一な自然光で', tip2: 'メイクを落とした素肌で',
  tip3: '顔は正面、髪は後ろへ', beginScan: 'スキャン開始', demoNote: 'デモモード — 写真がなくても進みます',

  s1: '顔の領域をマッピング中', s2: '水分・キメを測定中', s3: '120万件の肌プロフィールと照合中',
  s4: 'ルーティンを作成中', insight: 'AI インサイト', matchedBtn: 'おすすめ商品を見る',
  routineBtn: 'ルーティンを作る', rescan: 'もう一度診断する',
  low: '低い', fair: '普通', good: '良い',

  shopTitle: 'ショップ', shopSub: '診断結果にもとづくおすすめ · ソウルから発送',
  addBag: 'カートに入れる', buyNow: 'すぐ購入', whyT: 'おすすめの理由', ingT: '主な成分',

  cartTitle: 'カート', cartEmpty: 'カートは空です', browse: 'おすすめ商品を見る',
  subtotal: '小計', intlShip: '国際配送（ソウル発）', earnPreview: '獲得予定ポイント',
  checkout: 'お会計へ',

  shipTitle: 'お届け先', fullName: 'お名前', country: '国 / 地域', address: '住所',
  shipMethod: '配送方法', dhlDesc: '営業日 3〜5日 · 追跡あり · 通関代行',
  emsDesc: '営業日 7〜14日 · 追跡あり', toPayment: 'お支払いへ',

  payTitle: 'お支払い', shipFee: '送料', ptsDisc: 'ポイント割引', total: '合計',
  usePts: (p, d) => p + ' P 利用 → ' + d + ' 割引',
  ptsNote: 'ポイント利用（ご注文金額の最大30%）', payWith: 'お支払い方法:',
  testNote: '実際には決済されないテストです', loggedInAs: 'ログイン中のアカウント', payNow: '今すぐ支払う',
  cancel: 'キャンセル', processing: '決済処理中…',

  confirmed: 'ご注文完了', confirmedSub: 'ソウルから発送します', orderNo: '注文番号',
  paidVia: 'PayPal お支払い金額', delivery: 'お届け予定', ptsEarned: '付与完了',
  contShop: '買い物を続ける', viewMy: 'マイページで見る',

  routineTitle: '天気に合わせたルーティン', routineSub: '診断結果 + 現地の天気を反映',
  temp: '気温', humidity: '湿度', adjust: '今日の調整', morning: '朝',
  evening: '夜', completeCta: '今日のルーティンを完了してポイントを受け取る',

  glowPts: 'グロウポイント', daily: '今日のミッション', weekly: '週間ミッション', redeem: 'ポイント交換',
  redeemed: '交換済み ✓', toLv: (p, n) => n + 'まで ' + p + ' P', maxLv: '最高レベル',
  streakLine: (d) => '連続 ' + d + '日',

  skinHistory: '肌の記録', orders: '注文履歴', inTransit: '配送中', noOrders: 'まだご注文がありません',
  orderState: { refunded: '返金完了', partly_refunded: '一部返金', reversed: '決済取り消し（異議申立）', payment_failed: '決済失敗', cancelled: '注文キャンセル' },
  billedIn: (amount) => `実際のお支払いは ${amount}（USD）で請求されます`,
  dust: '大気汚染', airBand: { good: '良い', moderate: '普通', bad: '悪い', veryBad: '非常に悪い' },
  dustAdvice: (b) => `大気汚染 ${b} — 夜はダブル洗顔で残った粒子をしっかり落とし、抗酸化アイテムを足してください。`,
  showAll: (n) => `記録をあと ${n} 件見る`, showLess: '閉じる',
  orderStatus: { pending: '支払い待ち', paid: '支払い完了', preparing: '発送準備中', shipped: '発送済み', delivered: '配達完了', cancelled: 'キャンセル', partly_refunded: '一部返金', refunded: '返金完了', reversed: '決済取り消し', payment_failed: '決済失敗' },
  refundAsked: '返金のご依頼を受け付けました', refundWithdrawn: '返金のご依頼を取り消しました',
  refundAsk: '返金を依頼する', refundPending: '返金のご依頼を確認中です', refundDeclined: '返金はお受けできませんでした',
  refundWithdraw: '依頼を取り消す', refundReason: '返金の理由をお聞かせください', refundSend: '依頼を送る',
  refundNote: 'ご依頼いただくと担当者が確認のうえ対応します。承認されると、お支払いに使われた方法へ返金されます。',
  refundRefused: { not_signed_in: 'ログインが必要です', no_such_order: 'ご注文が見つかりません', not_paid: 'まだお支払いが完了していないご注文です', already_settled: 'すでに処理が済んだご注文です', unavailable: '時間をおいてもう一度お試しください' },
  tryAgain: '時間をおいてもう一度お試しください', refunded: '返金', ordersEmpty: 'まだご注文がありません',
  settings: '設定', language: '言語', currency: '通貨', shipRegion: '配送地域',
  reminders: 'ルーティンの通知', firstScan: '最初の診断', latest: '最新', scanN: 'スキャン',

  tabs: ['ホーム', '診断', 'ショップ', 'ルーティン', 'リワード'],

  hintHumid: '湿度が高めです — 今日はジェルタイプがおすすめ', hintDry: '乾いた空気です — オイルを足すのがおすすめ',
  hintMild: '穏やかな一日 — いつものルーティンで',
  advHumid: (h) => '湿度が ' + h + '% です — 今日はジェル質感に替えて、重いクリームは省いてください。 ',
  advDry: (h) => '空気が乾いています（' + h + '%） — 保湿クリームの上にフェイスオイルを重ね、夜は加湿器をつけてください。 ',
  advMild: '過ごしやすい湿度です — いつもの重ね方を続けてください。 ',
  advUvHi: (u) => 'UV ' + u + ' 非常に高い: SPF50+、外出時は3時間ごとに塗り直しを。',
  advUvMid: (u) => 'UV ' + u + ': 外出前に SPF50+ は欠かせません。',
  advUvLo: 'UV は普通 — 朝の日焼け止め1回で十分です。',

  st1: '弱酸性ジェルクレンザー', st1n: 'ぬるま湯で60秒', st2h: '水分ミストトナー',
  st2d: 'エッセンストナーを2回重ねづけ', st2n: 'こすらず、押さえるように', target: '集中ケア:',
  lowestNote: '最も低いスコア —', st4h: 'オイルフリーのジェル保湿クリーム', st4d: 'セラミドクリーム',
  st4hn: (h) => '湿度 ' + h + '% に合わせた軽い質感', st4dn: '水分を閉じ込める',
  spfRe: ' — 午後2時に塗り直し', uvIn: (u, c) => c + ' UV 指数 ' + u,

  pm1: 'ダブル洗顔（バーム → ジェル）', pm1h: '汗・皮脂の多い日に', pm1n: '日焼け止めまで完全に落とす',
  pm2: 'トリートメントエッセンス', pm2n: '有効成分を受け入れる準備', pm3n: '夜のほうが浸透しやすいです',
  pm4a: 'ライスセラミド スリーピングマスク', pm4b: 'バリア ナイトクリーム', pm4n: '週2〜3回',

  tAdded: 'カートに入れました', tNoPts: 'ポイントが足りません',
  tSoldOut: 'このリワードは品切れです',
  tOrderFailed: 'ご注文を完了できませんでした。カートをご確認ください',
  tPayFailed: 'お支払いを完了できませんでした。もう一度お試しください',
  tPayCancelled: 'お支払いをキャンセルしました。カートはそのままです',
  tPayUnsure: 'お支払いの結果を確認中です。注文履歴からもう一度ご確認ください',
  tLeaveRequested: '退会のご依頼を受け付けました。確認のうえ対応します',
  tLeaveCancelled: '退会のご依頼を取り消しました',
  tStockShort: (name, left) =>
    left > 0 ? `${name} の在庫があと ${left} 点です` : `${name} は売り切れです`,
  tEarn: (p) => '+' + p + ' P 付与',
  tStreak: (p, d) => '+' + p + ' P · 連続 ' + d + '日 達成!',
  tScanM: '+30 P — 週間スキャンミッション達成',
  tRedeem: (n) => n + ' — 次回のご注文に同梱',
}
