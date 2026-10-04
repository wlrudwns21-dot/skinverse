import type { ReactNode } from 'react'
import { analysisLabels as L } from '../catalog/analysis'
import { DetailPage } from '../components/DetailPage'
import { ProductShot } from '../components/ProductShot'
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
            <ProductShot src={p.img} grad={p.grad} alt={p.name} onClick={p.open} />
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
                <div style={s('font-size:10px;color:var(--link);font-weight:500;margin-top:3px')}>
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

/**
 * One line of the pros or cons list.
 *
 * The marker is a character in a fixed-width column rather than a list bullet,
 * so a two-line note hangs under its own text instead of under the marker, and
 * so the cons list can be marked in a different colour without the browser's
 * bullet ignoring it.
 */
function Note({ mark, tint, children }: { mark: string; tint: string; children: ReactNode }) {
  return (
    <div style={s('display:flex;gap:9px;margin-top:10px')}>
      <span style={s(`flex-shrink:0;width:9px;font-size:11px;line-height:1.85;color:${tint}`)}>{mark}</span>
      <span style={s('flex:1;font-size:12px;line-height:1.85;color:var(--ink-2)')}>{children}</span>
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
      <ProductShot src={sel.img} grad={sel.grad} alt={sel.name} frame="max-height:430px" />

      <div style={s(`${GUTTER};padding-top:20px`)}>
        <div style={s('font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3)')}>
          {sel.brand} · {sel.kind} · {sel.ml}
        </div>
        {/* The line name is held in Korean, which is how Korean customers know
            the product and how it is printed on the box. It is shown to Korean
            readers only — to everyone else it is a word they cannot read, and
            the English product name already carries the line. */}
        {sel.line && st.lang === 'ko' && (
          <div style={s('font-size:11.5px;color:var(--ink-3);margin-top:8px;letter-spacing:0.02em')}>{sel.line}</div>
        )}
        <div style={s(`${DISPLAY};font-size:23px;line-height:1.3;margin-top:8px`)}>{sel.name}</div>
        <div style={s('font-size:12.5px;color:var(--ink-3);margin-top:5px;line-height:1.6')}>{sel.sub}</div>

        <div style={s('display:flex;align-items:baseline;gap:12px;margin-top:14px')}>
          <span style={s('font-family:Albert Sans,sans-serif;font-weight:200;font-size:26px;line-height:1')}>{sel.priceS}</span>
          <span style={s('font-size:11px;color:var(--link);font-weight:500')}>{sel.matchS} {st.t.match}</span>
        </div>

        {sel.reasons.length > 0 && (
          <div style={s('margin-top:16px;font-size:11.5px;color:var(--ink-2);line-height:1.8')}>
            <span style={s('color:var(--ink-3)')}>{st.whyThis} </span>
            {sel.reasons.join(' · ')}
          </div>
        )}

        <div style={s(`${RULE};margin-top:20px`)} />

        {/* Where it goes in a day, as two facts rather than a sentence. A
            customer deciding between two creams is deciding which one replaces
            what they already put on at night. */}
        {(sel.slotS || sel.stepS) && (
          <>
            <div style={s('display:flex;padding:14px 0')}>
              <div style={s('flex:1')}>
                <div style={s(KICKER)}>{L.slot[st.lang]}</div>
                <div style={s('font-size:12.5px;margin-top:7px;line-height:1.5')}>{sel.slotS}</div>
              </div>
              {sel.stepS && (
                <div style={s('flex:1;border-left:1px solid var(--line);padding-left:16px')}>
                  <div style={s(KICKER)}>{L.step[st.lang]}</div>
                  <div style={s('font-size:12.5px;margin-top:7px;line-height:1.5')}>{sel.stepS}</div>
                </div>
              )}
            </div>
            <div style={s(RULE)} />
          </>
        )}

        {sel.fits.length > 0 && (
          <>
            <div style={s('padding:16px 0')}>
              <div style={s(KICKER)}>{L.fits[st.lang]}</div>
              {sel.fits.map((f) => (
                <div key={f.axis} style={s('display:flex;gap:11px;align-items:baseline;margin-top:11px')}>
                  {/* The axis is the heading of the line and the note is the
                      evidence for it, so the axis is set in ink and the note
                      one step back — not the other way round. */}
                  <div style={s('flex-shrink:0;width:74px;font-size:11.5px;line-height:1.6')}>
                    {f.axis}
                    <div style={s('font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-4);margin-top:2px')}>
                      {L[f.strength][st.lang]}
                    </div>
                  </div>
                  <div style={s('flex:1;font-size:12px;line-height:1.75;color:var(--ink-2)')}>{f.note}</div>
                </div>
              ))}
            </div>
            <div style={s(RULE)} />
          </>
        )}

        <div style={s('padding:16px 0')}>
          <div style={s(KICKER)}>{st.t.whyT}</div>
          <div style={s('font-size:12.5px;line-height:1.8;color:var(--ink-2);margin-top:9px')}>{sel.why}</div>
        </div>

        <div style={s(RULE)} />

        {/* Pros and cons sit together, in that order, and neither can be
            collapsed away: a product shown with only its merits is an
            advertisement, and this screen is meant to be read. */}
        {sel.pros.length > 0 && (
          <>
            <div style={s('padding:16px 0')}>
              <div style={s(KICKER)}>{L.pros[st.lang]}</div>
              {sel.pros.map((line, i) => (
                <Note key={i} mark="—" tint="var(--ink-2)">{line}</Note>
              ))}
            </div>
            <div style={s(RULE)} />
          </>
        )}

        {sel.cons.length > 0 && (
          <>
            <div style={s('padding:16px 0')}>
              <div style={s(`${KICKER};color:var(--warn)`)}>{L.cons[st.lang]}</div>
              {sel.cons.map((line, i) => (
                <Note key={i} mark="!" tint="var(--warn)">{line}</Note>
              ))}
            </div>
            <div style={s(RULE)} />
          </>
        )}

        <div style={s('padding:16px 0')}>
          <div style={s(KICKER)}>{st.t.ingT}</div>
          <div style={s('font-size:12.5px;line-height:1.8;color:var(--ink-2);margin-top:9px')}>{sel.ing}</div>
        </div>

        <div style={s(RULE)} />

        {!sel.checked && (
          <>
            <div style={s('padding:16px 0;font-size:11.5px;line-height:1.7;color:var(--ink-3)')}>
              {L.unchecked[st.lang]}
            </div>
            <div style={s(RULE)} />
          </>
        )}

        <div style={s('display:flex;gap:10px;margin-top:20px')}>
          <div
            onClick={sel.add}
            style={s('cursor:pointer;flex:1;border:1px solid var(--ink);color:var(--ink);border-radius:3px;padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em')}
          >
            {st.t.addBag}
          </div>
          <div
            onClick={() => { sel.add(); st.goCart() }}
            style={s('cursor:pointer;flex:1;background:var(--accent);color:var(--on-accent);border-radius:3px;padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em')}
          >
            {st.t.buyNow}
          </div>
        </div>
      </div>

      {/* Last, and outside the gutter: the maker's artwork is typeset to its
          own margins and goes full-bleed. It sits below the buttons so a
          customer who has decided never has to scroll past it to act. */}
      <DetailPage id={sel.id} lang={st.lang} heights={sel.detail} name={sel.name} />
    </div>
  )
}
