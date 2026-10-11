/**
 * 면세점 판매가 장부 — 우리가 가격을 정할 때 보는 바깥 숫자.
 *
 * 이 앱은 롯데면세점 판매가와 같은 값에 팝니다. 그 약속은 **달러로** 한
 * 약속입니다. 면세점은 달러를 정가로 쓰고 원화는 그날 환율로 환산해서
 * 올림할 뿐이라, 같은 제품이 어제 20,892원이고 오늘 21,100원이어도 $15.6은
 * 그대로입니다. 그래서 여기 적는 것도 달러이고, 원화는 내가 숫자를 제대로
 * 읽었는지 검산하기 위해 같이 둡니다.
 *
 * ── 환율이 두 개인 이유 ─────────────────────────────────────────────────────
 *
 * DUTY_FREE_KRW_PER_USD  면세점 화면이 그날 쓴 환율. 출처를 기록할 뿐 우리는
 *                        쓰지 않습니다. 날마다 바뀝니다.
 * AUTHORING_KRW_PER_USD  우리 DB가 price_krw → price(USD)를 계산하는 환율.
 *                        `fx_rates`와 `FALLBACK_RATES`에 같은 값이 있고,
 *                        시세를 따라가라고 둔 값이 아닙니다 — 이 값이 고정이라야
 *                        우리가 매긴 원화가 면세점과 같은 달러로 떨어집니다.
 *
 * 그래서 새 제품을 등록할 때 하는 일은 하나입니다: 아래 표에서 달러를 찾아
 * `authoredKrw()`로 원화를 만들어 `price_krw`에 넣습니다. 그러면 트리거가
 * 달러를 되돌려 계산하고, 그 값이 면세점 달러와 센트까지 같습니다.
 */

import { FALLBACK_RATES } from './fx'

/** 우리 DB가 원화를 달러로 바꿀 때 쓰는 환율. `fx_rates`의 USD와 같아야 합니다. */
export const AUTHORING_KRW_PER_USD = FALLBACK_RATES.USD.krwPerUnit

/** 아래 아누아 표를 캡처한 화면이 쓰고 있던 환율. 16행 전부가 이 값으로 맞습니다. */
export const DUTY_FREE_KRW_PER_USD = 1339.2

export interface DutyFreeRow {
  /** 면세점 화면에 적힌 한글 제품명. */
  ko: string
  /** 면세점 판매가(USD). 이것이 정가이고, 우리 판매가입니다. */
  usd: number
  /** 같은 화면의 원화. `ceil(usd × DUTY_FREE_KRW_PER_USD)`로 검산됩니다. */
  krw: number
  /**
   * 캡처 화면의 글씨가 작아 한글명을 확신할 수 없는 행.
   *
   * 숫자는 16행 전부 산술로 검증됐지만 글자는 아닙니다. 해당 제품의 ZIP이
   * 오면 제조사 표기로 이름을 맞춘 뒤 이 표시를 지웁니다. 가격을 쓰는 데는
   * 지장이 없고, 엉뚱한 제품에 붙이지 않도록 경고하는 용도입니다.
   */
  unsureName?: true
  /** 우리 카탈로그에 등록된 제품이면 그 id. */
  productId?: string
}

/**
 * 아누아 면세점 브랜드관, 2026-10-11 캡처. 전 품목 40% 할인가 기준
 * (선크림 기획세트만 36%).
 *
 * 우리가 파는 건 지금 한 가지뿐이고, 나머지는 다음 제품이 올라올 때를 위한
 * 기록입니다.
 */
export const ANUA_DUTY_FREE: DutyFreeRow[] = [
  { ko: 'PDRN 히알루론산 수분 캡슐 미스트 100ml', usd: 13.8, krw: 18481 },
  { ko: 'PDRN 히알루론산 수분 캡슐 미스트 30ml', usd: 7.8, krw: 10446, unsureName: true },
  { ko: '어성초 딥 클렌징 폼', usd: 5.4, krw: 7232, unsureName: true },
  {
    ko: 'PDRN 히알루론산 캡슐 100 세럼 30ml',
    usd: 15.6,
    krw: 20892,
    productId: 'an-pdrn-ha-capsule100-serum-30',
  },
  {
    ko: '나이아신아마이드 10 TXA 4 세럼 30ml',
    usd: 12.6,
    krw: 16874,
    productId: 'an-niacinamide10-txa4-serum-30',
  },
  { ko: 'PDRN 히알루론산 수분크림 트리오 세트', usd: 25.8, krw: 34552, unsureName: true },
  { ko: '어성초 77 수딩 토너 250ml (리뉴얼)', usd: 10.2, krw: 13660 },
  { ko: '어성초 포어 컨트롤 클렌징 오일 200ml (리뉴얼)', usd: 9, krw: 12053 },
  { ko: 'PDRN 히알루론산 캡슐 100 세럼 50ml 리필 듀오 세트', usd: 42, krw: 56247 },
  { ko: 'PDRN 히알루론산 수분 클렌징 폼 150ml', usd: 6.6, krw: 8839 },
  { ko: 'PDRN 히알루론산 100 수분 크림 60ml', usd: 12.6, krw: 16874 },
  { ko: '어성초 77 B3 싱크 토너블 세럼 30ml', usd: 12.6, krw: 16874, unsureName: true },
  { ko: 'PDRN 100 히알루론산 패드 60매', usd: 9.6, krw: 12857 },
  { ko: '어성초 70 데일리 릴리프 로션 200ml', usd: 11.4, krw: 15267, unsureName: true },
  { ko: '선크림 기획세트 (36% 할인)', usd: 14.72, krw: 19714, unsureName: true },
  { ko: '커버 베이스 50ml', usd: 11.4, krw: 15267, unsureName: true },
]

/**
 * 면세점 달러 정가를 우리 `price_krw`로.
 *
 * 반올림인 이유: 트리거가 `round(price_krw / 환율, 2)`로 달러를 되돌리므로,
 * 가장 가까운 원이면 언제나 같은 달러로 돌아옵니다. 올림이든 반올림이든
 * 돌아오는 달러는 같아서 — 카탈로그에 두 방식이 섞여 있습니다 — 중요한 건
 * 규칙이 아니라 왕복이고, 그걸 테스트가 지킵니다.
 */
export function authoredKrw(usd: number, rate = AUTHORING_KRW_PER_USD): number {
  if (!Number.isFinite(usd) || usd <= 0 || !(rate > 0)) return 0
  return Math.round(usd * rate)
}

/**
 * `private.settle_price()`가 하는 계산. 원화가 어떤 달러로 청구될지.
 *
 * 0원이 1센트가 아니라 0으로 떨어지는 건 DB와 다릅니다 — DB는 활성 상품의
 * 0원을 CHECK로 막으므로 그 분기에 닿지 않습니다.
 */
export function settledUsd(krw: number, rate = AUTHORING_KRW_PER_USD): number {
  if (!Number.isFinite(krw) || krw <= 0 || !(rate > 0)) return 0
  return Math.round((krw / rate) * 100) / 100
}

/** 아누아 표에서 제품 id로 달러 정가 찾기. 없으면 null. */
export function dutyFreeUsd(productId: string): number | null {
  return ANUA_DUTY_FREE.find((r) => r.productId === productId)?.usd ?? null
}
