import { s } from '../lib/css'
import { DISPLAY, GUTTER, KICKER, RULE } from '../lib/ui'
import { useStore } from '../store/StoreContext'


export function Shop() {
  const st = useStore()

  return (
    <div style={s('animation:rise .4s ease both;padding:22px 0 4px')}>
      <div style={s(GUTTER)}>
        <div style={s(KICKER)}>store</div>
        <div style={s(`${DISPLAY};font-size:24px;margin-top:8px`)}>{st.t.shopTitle}</div>
        <div style={s('font-size:12px;color:var(--ink-3);margin-top:5px;line-height:1.6')}>{st.t.shopSub} 🇰🇷</div>
      </div>

      {/* Scrolls under the gutter rather than inside it, so the last filter
          bleeds off the edge and reads as "there is more", instead of sitting
          cut in half against a margin. */}
      <div style={s('display:flex;gap:18px;overflow-x:auto;margin:18px 0 0;padding:0 20px')}>
        {st.chips.map((c) => (
          <div key={c.key} onClick={c.pick} style={s(c.style)}>{c.label}</div>
        ))}
      </div>
      <div style={s(`${RULE};margin-bottom:18px`)} />

      <div style={s(`${GUTTER};display:grid;grid-template-columns:1fr 1fr;gap:13px 13px`)}>
        {st.shopList.map((p) => (
          <div key={p.id} style={s('display:flex;flex-direction:column')}>
            <div onClick={p.open} style={s(`cursor:pointer;width:100%;aspect-ratio:4/5;background:${p.grad}`)} />
            <div onClick={p.open} style={s('cursor:pointer;flex:1')}>
              <div style={s('font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3);margin-top:10px')}>
                {p.brand} · {p.kind}
              </div>
              <div style={s('font-size:12.5px;margin-top:4px;line-height:1.5')}>{p.name}</div>
              <div style={s('font-size:11px;color:var(--ink-4);margin-top:2px;line-height:1.5')}>{p.sub}</div>
            </div>
            <div style={s('display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;gap:8px')}>
              <div style={s('min-width:0')}>
                <div style={s('font-size:13px;color:var(--ink);letter-spacing:0.04em')}>
                  {p.priceS} <span style={s('font-size:10px;color:var(--ink-4)')}>{p.ml}</span>
                </div>
                <div style={s('font-size:10px;color:var(--accent);font-weight:500;margin-top:3px')}>
                  {p.matchS} {st.t.match}
                </div>
                {/* A percentage with no cause is just a number. */}
                {p.reasons[0] && (
                  <div style={s('font-size:9.5px;color:var(--ink-4);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                    {p.reasons[0]}
                  </div>
                )}
              </div>
              <div
                onClick={p.add}
                style={s('cursor:pointer;flex-shrink:0;border:1px solid var(--ink);color:var(--ink);border-radius:3px;font-size:11px;font-weight:500;letter-spacing:0.03em;padding:8px 11px')}
              >
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
    <div style={s('animation:rise .4s ease both;padding-bottom:4px')}>
      <div style={s(`${GUTTER};padding-top:16px;padding-bottom:14px`)}>
        <span onClick={st.goShop} style={s('cursor:pointer;font-size:11px;letter-spacing:0.1em;color:var(--ink-3)')}>
          ← {st.t.shopTitle}
        </span>
      </div>

      {/* Full width, 4:5. The product photograph is the page, and a rounded
          card around it would make it an illustration of the page instead. */}
      <div style={s(`width:100%;aspect-ratio:4/5;max-height:430px;background:${sel.grad}`)} />

      <div style={s(`${GUTTER};padding-top:20px`)}>
        <div style={s('font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3)')}>
          {sel.brand} · {sel.kind} · {sel.ml}
        </div>
        <div style={s(`${DISPLAY};font-size:23px;line-height:1.3;margin-top:8px`)}>{sel.name}</div>
        <div style={s('font-size:12.5px;color:var(--ink-3);margin-top:5px;line-height:1.6')}>{sel.sub}</div>

        <div style={s('display:flex;align-items:baseline;gap:12px;margin-top:14px')}>
          <span style={s('font-family:Albert Sans,sans-serif;font-weight:200;font-size:26px;line-height:1')}>{sel.priceS}</span>
          <span style={s('font-size:11px;color:var(--accent);font-weight:500')}>{sel.matchS} {st.t.match}</span>
        </div>

        {sel.reasons.length > 0 && (
          <div style={s('margin-top:16px;font-size:11.5px;color:var(--ink-2);line-height:1.8')}>
            <span style={s('color:var(--ink-3)')}>{st.whyThis} </span>
            {sel.reasons.join(' · ')}
          </div>
        )}

        <div style={s(`${RULE};margin-top:20px`)} />

        <div style={s('padding:16px 0')}>
          <div style={s(KICKER)}>{st.t.whyT}</div>
          <div style={s('font-size:12.5px;line-height:1.8;color:var(--ink-2);margin-top:9px')}>{sel.why}</div>
        </div>

        <div style={s(RULE)} />

        <div style={s('padding:16px 0')}>
          <div style={s(KICKER)}>{st.t.ingT}</div>
          <div style={s('font-size:12.5px;line-height:1.8;color:var(--ink-2);margin-top:9px')}>{sel.ing}</div>
        </div>

        <div style={s(RULE)} />

        <div style={s('display:flex;gap:10px;margin-top:20px')}>
          <div
            onClick={sel.add}
            style={s('cursor:pointer;flex:1;border:1px solid var(--ink);color:var(--ink);border-radius:3px;padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em')}
          >
            {st.t.addBag}
          </div>
          <div
            onClick={() => { sel.add(); st.goCart() }}
            style={s('cursor:pointer;flex:1;background:var(--ink);color:var(--on-dark);border-radius:3px;padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em')}
          >
            {st.t.buyNow}
          </div>
        </div>
      </div>
    </div>
  )
}
