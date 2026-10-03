import { useEffect, useRef, useState } from 'react'
import { WORDMARK } from '../data/brand'

/**
 * The launch splash: the name settles, a rule draws under it, the line beneath
 * fades up. One gesture, about a second.
 *
 * It says what the app is before the app has finished loading, which is the
 * only excuse a splash screen ever has. So it is tied to the loading it covers
 * rather than run on a fixed timer: it leaves the moment the session and the
 * catalogue are both in, once the sequence has had time to land.
 *
 * The styling lives in src/styles/global.css — keyframes and a reduced-motion
 * query cannot be expressed as inline styles, which is how the rest of this app
 * is written.
 */

/**
 * The shortest the splash is ever shown.
 *
 * It is the end of the sequence and not a round number pulled out of the air:
 * the tagline is the last thing to arrive, at 560ms, and it takes 520ms to
 * settle. Cutting before that plays a reveal and then hides the thing being
 * revealed, which is the one failure a brand intro cannot have.
 *
 *   name     0   → 760
 *   rule     420 → 1,040
 *   tagline  560 → 1,080   ← last to land
 */
const BRAND_MS = 1080

/**
 * The ceiling. If loading has not finished by here the splash leaves anyway:
 * the app has its own loading states and can say what it is waiting for, which
 * a logo cannot. A splash that outlives its animation is a locked screen.
 */
const TOTAL_MS = 2400

/** How long the hand-off fade takes. Matches the `transition` on `.splash`. */
const FADE_MS = 320

/**
 * Reduced motion gets a much shorter floor, and misses nothing by it: with the
 * animation off the whole lockup is on screen from the first frame, so there is
 * no reveal left to wait for — only a delay.
 */
const MIN_MS_STILL = 450

const prefersStill = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The `--t` multiplier the stylesheet is scaling every duration by.
 *
 * Read off the element rather than hard-coded, so overriding `--t` in devtools
 * — the documented way to slow this down and check it frame by frame — slows
 * the dismissal with it. Otherwise the splash would leave on schedule while the
 * animation was a third of the way through, and QA would be inspecting a
 * sequence nobody ever sees.
 */
function timeScale(el: HTMLElement | null): number {
  if (!el) return 1
  const raw = Number.parseFloat(getComputedStyle(el).getPropertyValue('--t'))
  return Number.isFinite(raw) && raw > 0 ? raw : 1
}

export function Splash({ ready }: { ready: boolean }) {
  const [gone, setGone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const startedAt = useRef(Date.now())
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gone) return

    const scale = timeScale(root.current)
    const floor = (prefersStill() ? MIN_MS_STILL : BRAND_MS) * scale
    const elapsed = Date.now() - startedAt.current
    // Wait out the floor, then go as soon as the app is ready — but never hold
    // past the ceiling, whatever loading is still doing.
    const waitFor = ready
      ? Math.max(0, floor - elapsed)
      : Math.max(0, TOTAL_MS * scale - elapsed)

    const leave = setTimeout(() => setLeaving(true), waitFor)
    return () => clearTimeout(leave)
  }, [ready, gone])

  useEffect(() => {
    if (!leaving) return
    const done = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(done)
  }, [leaving])

  if (gone) return null

  return (
    <div
      ref={root}
      className={`splash${leaving ? ' leaving' : ''}`}
      role="status"
      aria-label={WORDMARK}
      // Nothing here is interactive, and during the fade the app beneath is
      // already live — clicks should reach it rather than land on a ghost.
      style={leaving ? { pointerEvents: 'none' } : undefined}
    >
      {/* The name is on the wrapper's label, so a screen reader hears it once
          rather than hearing the wordmark and the tagline as two things. */}
      <div className="splash-brand" aria-hidden="true">
        <div className="splash-logotype">{WORDMARK}</div>
        <div className="splash-rule" />
        <p className="splash-tagline">K-Beauty · AI Skin Lab</p>
      </div>
    </div>
  )
}
