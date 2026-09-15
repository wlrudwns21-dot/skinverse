/**
 * A refresh arrow, drawn rather than typed.
 *
 * This was `↻` (U+21BB) until it rendered as a tofu box: neither the app's
 * webfont nor the fallback carries that codepoint, and the fallback chain on a
 * Korean device is not something a store can test its way to confidence about.
 * An inline SVG has no font to miss it.
 *
 * `currentColor` so it takes the colour of whatever chip it sits in, and
 * `aria-hidden` because the label beside it already says what it does.
 */
export function RefreshIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Three quarters of a circle, so the gap reads as motion. */}
      <path d="M14 8a6 6 0 1 1-1.8-4.3" />
      <path d="M14 1.5V5h-3.5" />
    </svg>
  )
}
