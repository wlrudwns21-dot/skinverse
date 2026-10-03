/**
 * The handful of declarations every screen is built from.
 *
 * These were copied into each screen while the design was being found, which
 * is how a 20px gutter becomes 20px in four files and 22px in the fifth. A
 * screen reaches for one of these before it writes its own padding, and a new
 * one gets added here rather than inline, so "the same shape" stays literally
 * the same string.
 */

/** The side margin every section sits inside. Only banners break out of it. */
export const GUTTER = 'padding:0 20px'

/** A section label: small, letterspaced, uppercase, never a heading size. */
export const KICKER =
  'font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:var(--ink-3)'

/** The "see all" partner to a KICKER, on the opposite end of the same row. */
export const MORE =
  'cursor:pointer;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent);font-weight:500'

/** The hairline that separates one block from the next. */
export const RULE = 'height:1px;background:var(--line)'

/** A KICKER over a photograph or a dark fill. */
export const EYEBROW =
  'font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:var(--on-dark-2)'

/**
 * The display face: light, tight, and with Hangul that actually renders —
 * Marcellus has no Hangul glyphs, so a Korean heading set in it falls back to
 * whatever serif the device happens to ship.
 */
export const DISPLAY =
  'font-family:Albert Sans,"Noto Sans KR",sans-serif;font-weight:300;letter-spacing:-0.01em'

/** A number meant to be read as a reading rather than as text. */
export const NUMERAL = 'font-family:Albert Sans,sans-serif;font-weight:200;line-height:1'

/** The primary action: filled, square, quiet. */
export const BTN =
  'cursor:pointer;background:var(--ink);color:var(--on-dark);border-radius:3px;padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em'

/** The secondary action, the same size so a pair of them sits level. */
export const BTN_GHOST =
  'cursor:pointer;border:1px solid var(--ink);color:var(--ink);border-radius:3px;padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em'
