import { useEffect, useRef, useState } from 'react'
import { WORDMARK } from '../data/brand'

/**
 * The launch splash: a scan ring reads the skin, then collapses into the name.
 *
 * It says what the app is before the app has finished loading, which is the
 * only excuse a splash screen ever has. So it is tied to the loading it covers
 * rather than run on a fixed timer: the sequence is cut the moment the session
 * and the catalogue are both in, and the later phases are seen only by someone
 * who was going to be waiting anyway.
 *
 * The styling lives in src/styles/global.css — keyframes and a reduced-motion
 * query cannot be expressed as inline styles, which is how the rest of this app
 * is written.
 */

/**
 * The shortest the splash is ever shown: long enough to have seen the name.
 *
 * This was 1,600ms, taken from the study's "minimum exposure" note, and it was
 * wrong — the wordmark does not start rising until 1,880ms and the tagline
 * under it does not settle until 3,120ms. On any load that finished quickly
 * the splash played the scan rings and then cut before a single letter had
 * arrived: all setup, no payoff, which is the one thing a brand intro must not
 * do.
 *
 * So the floor is the end of the brand lockup. What the study means by cutting
 * early is skipping phase G — the progress bar from 2,700ms, which exists only
 * to occupy someone who is still waiting — and that is still skipped.
 *
 *   letters   1,880 → 2,800   (last of nine starts at 2,240, runs 560)
 *   rule      2,440 → 3,060
 *   tagline   2,600 → 3,120   ← the last thing to land
 */
const BRAND_MS = 3120

/**
 * The full sequence, and the ceiling.
 *
 * If loading has not finished by here the splash leaves anyway: the app has its
 * own loading states and can say what it is waiting for, which a logo cannot. A
 * splash that outlives its animation is just a locked screen.
 */
const TOTAL_MS = 3520

/** How long the hand-off fade takes. Matches the `transition` on `.splash`. */
const FADE_MS = 320

/**
 * Reduced motion gets a much shorter floor, and does not miss anything by it:
 * with the animation off the wordmark is on screen from the first frame, so
 * there is no reveal left to wait for — only a delay.
 */
const MIN_MS_STILL = 700

const prefersStill = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The `--t` multiplier the stylesheet is scaling every duration by.
 *
 * Read off the element rather than hard-coded, so overriding `--t` in devtools
 * — the documented way to slow this down and check it frame by frame — slows
 * the dismissal with it. Otherwise the splash would leave on schedule while
 * the animation was a third of the way through, and QA would be inspecting a
 * sequence nobody ever sees.
 */
function timeScale(el: HTMLElement | null): number {
  if (!el) return 1
  const raw = Number.parseFloat(getComputedStyle(el).getPropertyValue('--t'))
  return Number.isFinite(raw) && raw > 0 ? raw : 1
}

/** Each letter rises 45ms after the one before, starting at 1,880ms. */
const LETTER_START = 1880
const LETTER_STEP = 45

/** Where the seven measurement points sit, and when each lights up. */
const TICKS: { angle: number; delay: number; long: boolean }[] = [
  { angle: 0, delay: 900, long: true },
  { angle: 48, delay: 990, long: false },
  { angle: 96, delay: 1080, long: true },
  { angle: 150, delay: 1170, long: false },
  { angle: 204, delay: 1260, long: true },
  { angle: 258, delay: 1350, long: false },
  { angle: 312, delay: 1440, long: false },
]

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
    // past the end of the sequence, whatever loading is still doing.
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
      <div className="splash-inner">
        <div className="splash-layer" aria-hidden="true">
          <span className="splash-guide" style={{ '--d': '238px', '--gd': '120ms' } as React.CSSProperties} />
          <span className="splash-guide" style={{ '--d': '296px', '--gd': '220ms' } as React.CSSProperties} />
        </div>

        <div className="splash-layer" aria-hidden="true">
          <div className="splash-scan">
            <span className="splash-sweep" />
            <span className="splash-ring r1" style={{ '--d': '96px', '--rd': '380ms' } as React.CSSProperties} />
            <span className="splash-ring r2" style={{ '--d': '134px', '--rd': '500ms' } as React.CSSProperties} />
            <span className="splash-ring r3" style={{ '--d': '172px', '--rd': '620ms' } as React.CSSProperties} />
            <span className="splash-core" />
            {TICKS.map((tick) => (
              <i
                key={tick.angle}
                className={`splash-tick${tick.long ? ' long' : ''}`}
                style={{ '--a': `${tick.angle}deg`, '--td': `${tick.delay}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        <div className="splash-layer">
          <div className="splash-brand">
            {/* One span per letter so they can rise in sequence. The whole
                lockup is labelled on the wrapper, so screen readers hear the
                name once rather than nine separate letters. */}
            <div className="splash-logotype" aria-hidden="true">
              {WORDMARK.split('').map((letter, i) => (
                <span
                  key={`${letter}${i}`}
                  style={{ '--ld': `${LETTER_START + i * LETTER_STEP}ms` } as React.CSSProperties}
                >
                  {letter}
                </span>
              ))}
            </div>
            <div className="splash-rule" aria-hidden="true" />
            <p className="splash-tagline" aria-hidden="true">
              K-Beauty · AI Skin Lab
            </p>
          </div>
        </div>

        {/* Only ever seen on a slow load, which is exactly what it is for. */}
        <div className="splash-progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  )
}
