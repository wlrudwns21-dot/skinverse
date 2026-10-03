import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function Cart() {
  const st = useStore()

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:22px')}>{st.t.cartTitle}</div>

      {st.cartEmpty && (
        <div style={s('border:1px dashed var(--line-2);border-radius:4px;padding:30px;text-align:center;font-size:13px;color:var(--ink-3);margin-top:16px')}>
          {st.t.cartEmpty}
          <div onClick={st.goShop} style={s('cursor:pointer;color:var(--accent);font-weight:500;margin-top:8px')}>{st.t.browse} →</div>
        </div>
      )}

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {st.cartItems.map((it) => (
          <div key={it.id} style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:12px;display:flex;gap:12px;align-items:center')}>
            <div style={s(`width:56px;height:56px;border-radius:4px;background:${it.grad};flex-shrink:0`)} />
            <div style={s('flex:1;min-width:0')}>
              <div style={s('font-size:10px;color:var(--ink-3);letter-spacing:0.1em')}>{it.brand}</div>
              <div style={s('font-size:13px;font-weight:500;line-height:1.3')}>{it.name}</div>
              <div style={s('font-size:13px;font-weight:500;margin-top:2px')}>{it.lineS}</div>
            </div>
            <div style={s('display:flex;align-items:center;gap:8px')}>
              <div onClick={it.dec} style={s('cursor:pointer;width:26px;height:26px;border:1px solid var(--line-2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:500')}>−</div>
              <div style={s('font-size:13px;font-weight:500;min-width:14px;text-align:center')}>{it.qty}</div>
              <div onClick={it.inc} style={s('cursor:pointer;width:26px;height:26px;border:1px solid var(--line-2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:500')}>+</div>
            </div>
          </div>
        ))}
      </div>

      {st.hasCart && (
        <>
          <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:14px;margin-top:14px;font-size:13px;display:flex;flex-direction:column;gap:6px')}>
            <div style={s('display:flex;justify-content:space-between')}>
              <span style={s('color:var(--ink-2)')}>{st.t.subtotal}</span>
              <b>{st.subS}</b>
            </div>
            <div style={s('display:flex;justify-content:space-between')}>
              <span style={s('color:var(--ink-2)')}>{st.t.intlShip}</span>
              <b>{st.shipS}</b>
            </div>
            <div style={s('display:flex;justify-content:space-between;color:var(--warn)')}>
              <span>{st.t.earnPreview}</span>
              <b>+{st.earnPreview} P</b>
            </div>
          </div>
          <div onClick={st.goCheckout} style={s('cursor:pointer;margin-top:14px;background:var(--accent);color:var(--on-dark);border-radius:3px;padding:15px;text-align:center;font-size:14px;font-weight:500')}>
            {st.t.checkout}
          </div>
        </>
      )}
    </div>
  )
}
