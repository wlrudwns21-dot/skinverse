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

/**
 * A section label.
 *
 * It was 9px of --ink-3 tracked out to 0.26em, which is a whisper — and it
 * was the only thing marking where one section ended and the next began, on
 * screens that are otherwise an unbroken column. Read at arm's length it was
 * texture, not structure.
 *
 * Still small, still tracked, still not a heading size: the change is weight
 * and rank, which is what makes it scan as a label rather than as more body
 * text. Tracking comes in a little because tracking that wide stops being
 * legible once the type has weight.
 */
export const KICKER =
  'font-size:10.5px;letter-spacing:0.17em;text-transform:uppercase;color:var(--ink-2);font-weight:600'

/** The "see all" partner to a KICKER, on the opposite end of the same row. */
export const MORE =
  'cursor:pointer;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--link);font-weight:500'

/** The hairline that separates one block from the next. */
export const RULE = 'height:1px;background:var(--line)'

/**
 * A card: the white ground a section sits on.
 *
 * This is the piece the design was missing. Sixty-one places already drew
 * themselves on --surface, but --surface and the page were a step apart, so
 * nothing looked contained and every screen read as one long column. With the
 * page ground dropped, this is all it takes to make a block a block.
 *
 * No border. The shadow does that job and keeps doing it where a border would
 * start to look drawn-on — against a photograph, at the edge of the frame.
 */
export const CARD = 'background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow-card)'

/** The same, with the padding a card almost always wants. */
export const CARD_PAD = `${CARD};padding:18px`

/**
 * The gap between one section and the next.
 *
 * Sections used to be separated by the same 14–18px that separates two lines
 * inside one of them, which is the other half of why nothing looked grouped:
 * proximity was saying everything belonged together. A section break is more
 * than twice an internal one now, so the grouping is legible before a single
 * word is read.
 */
export const SECTION = 'margin-top:26px'

/** A divider inside a card, between two rows of the same list. */
export const DIVIDER = 'height:1px;background:var(--line);margin:0'

/** A KICKER over a photograph or a panel. Inside a banner it takes that
    banner's own secondary colour; elsewhere it falls back to the panel's. */
export const EYEBROW =
  'font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:var(--banner-ink-2, var(--on-panel-2))'

/**
 * The display face: light, tight, and with Hangul that actually renders —
 * Marcellus has no Hangul glyphs, so a Korean heading set in it falls back to
 * whatever serif the device happens to ship.
 */
export const DISPLAY =
  'font-family:Albert Sans,"Noto Sans KR",sans-serif;font-weight:300;letter-spacing:-0.01em'

/** A number meant to be read as a reading rather than as text. */
export const NUMERAL = 'font-family:Albert Sans,sans-serif;font-weight:200;line-height:1'

/** The primary action: filled, dark, the one thing on a screen that shouts. */
export const BTN =
  'cursor:pointer;background:var(--accent);color:var(--on-accent);border-radius:var(--radius-sm);padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em'

/** The secondary action, the same size so a pair of them sits level. */
export const BTN_GHOST =
  'cursor:pointer;border:1px solid var(--line-2);color:var(--link);border-radius:var(--radius-sm);padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em'
