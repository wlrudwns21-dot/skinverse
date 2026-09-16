import type { Strings } from './types'

export const ko: Strings = {
  myPage: 'MY', bag: '가방', match: '매치',
  kicker: 'AI 피부 분석', heroT: '40초 만에 읽어내는 당신의 피부.',
  heroSub: '6개 항목 진단, 맞춤 K-뷰티 루틴, 서울에서 전 세계 배송.',
  startBtn: '분석 시작', todayIn: '오늘의 날씨 ·', skinScore: '피부 점수', skinScoreU: '피부 점수',
  viewReport: '전체 리포트 보기',
  noScan: '아직 분석 기록이 없어요. 첫 스캔을 하면 맞춤 제품과 날씨 루틴이 열립니다.',
  matched: '맞춤 추천', allProducts: '전체 제품', todayMissions: '오늘의 미션', earnP: '포인트 받기',

  scanTitle: 'AI 피부 분석', scanSub: '거주지 기후까지 반영하는 6개 항목 진단.',
  selfiePh: '셀피를 끌어다 놓기 (선택)', tip1: '밝고 고른 자연광에서', tip2: '메이크업 없는 맨 피부로',
  tip3: '얼굴 정면, 머리는 뒤로', beginScan: '스캔 시작', demoNote: '데모 모드 — 사진 없이도 진행됩니다',

  s1: '얼굴 영역 매핑 중', s2: '수분·결 측정 중', s3: '120만 피부 프로필 비교 중',
  s4: '맞춤 루틴 생성 중', insight: 'AI 인사이트', matchedBtn: '맞춤 제품 보기',
  routineBtn: '루틴 만들기', rescan: '다시 분석하기',
  low: '낮음', fair: '보통', good: '좋음',

  shopTitle: '쇼핑', shopSub: '분석 결과 기반 추천 · 서울에서 발송',
  addBag: '담기', buyNow: '바로구매', whyT: '추천 이유', ingT: '주요 성분',

  cartTitle: '장바구니', cartEmpty: '장바구니가 비어 있어요', browse: '맞춤 제품 둘러보기',
  subtotal: '소계', intlShip: '국제배송 (서울 발송)', earnPreview: '적립 예정 포인트',
  checkout: '결제하기',

  shipTitle: '배송 정보', fullName: '이름', country: '국가 / 지역', address: '주소',
  shipMethod: '배송 방법', dhlDesc: '영업일 3–5일 · 추적 · 통관 대행',
  emsDesc: '영업일 7–14일 · 추적', toPayment: '결제 단계로',

  payTitle: '결제', shipFee: '배송비', ptsDisc: '포인트 할인', total: '총액',
  usePts: (p, d) => p + ' P 사용 → ' + d + ' 절약',
  ptsNote: '포인트 사용 (주문액의 최대 30%)', payWith: '결제:',
  testNote: '실제 결제되지 않는 테스트입니다', loggedInAs: '로그인 계정', payNow: '지금 결제',
  cancel: '취소', processing: '결제 처리 중…',

  confirmed: '주문 완료', confirmedSub: '서울에서 발송됩니다', orderNo: '주문번호',
  paidVia: 'PayPal 결제금액', delivery: '배송 예정', ptsEarned: '적립 완료',
  contShop: '쇼핑 계속하기', viewMy: '마이페이지에서 보기',

  routineTitle: '날씨 맞춤 루틴', routineSub: '분석 결과 + 현지 날씨 반영',
  temp: '기온', humidity: '습도', adjust: '오늘의 조정', morning: '아침',
  evening: '저녁', completeCta: '오늘 루틴 완료하고 포인트 받기',

  glowPts: '글로우 포인트', daily: '오늘의 미션', weekly: '주간 미션', redeem: '포인트 교환',
  redeemed: '교환 완료 ✓', toLv: (p, n) => n + '까지 ' + p + ' P', maxLv: '최고 레벨',
  streakLine: (d) => '연속 ' + d + '일',

  skinHistory: '피부 기록', orders: '주문 내역', inTransit: '배송 중', noOrders: '아직 주문이 없어요',
  settings: '설정', language: '언어', currency: '통화', shipRegion: '배송 지역',
  reminders: '루틴 알림', firstScan: '첫 분석', latest: '최신', scanN: '스캔',

  tabs: ['홈', '분석', '쇼핑', '루틴', '리워드'],

  hintHumid: '습도 높음 — 오늘은 젤 타입 추천', hintDry: '건조한 공기 — 오일 추가 추천',
  hintMild: '무난한 날 — 기본 루틴',
  advHumid: (h) => '습도가 ' + h + '%예요 — 오늘은 젤 제형으로 바꾸고 무거운 크림은 생략하세요. ',
  advDry: (h) => '공기가 건조해요(' + h + '%) — 수분크림 위에 페이셜 오일을 덧바르고 밤에는 가습기를 켜세요. ',
  advMild: '쾌적한 습도 — 평소 레이어링을 유지하세요. ',
  advUvHi: (u) => 'UV ' + u + ' 매우 높음: SPF50+, 외출 시 3시간마다 재도포.',
  advUvMid: (u) => 'UV ' + u + ': 외출 전 SPF50+ 필수.',
  advUvLo: 'UV 보통 — 아침 선크림 한 번이면 충분해요.',

  st1: '약산성 젤 클렌저', st1n: '미온수로 60초', st2h: '수분 미스트 토너',
  st2d: '에센스 토너 2회 레이어링', st2n: '문지르지 말고 두드리기', target: '집중 케어:',
  lowestNote: '최저 점수 —', st4h: '오일프리 젤 수분크림', st4d: '세라마이드 크림',
  st4hn: (h) => '습도 ' + h + '%에 맞춘 가벼운 제형', st4dn: '수분을 밀봉',
  spfRe: ' — 오후 2시 재도포', uvIn: (u, c) => c + ' UV 지수 ' + u,

  pm1: '이중 세안 (밤 → 젤)', pm1h: '땀·피지 많은 날', pm1n: '선크림까지 완전 제거',
  pm2: '트리트먼트 에센스', pm2n: '액티브 흡수 준비', pm3n: '저녁 흡수율이 더 높아요',
  pm4a: '라이스 세라마이드 슬리핑 마스크', pm4b: '배리어 나이트 크림', pm4n: '주 2–3회',

  tAdded: '장바구니에 담았어요', tNoPts: '포인트가 부족해요',
  tSoldOut: '이 리워드는 모두 소진되었어요',
  tOrderFailed: '주문을 완료하지 못했어요. 장바구니를 확인해주세요',
  tLeaveRequested: '탈퇴 요청이 접수되었어요. 확인 후 처리해드립니다',
  tLeaveCancelled: '탈퇴 요청을 취소했어요',
  tStockShort: (name, left) =>
    left > 0 ? `${name} 재고가 ${left}개 남았어요` : `${name}이(가) 품절됐어요`,
  tEarn: (p) => '+' + p + ' P 적립',
  tStreak: (p, d) => '+' + p + ' P · 연속 ' + d + '일 달성!',
  tScanM: '+30 P — 주간 스캔 미션 완료',
  tRedeem: (n) => n + ' — 다음 주문에 동봉',
}
