import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const stepperStyle =
  'cursor:pointer;width:24px;height:24px;border:1px solid var(--line-2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:500'

export function Products() {
  const admin = useAdmin()

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px')}>
        <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:24px')}>상품 관리</div>
        <div style={s('font-size:12px;color:var(--ink-3)')}>
          재고 5개 이하 <b style={s('color:var(--warn)')}>{admin.lowStockN}건</b>
        </div>
      </div>

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {admin.prodList.map((p) => (
          <div key={p.id} style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:12px 14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap')}>
            <div style={s(`width:52px;height:52px;border-radius:4px;background:${p.grad};flex-shrink:0`)} />

            <div style={s('flex:1;min-width:160px')}>
              <div style={s('font-size:10px;color:var(--ink-3);letter-spacing:0.1em')}>{p.brand}</div>
              <div style={s('font-size:13.5px;font-weight:500')}>{p.name}</div>
              {/* Won first: that is the price the operator set, and the
                  dollar figure is derived from it at the current rate. */}
              <div style={s('font-size:11.5px;color:var(--ink-4)')}>
                {p.kind} · {p.ml} · ₩{p.priceKrw.toLocaleString('en-US')} (${p.price})
              </div>
            </div>

            <div style={s('text-align:center')}>
              <div style={s('font-size:11px;color:var(--ink-3);font-weight:500')}>재고</div>
              <div style={s('display:flex;align-items:center;gap:8px;margin-top:4px')}>
                <div onClick={p.dec} style={s(stepperStyle)}>−</div>
                <b style={s(`min-width:30px;text-align:center;font-size:14px;color:${p.stockColor}`)}>{p.stock}</b>
                <div onClick={p.inc} style={s(stepperStyle)}>+</div>
              </div>
            </div>

            <div style={s('text-align:center;min-width:70px')}>
              <div style={s('font-size:11px;color:var(--ink-3);font-weight:500')}>이달 판매</div>
              <b style={s('font-size:14px')}>{p.sold}</b>
            </div>

            <div onClick={p.toggle} style={s(`cursor:pointer;border-radius:3px;padding:7px 14px;font-size:12px;font-weight:500;${p.activeStyle}`)}>
              {p.activeLabel}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
