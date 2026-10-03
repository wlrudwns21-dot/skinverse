import { useState, type ReactNode } from 'react'
import { s } from '../lib/css'

interface PhotoBannerProps {
  /**
   * Path under `public/`, e.g. `/banner/hero.webp`. Leave it off while the
   * photograph does not exist yet: the banner then draws its placeholder, and
   * the screen around it keeps its exact layout, so dropping the file in later
   * changes nothing but the picture.
   */
  src?: string
  /** `width/height`, written the same way the image brief states the ratio. */
  ratio: string
  /**
   * The ground the placeholder shows, and what sits behind a photograph while
   * it decodes. A tone close to the finished photograph stops the banner from
   * flashing a different colour on a slow connection.
   */
  tint?: string
  /**
   * Which slot this is, shown on the placeholder only — it is how you tell
   * which photograph is missing without counting banners down the screen.
   */
  slot?: string
  /** The deeper scrim, for photographs that are mostly light. */
  deep?: boolean
  /** Makes the whole banner the tap target. */
  onClick?: () => void
  /** Drawn over the scrim, bottom-left. */
  children?: ReactNode
}

/**
 * A photograph that runs to both edges of the screen, with text over the
 * bottom of it.
 *
 * The scrim is not decoration. White text over an uncontrolled photograph is
 * unreadable the moment the photograph is bright, and the alternative —
 * picking a text colour per image — means the layout breaks whenever a
 * photograph is swapped. A fixed dark gradient at the bottom makes white text
 * survive any image, so the person supplying photographs only has to keep the
 * subject out of the lower third.
 */
export function PhotoBanner({
  src,
  ratio,
  tint = 'var(--surface-2)',
  slot,
  deep = false,
  onClick,
  children,
}: PhotoBannerProps) {
  // A missing or broken file falls back to the placeholder rather than the
  // browser's broken-image glyph, which would read as a bug rather than as a
  // photograph that has not been taken yet.
  const [broken, setBroken] = useState(false)
  const showPhoto = Boolean(src) && !broken

  return (
    <div
      onClick={onClick}
      style={s(
        `position:relative;width:100%;aspect-ratio:${ratio};background:${tint};overflow:hidden` +
          (onClick ? ';cursor:pointer' : ''),
      )}
    >
      {showPhoto && (
        <img
          src={src}
          alt=""
          onError={() => setBroken(true)}
          style={s('display:block;width:100%;height:100%;object-fit:cover')}
        />
      )}
      {!showPhoto && slot && (
        <span style={s('position:absolute;top:13px;right:16px;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-4)')}>
          {slot}
        </span>
      )}
      {/* Only where there is text to protect. A scrim over an empty banner is
          just a bruise along the bottom edge. */}
      {children && (
        <div style={s(`position:absolute;left:0;right:0;bottom:0;height:78%;background:var(${deep ? '--scrim-dark' : '--scrim'})`)} />
      )}
      {children && (
        <div style={s('position:absolute;left:20px;right:20px;bottom:20px')}>{children}</div>
      )}
    </div>
  )
}
