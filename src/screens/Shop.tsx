import { useState, type ReactNode } from 'react'
import { analysisLabels as L } from '../catalog/analysis'
import {
  INCI_NOTE,
  ingredientPreview,
  ingredientsFor,
  lessLabel,
  moreLabel,
  needsCollapse,
} from '../catalog/ingredients'
import { DetailPage } from '../components/DetailPage'
import { ProductShot } from '../components/ProductShot'
import type { Lang } from '../data/types'
import { s } from '../lib/css'
import { CARD, DISPLAY, GUTTER, KICKER, NUMERAL, RULE } from '../lib/ui'
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

      {/* One card per product. A shelf of photographs butted edge to edge,
          with each one's name, price, match and add-button floating in the
          gap underneath, makes the reader work out where one product stops
          and the next starts — and on this screen getting that wrong means
          adding the wrong thing to the bag. */}
      <div style={s(`${GUTTER};display:grid;grid-template-columns:1fr 1fr;gap:12px`)}>
        {st.shopList.map((p) => (
          <div key={p.id} style={s(`display:flex;flex-direction:column;overflow:hidden;${CARD}`)}>
            <ProductShot src={p.img} grad={p.grad} alt={p.name} onClick={p.open} />
            <div style={s('padding:11px 12px 13px;display:flex;flex-direction:column;flex:1')}>
              <div onClick={p.open} style={s('cursor:pointer;flex:1')}>
                <div style={s('font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3)')}>
                  {p.brand} · {p.kind}
                </div>
                <div style={s('font-size:12.5px;margin-top:4px;line-height:1.5')}>{p.name}</div>
                <div style={s('font-size:11px;color:var(--ink-4);margin-top:2px;line-height:1.5')}>{p.sub}</div>
              </div>
              <div style={s('display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;gap:8px')}>
                <div style={s('min-width:0')}>
                  {/* What it costs elsewhere, above what it costs here. Every
                      brand in the shop is 20–45% under the duty-free list and
                      none of it was visible until the list price had a field
                      to live in. */}
                  {p.listPriceS && (
                    <div style={s('display:flex;align-items:baseline;gap:5px;font-size:10px;margin-bottom:3px')}>
                      <span style={s('color:var(--ink-4);text-decoration:line-through')}>{p.listPriceS}</span>
                      <span style={s('color:var(--warn);font-weight:600')}>{p.offPct}%</span>
                    </div>
                  )}
                  {/* A price we chose rather than one we read off the
                      duty-free screen. It sits above the number in the caution
                      tone, because a figure nobody has confirmed printed in the
                      same type as four that have been is the shop asserting
                      something it does not know. */}
                  {p.priceProvisional && (
                    <div style={s('display:inline-block;font-size:9px;letter-spacing:0.08em;font-weight:600;color:var(--warn);background:var(--warn-soft);border-radius:var(--radius-sm);padding:2px 6px;margin-bottom:4px')}>
                      {st.t.provisionalPrice}
                    </div>
                  )}
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
                  style={s('cursor:pointer;flex-shrink:0;background:var(--accent);color:var(--on-accent);border-radius:var(--radius-sm);font-size:11px;font-weight:500;letter-spacing:0.03em;padding:8px 11px')}
                >
                  + {st.t.bag}
                </div>
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
/**
 * The ingredient list — in the reader's language where there is one, and
 * folded away until they ask for it.
 *
 * Two problems in one block. It was the longest thing on the page, sitting
 * between the analysis and the buy buttons so everybody scrolled the whole
 * seventy-six ingredients whether they wanted to or not. And it was always
 * Korean, which for a reader in Bangkok was a wall of a script they cannot
 * read dropped into the middle of their own page.
 *
 * Both are fixed here rather than by shortening the list: the people who open
 * this block are usually checking for one specific thing they react to, and
 * an abridged ingredient list is useless for that.
 */
function Ingredients({
  lang, heading, ko, inci, extra, source,
}: {
  lang: Lang
  heading: string
  ko: string
  inci: string
  extra?: Partial<Record<Lang, string>>
  /** Where the list came from, when it did not come from the maker. */
  source?: string
}) {
  const [open, setOpen] = useState(false)
  const view = ingredientsFor(lang, { ko, inci, extra })
  if (!view) return null

  const long = needsCollapse(view.text)
  const shown = open || !long ? view.text : ingredientPreview(view.text)

  return (
    <Block>
      <div>
        <div style={s(KICKER)}>{heading}</div>
        <div
          /* `lang` so the browser hyphenates and line-breaks by the right
             rules — Chinese and Thai break between characters, Latin does not. */
          lang={view.shownIn}
          style={s('font-size:12.5px;line-height:1.8;color:var(--ink-2);margin-top:9px;word-break:break-word')}
        >
          {shown}
        </div>
        {view.isFallback && (
          <div style={s('font-size:10.5px;line-height:1.6;color:var(--ink-4);margin-top:8px')}>
            {INCI_NOTE[lang]}
          </div>
        )}
        {/* Where the list came from, when that is not the maker. Set in the
            caution tone rather than the muted one: a reader who has just read
            sixty ingredient names has earned a straight answer about how firm
            the list is, and the muted rank is where this app puts things that
            do not change a decision.

            It opens with the list rather than standing above it. These notes
            run to a paragraph, and collapsed they were a block of caution
            colour sitting between the analysis and the artwork for every
            reader, including the ones who never open the list. The reader who
            does open sixty ingredient names is the one asking where they came
            from, so that is when it appears. When the list is short enough not
            to collapse at all, so is this. */}
        {source && (open || !long) && (
          <div
            style={s(
              'font-size:10.5px;line-height:1.6;color:var(--warn);background:var(--warn-soft);' +
                'border-radius:var(--radius-sm);padding:9px 11px;margin-top:10px',
            )}
          >
            {source}
          </div>
        )}
        {long && (
          <div
            onClick={() => setOpen((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v) }}
            style={s('cursor:pointer;display:inline-block;margin-top:11px;font-size:11.5px;color:var(--ink-3);border-bottom:1px solid var(--line-2);padding-bottom:2px')}
          >
            {(open ? lessLabel : moreLabel)[lang]}
          </div>
        )}
      </div>
    </Block>
  )
}

/**
 * One section of the detail page.
 *
 * This screen is the longest in the app — a fit table, a recommendation, three
 * or four merits, three or four cautions, and a sixty-ingredient list. It was
 * built as all of that in a single column with a hairline between each part,
 * which is a page you scroll past rather than read. Each part gets its own
 * card now, so the eye can find the section it wants and stop.
 */
function Block({ children }: { children: ReactNode }) {
  return <div style={s(`${CARD};padding:16px;margin-top:12px`)}>{children}</div>
}

/**
 * The ingredient analysis, folded away until it is asked for.
 *
 * It is the longest thing on this screen — a fit table, a paragraph and three
 * merits — and it sat between the price and the maker's artwork, so every
 * reader scrolled roughly two thousand pixels of it whether they came to read
 * or to look. Folded, the page reaches the artwork in about a third of that
 * and the analysis is one tap away for the reader who wants it.
 *
 * What does NOT go in here is the caution list. Collapsing the merits and
 * leaving the cautions out is fine in a way the reverse would not be: a reader
 * who never opens this still sees everything that might put them off. Folding
 * both away would make the default view an advertisement, which is the one
 * shape this screen must not take.
 */
function Folded({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={s('margin-top:12px')}>
      <div
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v) }}
        style={s(
          `${CARD};cursor:pointer;padding:15px 16px;display:flex;align-items:center;gap:9px`,
        )}
      >
        <span style={s('flex:1;font-size:12.5px;font-weight:500;letter-spacing:0.02em')}>{label}</span>
        <span style={s('font-size:11px;color:var(--ink-4);font-variant-numeric:tabular-nums')}>{count}</span>
        {/* A caret, so the control reads as a disclosure rather than a link. */}
        <span
          aria-hidden
          style={s(`font-size:10px;color:var(--ink-3);transform:rotate(${open ? '180' : '0'}deg)`)}
        >
          ▾
        </span>
      </div>
      {open && children}
    </div>
  )
}

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

      <div style={s(`${GUTTER};padding-top:16px`)}>
        {/* Identity and price, on their own card. It is the one block on this
            screen a customer may read and nothing else. */}
        <div style={s(`${CARD};padding:18px`)}>
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

        <div style={s('display:flex;align-items:baseline;gap:12px;margin-top:14px;flex-wrap:wrap')}>
          <span style={s(`${NUMERAL};font-size:26px`)}>{sel.priceS}</span>
          {sel.listPriceS && (
            <span style={s('display:inline-flex;align-items:baseline;gap:6px;font-size:12px')}>
              <span style={s('color:var(--ink-4);text-decoration:line-through')}>{sel.listPriceS}</span>
              <span style={s('color:var(--warn);font-weight:600')}>{sel.offPct}% OFF</span>
            </span>
          )}
          {sel.priceProvisional && (
            <span style={s('font-size:10px;letter-spacing:0.08em;font-weight:600;color:var(--warn);background:var(--warn-soft);border-radius:var(--radius-sm);padding:3px 8px')}>
              {st.t.provisionalPrice}
            </span>
          )}
          <span style={s('font-size:11px;color:var(--link);font-weight:500')}>{sel.matchS} {st.t.match}</span>
        </div>

        {/* The badge says which kind of number it is. This says why, because
            someone about to spend this much is owed the reason and not a
            label. */}
        {sel.priceProvisional && (
          <div style={s('margin-top:12px;font-size:11.5px;line-height:1.7;color:var(--warn);background:var(--warn-soft);border-radius:var(--radius-sm);padding:11px 13px')}>
            {st.t.provisionalNote}
          </div>
        )}

        {sel.reasons.length > 0 && (
          <div style={s('margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:11.5px;color:var(--ink-2);line-height:1.8')}>
            <span style={s('color:var(--ink-3)')}>{st.whyThis} </span>
            {sel.reasons.join(' · ')}
          </div>
        )}
        </div>

        {/* Where it goes in a day, as two facts rather than a sentence. A
            customer deciding between two creams is deciding which one replaces
            what they already put on at night. */}
        {(sel.slotS || sel.stepS) && (
          <Block>
            <div style={s('display:flex')}>
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
          </Block>
        )}

        {(sel.fits.length > 0 || sel.why || sel.pros.length > 0) && (
        <Folded
          label={L.analysis[st.lang]}
          count={sel.fits.length + (sel.why ? 1 : 0) + sel.pros.length}
        >
        {sel.fits.length > 0 && (
          <Block>
            <div>
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
          </Block>
        )}

        {/* A product the maker has not published an ingredient list for has
            no analysis and no recommendation paragraph. Rendering the heading
            over nothing makes the page look broken rather than incomplete. */}
        {sel.why && (
          <Block>
            <div>
              <div style={s(KICKER)}>{st.t.whyT}</div>
              <div style={s('font-size:12.5px;line-height:1.8;color:var(--ink-2);margin-top:9px')}>{sel.why}</div>
            </div>
          </Block>
        )}

        {/* The merits fold away with the rest of the analysis. The cautions
            below do not, so the default view can never be only the good news —
            see the note on `Folded`. */}
        {sel.pros.length > 0 && (
          <Block>
            <div>
              <div style={s(KICKER)}>{L.pros[st.lang]}</div>
              {sel.pros.map((line, i) => (
                <Note key={i} mark="—" tint="var(--ink-2)">{line}</Note>
              ))}
            </div>
          </Block>
        )}
        </Folded>
        )}

        {sel.cons.length > 0 && (
          <Block>
            <div>
              <div style={s(`${KICKER};color:var(--warn)`)}>{L.cons[st.lang]}</div>
              {sel.cons.map((line, i) => (
                <Note key={i} mark="!" tint="var(--warn)">{line}</Note>
              ))}
            </div>
          </Block>
        )}

        <Ingredients
          lang={st.lang}
          heading={st.t.ingT}
          ko={sel.ing}
          inci={sel.inci}
          extra={sel.ingL}
          source={sel.ingSrc}
        />

        {!sel.checked && (
          <Block>
            <div style={s('font-size:11.5px;line-height:1.7;color:var(--ink-3)')}>
              {L.unchecked[st.lang]}
            </div>
          </Block>
        )}

        <div style={s('display:flex;gap:10px;margin-top:20px')}>
          <div
            onClick={sel.add}
            style={s('cursor:pointer;flex:1;border:1px solid var(--ink);color:var(--ink);border-radius:var(--radius-sm);padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em')}
          >
            {st.t.addBag}
          </div>
          <div
            onClick={() => { sel.add(); st.goCart() }}
            style={s('cursor:pointer;flex:1;background:var(--accent);color:var(--on-accent);border-radius:var(--radius-sm);padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em')}
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
