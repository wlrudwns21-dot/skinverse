import { useState } from 'react'
import { detailTiles, type DetailArt } from '../catalog/detailPages'
import { s } from '../lib/css'
import type { Lang } from '../data/types'

/** The artwork runs to 18,000px. This is how much is shown before asking. */
const PREVIEW_H = 820

const LABEL: Record<Lang, { open: string; close: string }> = {
  ko: { open: '상세 정보 펼쳐보기', close: '접기' },
  en: { open: 'Show the full page', close: 'Collapse' },
  zh: { open: '展开详情', close: '收起' },
  th: { open: 'ดูรายละเอียดทั้งหมด', close: 'ย่อ' },
}

export interface DetailPageProps {
  id: string
  lang: Lang
  /** The maker's artwork dimensions, when they came from the database. */
  heights?: DetailArt
  /** For the alt text, so a screen reader says which product's page this is. */
  name: string
}

/**
 * The maker's own detail page, under everything we wrote ourselves.
 *
 * It goes last and starts collapsed because it is a brand's marketing artwork:
 * worth having, not worth putting ahead of the ingredient analysis or the price.
 * Collapsed, it shows the top of the page fading out, which says what is behind
 * the button better than the button's own label can.
 *
 * Each tile carries its real width and height so the browser reserves the space
 * before the image arrives. Without that, a lazily-loaded tile landing above the
 * viewport shoves everything the customer is reading down the screen.
 */
export function DetailPage({ id, lang, heights, name }: DetailPageProps) {
  const [open, setOpen] = useState(false)
  const tiles = detailTiles(id, lang, heights)
  if (tiles.length === 0) return null

  const label = LABEL[lang]

  return (
    <div style={s('margin-top:4px')}>
      <div
        style={s(
          'position:relative;overflow:hidden;' + (open ? '' : `max-height:${PREVIEW_H}px`),
        )}
      >
        {/* Full-bleed: the artwork is typeset to its own margins, and a gutter
            around it would read as a second, competing frame. */}
        {(open ? tiles : tiles.slice(0, 1)).map((t, i) => (
          <img
            key={t.src}
            src={t.src}
            width={t.w}
            height={t.h}
            alt={i === 0 ? name : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            style={s('display:block;width:100%;height:auto')}
          />
        ))}
        {!open && (
          <div
            aria-hidden
            style={s(
              'position:absolute;left:0;right:0;bottom:0;height:200px;' +
                'background:linear-gradient(to bottom,transparent,var(--bg))',
            )}
          />
        )}
      </div>

      <div style={s('padding:0 20px')}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={s(
            'cursor:pointer;display:block;width:100%;margin-top:14px;' +
              'background:none;border:1px solid var(--line-2);border-radius:3px;' +
              'color:var(--ink);font:inherit;font-size:12px;font-weight:500;' +
              'letter-spacing:0.03em;padding:13px;text-align:center',
          )}
        >
          {open ? label.close : label.open}
        </button>
      </div>
    </div>
  )
}
