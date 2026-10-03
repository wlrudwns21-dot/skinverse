import { useState } from 'react'
import { s } from '../lib/css'

export interface ProductShotProps {
  /** Path under `public/`, e.g. `/products/<id>/main.webp`. */
  src?: string
  /** CSS gradient painted when there is no photograph, or it fails to load. */
  grad: string
  /** Alt text. A product shot of a named product is not decoration. */
  alt: string
  onClick?: () => void
  /** Extra declarations appended to the frame, e.g. `max-height:430px`. */
  frame?: string
}

/**
 * The 4:5 frame every product photograph sits in.
 *
 * One component rather than three copies of the same `aspect-ratio` string,
 * because the shelf tile, the home shelf and the detail page have to agree on
 * the crop — a tile at 4:5 next to a detail shot at 1:1 makes the same bottle
 * look like two different products.
 *
 * A broken `src` falls back to the gradient instead of to the browser's broken
 * image glyph: a photograph that fails to load should look like a product
 * without a photograph, not like a bug.
 */
export function ProductShot({ src, grad, alt, onClick, frame = '' }: ProductShotProps) {
  const [broken, setBroken] = useState(false)
  const show = Boolean(src) && !broken

  return (
    <div
      onClick={onClick}
      style={s(
        `position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;background:${grad}` +
          (onClick ? ';cursor:pointer' : '') +
          (frame ? ';' + frame : ''),
      )}
    >
      {show && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
          style={s('position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block')}
        />
      )}
    </div>
  )
}
