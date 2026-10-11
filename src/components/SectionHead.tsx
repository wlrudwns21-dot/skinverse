import { s } from '../lib/css'
import { KICKER } from '../lib/ui'

/**
 * The head of a list you are working through.
 *
 * The routine and the rewards screen are both "here are some things, here is
 * how far you have got", and both said so in words only: a faint kicker, and
 * somewhere else on the line a bare `0/4`. Stacked four deep that reads as
 * one long column of text with no edges — you cannot see where 아침 ends and
 * 저녁 begins without reading, and you cannot see progress at all without
 * finding the fraction and doing the arithmetic.
 *
 * So the head carries the count next to its own label rather than across the
 * screen from it, and draws the same fraction as a bar. The bar is the part
 * that does the work: it is the only thing on these screens you can read
 * without reading.
 *
 * It is deliberately a rule rather than a filled band. A tinted block behind
 * every section would section the page at the cost of making it look like a
 * form, and the rest of this design holds together on hairlines.
 */
export function SectionHead({
  label,
  done,
  total,
  meta,
  tone = 'var(--accent)',
}: {
  label: string
  /** Steps completed. Omit along with `total` for a head with no progress. */
  done?: number
  total?: number
  /** Anything to say on the right — a time window, a points total. */
  meta?: { text: string; dim?: boolean }
  /** The fill colour, so a section can be marked done or urgent by its own rule. */
  tone?: string
}) {
  const hasBar = typeof done === 'number' && typeof total === 'number' && total > 0
  // Clamped because a count that has drifted past its total must not paint
  // outside the track — better a full bar than a broken one.
  const pct = hasBar ? Math.max(0, Math.min(1, done / total)) : 0

  return (
    <div style={s('padding:26px 0 0')}>
      <div style={s('display:flex;align-items:baseline;gap:9px')}>
        <span style={s(KICKER)}>{label}</span>
        {hasBar && (
          <span style={s(`font-size:11px;letter-spacing:0.04em;color:${pct >= 1 ? tone : 'var(--ink-3)'}`)}>
            {done}/{total}
          </span>
        )}
        <span style={s('flex:1')} />
        {meta && (
          <span
            style={s(
              `font-size:11px;flex-shrink:0;letter-spacing:0.04em;text-align:right;` +
                `color:${meta.dim ? 'var(--ink-4)' : 'var(--link)'}`,
            )}
          >
            {meta.text}
          </span>
        )}
      </div>

      {hasBar && (
        <div style={s('height:3px;border-radius:2px;background:var(--line);margin-top:9px;overflow:hidden')}>
          <div
            style={s(
              `height:3px;border-radius:2px;background:${tone};` +
                `width:${(pct * 100).toFixed(1)}%;transition:width .35s ease`,
            )}
          />
        </div>
      )}
    </div>
  )
}
