import { useState, type ReactNode } from 'react'
import { s } from '../lib/css'

/**
 * Which way round the text over the photograph runs.
 *
 * `dark` lays a dark gradient over the bottom and sets the text in white. It
 * works over anything, including a photograph nobody has seen yet, so it is
 * the default.
 *
 * `light` lays a pale gradient instead and sets the text in ink. It is for a
 * photograph whose lower third is pale and empty — which the image brief
 * already asks for, since that is where the text goes. On those photographs
 * the dark gradient turns a clean cream background into a grey bruise, and
 * loses the thing that made the picture worth taking.
 */
export type BannerTone = 'dark' | 'light'

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
  /** See {@link BannerTone}. Defaults to `dark`, which is safe over anything. */
  tone?: BannerTone
  /** A heavier dark scrim, for a `dark` banner over a mostly-light photograph. */
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
 * The scrim is not decoration. Text over an uncontrolled photograph is
 * unreadable the moment the photograph moves the other way in tone, and the
 * alternative — picking a text colour per image by eye — means the layout
 * breaks silently whenever a photograph is swapped. A fixed gradient makes the
 * text survive, so the person supplying photographs only has to keep the
 * subject out of the lower third.
 */
export function PhotoBanner({
  src,
  ratio,
  tint = 'var(--surface-2)',
  slot,
  tone = 'dark',
  deep = false,
  onClick,
  children,
}: PhotoBannerProps) {
  // A missing or broken file falls back to the placeholder rather than the
  // browser's broken-image glyph, which would read as a bug rather than as a
  // photograph that has not been taken yet.
  const [broken, setBroken] = useState(false)
  const showPhoto = Boolean(src) && !broken
  const light = tone === 'light'

  // While there is no photograph, a light banner has nothing pale to sit on,
  // so it falls back to the dark treatment rather than putting ink on ink.
  const placeheld = !showPhoto && Boolean(children)
  const onPale = light && !placeheld

  const ground = placeheld ? 'var(--ink-2)' : tint
  const scrim = onPale ? '--scrim-light' : deep ? '--scrim-dark' : '--scrim'
  const ink = onPale ? 'var(--ink)' : 'var(--on-dark)'
  const ink2 = onPale ? 'var(--ink-3)' : 'var(--on-dark-2)'
  const warn = onPale ? 'var(--warn)' : 'var(--warn-on-dark)'

  return (
    <div
      onClick={onClick}
      style={s(
        `position:relative;width:100%;aspect-ratio:${ratio};background:${ground};overflow:hidden` +
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
        <span style={s(`position:absolute;top:13px;right:16px;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:${placeheld ? 'var(--on-dark-2)' : 'var(--ink-3)'}`)}>
          {slot}
        </span>
      )}
      {/* Only where there is text to protect. A scrim over an empty banner is
          just a bruise along the bottom edge. */}
      {children && (
        <div style={s(`position:absolute;left:0;right:0;bottom:0;height:78%;background:var(${scrim})`)} />
      )}
      {children && (
        /* The two text colours are handed down as custom properties rather
           than threaded through every caller, so a banner's contents are
           written once and read correctly whichever way the tone runs. */
        <div style={s(`position:absolute;left:20px;right:20px;bottom:20px;--banner-ink:${ink};--banner-ink-2:${ink2};--banner-warn:${warn}`)}>
          {children}
        </div>
      )}
    </div>
  )
}
