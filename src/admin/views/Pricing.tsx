import { useState } from 'react'
import { marginFromPrice, priceFromMargin } from '../../catalog/remote'
import type { NewProduct } from '../../catalog/remote'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const won = (n: number) => '₩' + Math.round(n).toLocaleString('en-US')

/**
 * What a product costs us, what we sell it for, and what a currency is worth.
 *
 * These three sit on one screen because they are one decision. The margin
 * decides the won price, the won price and the USD rate decide what PayPal
 * charges, and moving the rate moves every price in the shop at once — which
 * is why the rate editor shows what it will do before it does it.
 */

/** One product's cost, margin and shelf price, edited together. */
function PriceRow({ id }: { id: string }) {
  const admin = useAdmin()
  const product = admin.prodList.find((p) => p.id === id)
  const saved = admin.costOf(id)

  const [cost, setCost] = useState(String(saved?.costKrw ?? 0))
  const [margin, setMargin] = useState(String(saved?.marginPct ?? 0))
  const [price, setPrice] = useState(String(product?.priceKrw ?? 0))
  const [days, setDays] = useState(String(product?.useDays ?? 60))
  const [open, setOpen] = useState(false)

  if (!product) return null

  const costN = Number(cost) || 0
  const marginN = Number(margin) || 0
  const priceN = Number(price) || 0

  /*
   * Typing a margin sets the price; typing a price is allowed to disagree.
   *
   * An operator who rounds ₩39,200 up to a nicer ₩39,000 has not changed their
   * mind about the margin — they have accepted a slightly different one, and
   * the screen says which rather than going on claiming the number they typed.
   */
  const applyMargin = (value: string) => {
    setMargin(value)
    const next = priceFromMargin(costN, Number(value) || 0)
    if (next > 0) setPrice(String(next))
  }
  const applyCost = (value: string) => {
    setCost(value)
    const next = priceFromMargin(Number(value) || 0, marginN)
    if (next > 0) setPrice(String(next))
  }

  const realMargin = costN > 0 ? marginFromPrice(costN, priceN) : 0
  const profit = priceN - costN
  const drifted = costN > 0 && Math.abs(realMargin - marginN) > 0.05
  const usdPrice = admin.usdRate > 0 ? priceN / admin.usdRate : 0

  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:12px 14px')}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={s('cursor:pointer;display:flex;gap:12px;align-items:center')}
      >
        <div style={s(`width:40px;height:40px;border-radius:9px;background:${product.grad};flex-shrink:0`)} />
        <div style={s('flex:1;min-width:0')}>
          <div style={s('font-size:10px;color:#8A7D6C;letter-spacing:0.1em')}>{product.brand}</div>
          <div style={s('font-size:13.5px;font-weight:600')}>{product.name}</div>
        </div>
        <div style={s('text-align:right;flex-shrink:0')}>
          <div style={s('font-size:13.5px;font-weight:700')}>{won(product.priceKrw)}</div>
          <div style={s('font-size:11px;color:#8A7D6C')}>${product.price}</div>
        </div>
      </div>

      {open && (
        <div style={s('margin-top:12px;border-top:1px solid #F1ECE2;padding-top:12px')}>
          <div style={s('display:flex;gap:10px;flex-wrap:wrap')}>
            <label style={s('flex:1;min-width:110px')}>
              <div style={s('font-size:11px;color:#8A7D6C;font-weight:700')}>원가 (원)</div>
              <input
                value={cost}
                onChange={(e) => applyCost(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:13px;margin-top:4px;outline:none')}
              />
            </label>
            <label style={s('flex:1;min-width:90px')}>
              <div style={s('font-size:11px;color:#8A7D6C;font-weight:700')}>마진 (%)</div>
              <input
                value={margin}
                onChange={(e) => applyMargin(e.target.value.replace(/[^0-9.-]/g, ''))}
                inputMode="decimal"
                style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:13px;margin-top:4px;outline:none')}
              />
            </label>
            <label style={s('flex:1;min-width:110px')}>
              <div style={s('font-size:11px;color:#8A7D6C;font-weight:700')}>판매가 (원)</div>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:13px;margin-top:4px;outline:none;font-weight:700')}
              />
            </label>
            <label style={s('flex:1;min-width:110px')}>
              <div style={s('font-size:11px;color:#8A7D6C;font-weight:700')}>사용 기간 (일)</div>
              <input
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                style={s('width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:13px;margin-top:4px;outline:none')}
              />
            </label>
          </div>

          {/* Only affects when the shop suggests buying it again — nothing to
              do with price, stock or what anybody is charged. */}
          <div style={s('font-size:11px;color:#A2957F;line-height:1.6;margin-top:6px')}>
            한 개를 다 쓰는 데 걸리는 대략적인 기간입니다. 이 기간의 70%가 지나면
            추천에서 "다 쓰실 때가 됐어요"로 다시 올라옵니다.
          </div>

          <div style={s('background:#F8F5EF;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12px;color:#4A4234;line-height:1.7')}>
            <div>
              개당 이익 <b>{won(profit)}</b>
              {costN > 0 && <> · 실제 마진 <b>{realMargin.toFixed(1)}%</b></>}
            </div>
            <div style={s('color:#8A7D6C')}>
              고객 결제 금액 <b>${usdPrice.toFixed(2)}</b> (환율 {won(admin.usdRate)}/$ 기준)
            </div>
            {/* Said out loud rather than silently corrected: the operator chose
                the round number and should know what it costs them. */}
            {drifted && (
              <div style={s('color:#B4622F')}>
                판매가를 직접 고치셔서 마진이 {marginN}% → {realMargin.toFixed(1)}%로 바뀝니다.
              </div>
            )}
          </div>

          <div
            onClick={() => void admin.savePricing(id, costN, realMargin, priceN, Number(days) || 60)}
            style={s(
              'margin-top:10px;border-radius:999px;padding:10px;text-align:center;font-size:12.5px;font-weight:700;' +
                (priceN > 0
                  ? 'cursor:pointer;background:#221C15;color:#F3E9D6'
                  : 'background:#EFE9DD;color:#B0A490'),
            )}
          >
            저장
          </div>
          {priceN <= 0 && (
            <div style={s('font-size:11px;color:#A64B32;text-align:center;margin-top:5px')}>
              판매 중인 상품은 판매가가 0원일 수 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RateRow({ code }: { code: string }) {
  const admin = useAdmin()
  const rate = admin.rates.find((r) => r.code === code)
  const [value, setValue] = useState(String(rate?.krwPerUnit ?? 0))
  if (!rate) return null

  const next = Number(value) || 0
  const changed = next > 0 && next !== rate.krwPerUnit
  const isUsd = code === 'USD'

  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap')}>
      <div style={s('flex:1;min-width:120px')}>
        <div style={s('font-size:13px;font-weight:700')}>
          {rate.symbol} {rate.code}
          {isUsd && <span style={s('font-size:10.5px;color:#B4622F;margin-left:6px')}>결제 통화</span>}
        </div>
        <div style={s('font-size:11px;color:#8A7D6C')}>{rate.label}</div>
      </div>

      <div style={s('display:flex;align-items:center;gap:6px')}>
        <span style={s('font-size:11.5px;color:#8A7D6C')}>1 {code} =</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
          inputMode="decimal"
          disabled={code === 'KRW'}
          style={s('width:100px;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:13px;outline:none;text-align:right')}
        />
        <span style={s('font-size:11.5px;color:#8A7D6C')}>원</span>
      </div>

      {changed && code !== 'KRW' && (
        <div
          onClick={() => void admin.saveRate(code, next)}
          style={s('cursor:pointer;border-radius:999px;padding:8px 16px;font-size:12px;font-weight:700;background:#221C15;color:#F3E9D6')}
        >
          저장
        </div>
      )}
    </div>
  )
}

const TAGS = ['Hydration', 'Soothing', 'Pore', 'Brightening', 'SPF']
const METRICS = [
  ['hydration', '수분'], ['elasticity', '탄력'], ['pores', '모공'],
  ['pigmentation', '색소침착'], ['wrinkles', '주름'], ['sensitivity', '민감도'],
] as const
/** Swatches, so an operator picks a look rather than typing CSS. */
const GRADIENTS = [
  'linear-gradient(150deg,#DDEAE3,#8FBCA6)',
  'linear-gradient(150deg,#E7EBDD,#A9B98A)',
  'linear-gradient(150deg,#F4E8D7,#DBB27A)',
  'linear-gradient(150deg,#F0EBE1,#C9BA9B)',
  'linear-gradient(150deg,#E8E2EF,#B0A0C4)',
  'linear-gradient(150deg,#F3E2E2,#D49A9A)',
]

const field = 'width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:9px;padding:8px 10px;font-size:13px;margin-top:4px;outline:none'
const label = 'font-size:11px;color:#8A7D6C;font-weight:700'

/**
 * Registering a new product.
 *
 * Everything here except the price is copy an operator can fix later; the
 * price is the one field that decides what a customer is charged, so it is
 * derived from cost and margin exactly as it is for an existing product. The
 * row is created inactive — see `createProduct` for why.
 */
function NewProductForm() {
  const admin = useAdmin()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState<NewProduct>({
    brand: '', name: '', kind: '', ml: '', tag: 'Hydration', metric: 'hydration',
    gradient: GRADIENTS[0], ingredients: '', priceKrw: 0, stock: 0,
  })
  const [cost, setCost] = useState('')
  const [margin, setMargin] = useState('40')

  const set = <K extends keyof NewProduct>(k: K, v: NewProduct[K]) =>
    setF((prev) => ({ ...prev, [k]: v }))

  const costN = Number(cost) || 0
  const marginN = Number(margin) || 0
  const suggested = priceFromMargin(costN, marginN)
  const priceN = f.priceKrw || suggested
  const ready = f.brand.trim() && f.name.trim() && priceN > 0

  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    await admin.addProduct({ ...f, priceKrw: priceN }, costN, costN > 0 ? marginFromPrice(costN, priceN) : 0)
    setBusy(false)
    setOpen(false)
    setF({
      brand: '', name: '', kind: '', ml: '', tag: 'Hydration', metric: 'hydration',
      gradient: GRADIENTS[0], ingredients: '', priceKrw: 0, stock: 0,
    })
    setCost('')
  }

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={s('cursor:pointer;border:1px dashed #D3C9B7;border-radius:12px;padding:14px;text-align:center;font-size:13px;font-weight:700;color:#8A7D6C;margin-bottom:10px')}
      >
        + 새 상품 등록
      </div>
    )
  }

  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px;margin-bottom:10px')}>
      <div style={s('font-size:14px;font-weight:700')}>새 상품 등록</div>

      <div style={s('display:flex;gap:10px;flex-wrap:wrap;margin-top:10px')}>
        <label style={s('flex:1;min-width:130px')}>
          <div style={s(label)}>브랜드 *</div>
          <input value={f.brand} onChange={(e) => set('brand', e.target.value)} style={s(field)} />
        </label>
        <label style={s('flex:2;min-width:180px')}>
          <div style={s(label)}>상품명 *</div>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} style={s(field)} />
        </label>
      </div>

      <div style={s('display:flex;gap:10px;flex-wrap:wrap;margin-top:8px')}>
        <label style={s('flex:1;min-width:110px')}>
          <div style={s(label)}>종류</div>
          <input value={f.kind} onChange={(e) => set('kind', e.target.value)} placeholder="Serum" style={s(field)} />
        </label>
        <label style={s('flex:1;min-width:90px')}>
          <div style={s(label)}>용량</div>
          <input value={f.ml} onChange={(e) => set('ml', e.target.value)} placeholder="50ml" style={s(field)} />
        </label>
        <label style={s('flex:1;min-width:110px')}>
          <div style={s(label)}>카테고리</div>
          <select value={f.tag} onChange={(e) => set('tag', e.target.value)} style={s(field)}>
            {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label style={s('flex:1;min-width:110px')}>
          <div style={s(label)}>추천 지표</div>
          <select value={f.metric} onChange={(e) => set('metric', e.target.value)} style={s(field)}>
            {METRICS.map(([k, ko]) => <option key={k} value={k}>{ko}</option>)}
          </select>
        </label>
      </div>

      <div style={s('margin-top:8px')}>
        <div style={s(label)}>대표 색상</div>
        <div style={s('display:flex;gap:7px;margin-top:5px;flex-wrap:wrap')}>
          {GRADIENTS.map((g) => (
            <div
              key={g}
              onClick={() => set('gradient', g)}
              style={s(`cursor:pointer;width:38px;height:38px;border-radius:9px;background:${g};` +
                (f.gradient === g ? 'outline:2px solid #221C15;outline-offset:2px' : ''))}
            />
          ))}
        </div>
      </div>

      <label style={s('display:block;margin-top:8px')}>
        <div style={s(label)}>주요 성분</div>
        <input value={f.ingredients} onChange={(e) => set('ingredients', e.target.value)} style={s(field)} />
      </label>

      <div style={s('display:flex;gap:10px;flex-wrap:wrap;margin-top:8px')}>
        <label style={s('flex:1;min-width:110px')}>
          <div style={s(label)}>원가 (원)</div>
          <input value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" style={s(field)} />
        </label>
        <label style={s('flex:1;min-width:90px')}>
          <div style={s(label)}>마진 (%)</div>
          <input value={margin} onChange={(e) => setMargin(e.target.value.replace(/[^0-9.-]/g, ''))} inputMode="decimal" style={s(field)} />
        </label>
        <label style={s('flex:1;min-width:120px')}>
          <div style={s(label)}>판매가 (원) *</div>
          <input
            value={f.priceKrw || suggested || ''}
            onChange={(e) => set('priceKrw', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            inputMode="numeric"
            style={s(field + ';font-weight:700')}
          />
        </label>
        <label style={s('flex:1;min-width:90px')}>
          <div style={s(label)}>초기 재고</div>
          <input
            value={f.stock || ''}
            onChange={(e) => set('stock', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            inputMode="numeric"
            style={s(field)}
          />
        </label>
      </div>

      {priceN > 0 && (
        <div style={s('background:#F8F5EF;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12px;color:#4A4234;line-height:1.7')}>
          <div>
            판매가 <b>{won(priceN)}</b>
            {costN > 0 && <> · 개당 이익 <b>{won(priceN - costN)}</b> · 실제 마진 <b>{marginFromPrice(costN, priceN).toFixed(1)}%</b></>}
          </div>
          <div style={s('color:#8A7D6C')}>
            고객 결제 금액 <b>${(admin.usdRate > 0 ? priceN / admin.usdRate : 0).toFixed(2)}</b>
          </div>
        </div>
      )}

      <div style={s('background:#FBF3E4;border-radius:10px;padding:9px 12px;margin-top:8px;font-size:11.5px;color:#8A6D32;line-height:1.6')}>
        등록 후에는 <b>판매중지</b> 상태로 들어갑니다. 상품 관리에서 내용을 확인한 뒤 판매를 시작하세요.
      </div>

      <div style={s('display:flex;gap:8px;margin-top:10px')}>
        <div
          onClick={() => setOpen(false)}
          style={s('flex:1;cursor:pointer;border:1px solid #D8CFBF;border-radius:999px;padding:10px;text-align:center;font-size:12.5px;font-weight:700;color:#8A7D6C')}
        >
          취소
        </div>
        <div
          onClick={() => void submit()}
          style={s(
            'flex:2;border-radius:999px;padding:10px;text-align:center;font-size:12.5px;font-weight:700;' +
              (ready && !busy
                ? 'cursor:pointer;background:#221C15;color:#F3E9D6'
                : 'background:#EFE9DD;color:#B0A490'),
          )}
        >
          {busy ? '등록 중…' : '등록'}
        </div>
      </div>
    </div>
  )
}

export function Pricing() {
  const admin = useAdmin()

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>가격 · 환율</div>

      <div style={s('font-family:Marcellus,serif;font-size:17px;margin:18px 2px 6px')}>환율</div>
      <div style={s('font-size:12px;color:#8A7D6C;line-height:1.6;margin-bottom:10px')}>
        상품은 <b>원화</b>로 등록하고, 고객 화면에는 각자 설정한 통화로 환산해 보여줍니다.
        실제 결제는 <b>USD</b>로 청구되므로,
        <b style={s('color:#B4622F')}> USD 환율을 바꾸면 전 상품의 결제 금액이 즉시 다시 계산됩니다.</b>
      </div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {admin.rates.map((r) => <RateRow key={r.code} code={r.code} />)}
      </div>

      <div style={s('font-family:Marcellus,serif;font-size:17px;margin:22px 2px 6px')}>상품 가격</div>
      <div style={s('font-size:12px;color:#8A7D6C;line-height:1.6;margin-bottom:10px')}>
        원가와 마진을 입력하면 판매가가 자동 계산됩니다. 판매가를 직접 고치면 실제 마진을 다시 알려드립니다.
        원가는 운영자만 볼 수 있습니다.
      </div>
      <NewProductForm />

      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {admin.prodList.map((p) => <PriceRow key={p.id} id={p.id} />)}
      </div>
    </div>
  )
}
