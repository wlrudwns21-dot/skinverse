import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function Cart() {
  const st = useStore()

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:22px')}>{st.t.cartTitle}</div>

      {st.cartEmpty && (
        <div style={s('border:1px dashed #D3C9B7;border-radius:16px;padding:30px;text-align:center;font-size:13px;color:#8A7D6C;margin-top:16px')}>
          {st.t.cartEmpty}
          <div onClick={st.goShop} style={s('cursor:pointer;color:#2E6B58;font-weight:700;margin-top:8px')}>{st.t.browse} →</div>
        </div>
      )}

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {st.cartItems.map((it) => (
          <div key={it.id} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:12px;display:flex;gap:12px;align-items:center')}>
            <div style={s(`width:56px;height:56px;border-radius:10px;background:${it.grad};flex-shrink:0`)} />
            <div style={s('flex:1;min-width:0')}>
              <div style={s('font-size:10px;color:#8A7D6C;letter-spacing:0.1em')}>{it.brand}</div>
              <div style={s('font-size:13px;font-weight:600;line-height:1.3')}>{it.name}</div>
              <div style={s('font-size:13px;font-weight:700;margin-top:2px')}>{it.lineS}</div>
            </div>
            <div style={s('display:flex;align-items:center;gap:8px')}>
              <div onClick={it.dec} style={s('cursor:pointer;width:26px;height:26px;border:1px solid #D8CFBF;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700')}>−</div>
              <div style={s('font-size:13px;font-weight:700;min-width:14px;text-align:center')}>{it.qty}</div>
              <div onClick={it.inc} style={s('cursor:pointer;width:26px;height:26px;border:1px solid #D8CFBF;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700')}>+</div>
            </div>
          </div>
        ))}
      </div>

      {st.hasCart && (
        <>
          <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px;margin-top:14px;font-size:13px;display:flex;flex-direction:column;gap:6px')}>
            <div style={s('display:flex;justify-content:space-between')}>
              <span style={s('color:#6E6252')}>{st.t.subtotal}</span>
              <b>{st.subS}</b>
            </div>
            <div style={s('display:flex;justify-content:space-between')}>
              <span style={s('color:#6E6252')}>{st.t.intlShip}</span>
              <b>{st.shipS}</b>
            </div>
            <div style={s('display:flex;justify-content:space-between;color:#C29A5B')}>
              <span>{st.t.earnPreview}</span>
              <b>+{st.earnPreview} P</b>
            </div>
          </div>
          <div onClick={st.goCheckout} style={s('cursor:pointer;margin-top:14px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700')}>
            {st.t.checkout}
          </div>
        </>
      )}
    </div>
  )
}
