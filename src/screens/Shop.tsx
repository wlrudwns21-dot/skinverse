import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function Shop() {
  const st = useStore()

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:22px')}>{st.t.shopTitle}</div>
      <div style={s('font-size:12px;color:#8A7D6C;margin-top:2px')}>{st.t.shopSub} 🇰🇷</div>

      <div style={s('display:flex;gap:8px;overflow-x:auto;margin:14px 0;padding-bottom:4px')}>
        {st.chips.map((c) => (
          <div key={c.key} onClick={c.pick} style={s(c.style)}>{c.label}</div>
        ))}
      </div>

      <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        {st.shopList.map((p) => (
          <div key={p.id} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:10px;display:flex;flex-direction:column')}>
            <div onClick={p.open} style={s(`cursor:pointer;height:120px;border-radius:10px;background:${p.grad};display:flex;align-items:flex-end;padding:8px;box-sizing:border-box`)}>
              <span style={s('background:rgba(255,255,255,0.85);border-radius:6px;font-size:10px;padding:3px 6px;font-weight:600;color:#4A4234')}>{p.kind} · {p.ml}</span>
            </div>
            <div onClick={p.open} style={s('cursor:pointer;flex:1')}>
              <div style={s('font-size:10px;color:#8A7D6C;letter-spacing:0.1em;margin-top:8px')}>{p.brand}</div>
              <div style={s('font-size:12.5px;font-weight:600;line-height:1.3;margin-top:2px')}>{p.name}</div>
              <div style={s('font-size:11px;color:#A2957F')}>{p.sub}</div>
            </div>
            <div style={s('display:flex;justify-content:space-between;align-items:center;margin-top:8px')}>
              <div style={s('min-width:0')}>
                <div style={s('font-size:14px;font-weight:700')}>{p.priceS}</div>
                <div style={s('font-size:10px;font-weight:700;color:#2E6B58')}>{p.matchS} {st.t.match}</div>
                {/* A percentage with no cause is just a number. */}
                {p.reasons[0] && (
                  <div style={s('font-size:9.5px;color:#A2957F;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                    {p.reasons[0]}
                  </div>
                )}
              </div>
              <div onClick={p.add} style={s('cursor:pointer;background:#221C15;color:#F5F0E6;border-radius:999px;font-size:11px;font-weight:700;padding:8px 12px')}>
                + {st.t.bag}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProductDetail() {
  const st = useStore()
  const sel = st.sel

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div onClick={st.goShop} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:12px')}>← {st.t.shopTitle}</div>

      <div style={s(`height:230px;border-radius:18px;background:${sel.grad};display:flex;align-items:flex-end;padding:14px;box-sizing:border-box`)}>
        <span style={s('background:rgba(255,255,255,0.88);border-radius:8px;font-size:12px;padding:5px 10px;font-weight:600;color:#4A4234')}>{sel.kind} · {sel.ml}</span>
      </div>

      <div style={s('display:flex;justify-content:space-between;align-items:flex-start;margin-top:16px;gap:10px')}>
        <div>
          <div style={s('font-size:11px;color:#8A7D6C;letter-spacing:0.12em')}>{sel.brand}</div>
          <div style={s('font-family:Marcellus,serif;font-size:22px;line-height:1.2;margin-top:2px')}>{sel.name}</div>
          <div style={s('font-size:13px;color:#A2957F;margin-top:2px')}>{sel.sub}</div>
        </div>
        <div style={s('text-align:right')}>
          <div style={s('font-size:20px;font-weight:700')}>{sel.priceS}</div>
          <div style={s('font-size:11px;font-weight:700;color:#2E6B58;background:#EAF1EC;border-radius:6px;padding:3px 7px;margin-top:4px')}>{sel.matchS} {st.t.match}</div>
        </div>
      </div>

      {sel.reasons.length > 0 && (
        <div style={s('display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px')}>
          <span style={s('font-size:11.5px;color:#8A7D6C;font-weight:600')}>{st.whyThis}</span>
          {sel.reasons.map((reason) => (
            <span key={reason} style={s('font-size:11px;font-weight:600;color:#4A4234;background:#F1EEE6;border:1px solid #E2DACA;border-radius:999px;padding:4px 10px')}>
              {reason}
            </span>
          ))}
        </div>
      )}

      <div style={s('background:#EAF1EC;border-radius:14px;padding:14px;margin-top:14px;font-size:13px;line-height:1.55;color:#2C4A3E')}>
        <b>{st.t.whyT}</b>
        <br />
        {sel.why}
      </div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px;margin-top:10px;font-size:13px')}>
        <b>{st.t.ingT}</b>
        <div style={s('color:#6E6252;margin-top:4px;line-height:1.5')}>{sel.ing}</div>
      </div>

      <div style={s('display:flex;gap:10px;margin-top:16px')}>
        <div onClick={sel.add} style={s('cursor:pointer;flex:1;background:#FFFFFF;border:1.5px solid #221C15;border-radius:999px;padding:14px;text-align:center;font-size:13px;font-weight:700')}>
          {st.t.addBag}
        </div>
        <div
          onClick={() => { sel.add(); st.goCart() }}
          style={s('cursor:pointer;flex:1;background:#221C15;color:#F5F0E6;border-radius:999px;padding:14px;text-align:center;font-size:13px;font-weight:700')}
        >
          {st.t.buyNow}
        </div>
      </div>
    </div>
  )
}
