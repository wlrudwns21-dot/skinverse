import { describe, expect, it } from 'vitest'
import { SEED_CATALOG } from '../catalog/remote'
import {
  ANUA_DUTY_FREE,
  AUTHORING_KRW_PER_USD,
  CAPTURE_1019_KRW_PER_USD,
  CEPOLAB_DUTY_FREE,
  DALBA_DUTY_FREE,
  DUTY_FREE_KRW_PER_USD,
  DUTY_FREE_TABLES,
  SULWHASOO_DUTY_FREE,
  allDutyFreeRows,
  authoredKrw,
  dutyFreeUsd,
  settledUsd,
} from './dutyFreePrices'
import { FALLBACK_RATES } from './fx'

/**
 * 이 표는 화면 캡처를 사람이 옮겨 적은 것이라, 숫자 하나를 잘못 봤을 수
 * 있습니다. 그걸 잡는 게 첫 번째 테스트입니다.
 *
 * 면세점은 달러에 그날 환율을 곱하고 올림해서 원화를 씁니다. 그래서 두 숫자
 * 사이에는 지켜야 할 관계가 있고, 한 표의 모든 행이 **전부** 같은 환율 하나로
 * 맞는다는 건 우연으로 일어나지 않습니다. 한 자리라도 잘못 읽었으면 그 행만
 * 어긋납니다.
 */
describe('면세점 가격표', () => {
  it('달러와 원화가 표마다 자기 환율 하나로 전부 맞는다', () => {
    // 2026-10-11 캡처 둘은 같은 환율이고, 10-19 캡처 둘은 또 다른 같은
    // 환율입니다. 표가 자기 환율을 들고 있지 않으면 이 검산을 할 수 없습니다.
    for (const [brand, { krwPerUsd, rows }] of Object.entries(DUTY_FREE_TABLES)) {
      for (const r of rows) {
        if (r.krw === undefined) continue
        expect(Math.ceil(r.usd * krwPerUsd), `${brand} ${r.ko}`).toBe(r.krw)
      }
    }
  })

  it('정가가 적힌 행은 판매가보다 비싸다', () => {
    // 정가와 판매가를 거꾸로 옮겨 적는 건 눈으로는 안 보이고 화면에서는
    // 할인율이 사라지는 것으로만 드러납니다. 여기서 잡습니다.
    for (const r of allDutyFreeRows()) {
      if (r.listUsd === undefined) continue
      expect(r.listUsd, r.ko).toBeGreaterThan(r.usd)
    }
  })

  it('원화를 읽지 못한 행이 몇 개인지 못 박는다', () => {
    // 비워 두는 건 봐주는 게 아니라 기록입니다. 조용히 늘어나면 검산이
    // 통과해도 의미가 없어지므로, 어느 행인지 여기에 적어 둡니다.
    const unread = allDutyFreeRows().filter((r) => r.krw === undefined)
    expect(unread.map((r) => r.ko)).toEqual([
      '화이트 트러플 더블 세럼 아이 크림 70g',
      // 세포랩 캡처가 그리드 아래쪽에서 잘린 네 행.
      '바이오제닉 에센스 90% (100ml)',
      '바이오제닉 에센스 하이드레이션 90% (100ml)',
      '바이오제닉 에센스 하이드레이션 90% (155ml)',
      '바이오제닉 에센스 블랜디드 포뮬라 50% (30ml)',
    ])
  })

  it('표마다 행 수가 맞고, 같은 제품이 두 번 적혀 있지 않다', () => {
    expect(ANUA_DUTY_FREE).toHaveLength(16)
    expect(DALBA_DUTY_FREE).toHaveLength(25)
    expect(SULWHASOO_DUTY_FREE).toHaveLength(15)
    expect(CEPOLAB_DUTY_FREE).toHaveLength(15)
    for (const [brand, { rows }] of Object.entries(DUTY_FREE_TABLES)) {
      expect(new Set(rows.map((r) => r.ko)).size, brand).toBe(rows.length)
    }
  })

  it('10-19 캡처 두 표는 같은 환율을 쓴다', () => {
    // 같은 날 같은 사이트에서 받았으니 같아야 하고, 갈라지면 둘 중 하나를
    // 잘못 읽은 것입니다.
    expect(DUTY_FREE_TABLES['설화수'].krwPerUsd).toBe(CAPTURE_1019_KRW_PER_USD)
    expect(DUTY_FREE_TABLES['세포랩'].krwPerUsd).toBe(CAPTURE_1019_KRW_PER_USD)
    expect(CAPTURE_1019_KRW_PER_USD).not.toBe(DUTY_FREE_KRW_PER_USD)
  })

  it('가격은 양수여야 한다', () => {
    for (const r of allDutyFreeRows()) expect(r.usd, r.ko).toBeGreaterThan(0)
  })

  it('제품 id는 실제 카탈로그 id여야 한다', () => {
    // 오타 난 id는 조용히 null을 돌려주고, 그러면 가격이 붙지 않은 채
    // 등록됩니다. 적어둔 id는 전부 쓸 수 있는 id여야 합니다.
    const known = new Set(SEED_CATALOG.products.map((p) => p.id))
    // 아누아·달바는 시드에 없고 DB에만 있으므로, 시드 제품(에스트라)에 다른
    // 브랜드 가격이 붙는 일만 막으면 됩니다.
    for (const r of allDutyFreeRows()) {
      if (r.productId) expect(known.has(r.productId), r.productId).toBe(false)
    }
    // 한 id가 두 표에 적히면 어느 가격이 이기는지가 순서에 달리게 됩니다.
    const ids = allDutyFreeRows().flatMap((r) => (r.productId ? [r.productId] : []))
    expect(new Set(ids).size).toBe(ids.length)

    expect(dutyFreeUsd('an-pdrn-ha-capsule100-serum-30')).toBe(15.6)
    expect(dutyFreeUsd('an-pdrn-ha-cleansing-foam-150')).toBe(6.6)
    expect(dutyFreeUsd('없는-제품')).toBeNull()
  })
})

/**
 * 면세점 달러를 우리 원화로 옮기는 규칙.
 *
 * 면세점 원화를 그대로 베끼면 안 되는 이유가 여기 있습니다: 그 원화는
 * 1,339.2원 환율로 만들어졌고 우리 DB는 1,359.6원으로 되돌립니다. 20,892원을
 * 그대로 넣으면 고객에게 $15.37이 찍힙니다 — 면세점가와 같다는 말이 거짓이
 * 됩니다. 달러를 맞추는 쪽만 그 약속을 지킵니다.
 */
describe('면세점 달러 → 우리 원화', () => {
  it('왕복해서 같은 달러로 돌아온다', () => {
    // 두 표의 41행 전부. 센트 둘째 자리까지 있는 $14.06이나 $21.42 같은
    // 값에서 어긋나기 쉬운 부분입니다.
    for (const r of allDutyFreeRows()) {
      expect(settledUsd(authoredKrw(r.usd)), r.ko).toBe(r.usd)
    }
  })

  it('면세점 원화를 그대로 쓰면 달러가 어긋난다 — 그래서 쓰지 않는다', () => {
    const serum = ANUA_DUTY_FREE.find((r) => r.usd === 15.6)!
    expect(settledUsd(serum.krw!)).toBe(15.37)
    expect(settledUsd(authoredKrw(serum.usd))).toBe(15.6)
    expect(authoredKrw(15.6)).toBe(21210)
  })

  it('값이 아닌 입력에는 가격을 만들어내지 않는다', () => {
    // 0을 돌려주면 `products_priced_when_active`가 막습니다. 아무 숫자나
    // 지어내는 것보다 등록이 거절되는 편이 낫습니다.
    expect(authoredKrw(0)).toBe(0)
    expect(authoredKrw(-5)).toBe(0)
    expect(authoredKrw(Number.NaN)).toBe(0)
    expect(settledUsd(0)).toBe(0)
    expect(settledUsd(10, 0)).toBe(0)
  })

  it('지금 팔고 있는 제품의 원화가 전부 제 달러로 돌아온다', () => {
    // 규칙이 카탈로그와 다른 규칙이면 새 제품만 어긋난 가격으로 들어옵니다.
    for (const p of SEED_CATALOG.products) {
      expect(settledUsd(p.priceKrw), p.id).toBe(p.price)
    }
  })

  it('계산에 쓰는 환율은 DB가 쓰는 환율이다', () => {
    expect(AUTHORING_KRW_PER_USD).toBe(FALLBACK_RATES.USD.krwPerUnit)
    expect(AUTHORING_KRW_PER_USD).not.toBe(DUTY_FREE_KRW_PER_USD)
  })
})
