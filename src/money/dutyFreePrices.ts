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

/**
 * 아래 표들을 캡처한 화면이 쓰고 있던 환율.
 *
 * 아누아 16행과 달바 25행이 **전부** 이 값 하나로 맞습니다. 두 캡처는 다른
 * 날 다른 브랜드관에서 왔는데 환율이 같다는 건, 둘 다 롯데면세점이고 그 사이
 * 환율이 움직이지 않았다는 뜻입니다. 달바 캡처에는 푸터에 LOTTE DUTY FREE가
 * 찍혀 있어 출처가 직접 확인됩니다.
 */
export const DUTY_FREE_KRW_PER_USD = 1339.2

export interface DutyFreeRow {
  /** 면세점 화면에 적힌 한글 제품명. */
  ko: string
  /** 면세점 판매가(USD). 이것이 정가이고, 우리 판매가입니다. */
  usd: number
  /**
   * 같은 화면의 원화. `ceil(usd × DUTY_FREE_KRW_PER_USD)`로 검산됩니다.
   *
   * 캡처가 뭉개져 자릿수를 읽지 못한 행은 비워 둡니다. 산술로 만들어 넣으면
   * 검산 테스트가 제 답을 제가 채점하는 꼴이 되고, 틀린 달러를 잡아낼 수
   * 없게 됩니다. 읽지 못한 건 읽지 못한 대로 두는 편이 낫습니다.
   */
  krw?: number
  /**
   * 캡처 화면의 글씨가 작아 한글명을 확신할 수 없는 행.
   *
   * 숫자는 산술로 검증되지만 글자는 아닙니다. 해당 제품의 ZIP이 오면 제조사
   * 표기로 이름을 맞춘 뒤 이 표시를 지웁니다. 가격을 쓰는 데는 지장이 없고,
   * 엉뚱한 제품에 붙이지 않도록 경고하는 용도입니다.
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
  {
    ko: 'PDRN 히알루론산 수분 클렌징 폼 150ml',
    usd: 6.6,
    krw: 8839,
    productId: 'an-pdrn-ha-cleansing-foam-150',
  },
  { ko: 'PDRN 히알루론산 100 수분 크림 60ml', usd: 12.6, krw: 16874 },
  {
    // Read off the capture as "싱크 토너블". The maker's own page says 징크
    // (zinc) 트러블 — the screenshot was right about the price and wrong about
    // two words, which is exactly what `unsureName` was for.
    ko: '어성초 77 B3징크 트러블 세럼 30ml',
    usd: 12.6,
    krw: 16874,
    productId: 'an-heartleaf77-b3zinc-serum-30',
  },
  { ko: 'PDRN 100 히알루론산 패드 60매', usd: 9.6, krw: 12857 },
  { ko: '어성초 70 데일리 릴리프 로션 200ml', usd: 11.4, krw: 15267, unsureName: true },
  { ko: '선크림 기획세트 (36% 할인)', usd: 14.72, krw: 19714, unsureName: true },
  { ko: '커버 베이스 50ml', usd: 11.4, krw: 15267, unsureName: true },
]

/**
 * 달바(d'Alba) 롯데면세점 브랜드관, 2026-10-11 캡처. 35종 중 1페이지 24종과
 * 추천 상품에만 있던 1종.
 *
 * 캡처 해상도가 478px이라 한글명은 대부분 확신할 수 없습니다. 달러는 굵고
 * 크게 찍혀 읽을 수 있고, 원화로 전부 검산했습니다 — 한 행만 빼고.
 *
 * 아직 파는 제품이 없습니다. 제품이 올라올 때 쓰려고 적어둡니다.
 */
export const DALBA_DUTY_FREE: DutyFreeRow[] = [
  { ko: '화이트 트러플 퍼스트 스프레이 세럼 100ml', usd: 14.06, krw: 18830, unsureName: true },
  {
    // 캡처에서 "(퍼플)"로 읽은 게 맞았습니다. 제조사 표기도 같습니다.
    ko: '워터풀 톤업 선크림 (퍼플) 50ml',
    usd: 15.84,
    krw: 21213,
    productId: 'da-waterfull-toneup-sun-purple-50',
  },
  { ko: '워터풀 톤업 선크림 50ml', usd: 15.84, krw: 21213, unsureName: true },
  { ko: '[롯데단독] 비타 토닝 캡슐 세럼 나이아신아마이드 5퍼센트', usd: 20.9, krw: 27990, unsureName: true },
  { ko: '[롯데단독] 비타 토닝 캡슐 크림 나이아신아마이드 5퍼센트 55g', usd: 24.7, krw: 33079 },
  { ko: '[롯데단독] 비타 토닝 브라이트닝 스프레이 세럼 8퍼센트 70ml', usd: 15.25, krw: 20423, unsureName: true },
  { ko: '[롯데단독] 비타 토닝 세럼 토너 180ml', usd: 13.87, krw: 18575, unsureName: true },
  { ko: '화이트 트러플 비타딥 스프레이 세럼 100ml', usd: 14.06, krw: 18830, unsureName: true },
  { ko: '화이트 트러플 너리싱 트리트먼트 마스크 1box (5매입)', usd: 8.8, krw: 11785, unsureName: true },
  { ko: '클린 디톡시 리프레쉬 톤업 선크림 (그린) 50ml', usd: 15.84, krw: 21213, unsureName: true },
  { ko: '워터풀 에센스 선크림 50ml', usd: 12.32, krw: 16499 },
  { ko: '[롯데단독] 비타 토닝 마스크 세럼 앰 나이아신아마이드 5퍼센트', usd: 8.8, krw: 11785, unsureName: true },
  { ko: '워터풀 톤업 선크림 (베이지) 50ml', usd: 15.84, krw: 21213, unsureName: true },
  { ko: '워터풀 퍼펙트 선크림 50ml', usd: 12.32, krw: 16499, unsureName: true },
  {
    // 원화 자리가 뭉개져 가운데 숫자를 읽지 못했습니다. 38,302(= ceil(28.6 ×
    // 1339.2))로 보이지만 38,332로도 읽혀서, 지어내지 않고 비워 둡니다.
    ko: '화이트 트러플 더블 세럼 아이 크림 70g',
    usd: 28.6,
    unsureName: true,
  },
  { ko: '[롯데단독] 비타 토닝 글래스 링클 아이 크림 15ml', usd: 21.42, krw: 28686, unsureName: true },
  { ko: '워터풀 톤업 선크림 블루 50ml', usd: 16.06, krw: 21508 },
  { ko: '[롯데단독] 비타 토닝 세럼 로션 100ml', usd: 20.16, krw: 26999, unsureName: true },
  { ko: '글로우 핏 메이크 커버 쿠션 15g', usd: 20.48, krw: 27427, unsureName: true },
  { ko: '클린 디톡시 시카 카밍 마스크 5매 (SET) 25ml*5', usd: 8.8, krw: 11785, unsureName: true },
  { ko: '워터풀 에센스 선 미스트 50ml', usd: 12.76, krw: 17089 },
  { ko: '화이트 트러플 프리미엄 인텐시브 세럼 100ml', usd: 21, krw: 28124, unsureName: true },
  { ko: '[롯데단독] 비타 캡슐 안티에이징 선크림 50ml', usd: 15.84, krw: 21213, unsureName: true },
  { ko: '[롯데단독] 비타 트래블키트 4종 세트', usd: 8.84, krw: 11839 },
  // 그리드에는 없고 상단 추천 상품에만 있던 한 종.
  { ko: '워터풀 톤업 라이트 에센스 선 세럼 50ml', usd: 16.06, krw: 21508, unsureName: true },
]

/** 지금까지 적어둔 면세점 가격표 전부. */
export const DUTY_FREE_TABLES: Record<string, DutyFreeRow[]> = {
  ANUA: ANUA_DUTY_FREE,
  "d'Alba": DALBA_DUTY_FREE,
}

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

/** 적어둔 모든 가격표에서 제품 id로 달러 정가 찾기. 없으면 null. */
export function dutyFreeUsd(productId: string): number | null {
  for (const rows of Object.values(DUTY_FREE_TABLES)) {
    const hit = rows.find((r) => r.productId === productId)
    if (hit) return hit.usd
  }
  return null
}

/** 모든 가격표의 행을 한 줄로. 검산 테스트가 씁니다. */
export const allDutyFreeRows = (): DutyFreeRow[] => Object.values(DUTY_FREE_TABLES).flat()
