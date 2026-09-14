import { useState } from 'react'
import { concernOf, type ConcernDef } from '../analysis/concerns'
import type { AnalysisVisuals } from '../analysis/perfectcorp'
import type { Lang } from '../data/types'
import { s } from '../lib/css'

/**
 * The analysis drawn on the customer's own face.
 *
 * The engine returns a detection mask per concern — a transparent PNG aligned
 * to the photo it analysed — and a resized copy of that photo. Scores in a bar
 * chart ask the customer to take our word for it; the same scores laid over
 * their own skin, where they can see the pores that were counted, do not.
 *
 * The masks line up with the vendor's resized copy rather than the file we
 * uploaded, because they downscale anything past 2560px and draw against the
 * result. Using the original as the base would leave every overlay subtly off.
 */

export interface SkinMapStrings {
  title: string
  sub: string
  none: string
  expires: string
}

export interface SkinMapProps {
  visuals: AnalysisVisuals
  lang: Lang
  t: SkinMapStrings
}

/** Overlay tint per concern group, so the legend colour means something. */
const TINTS: Record<string, string> = {
  hydration: '#3E8FB0',
  texture: '#2E6B58',
  tone: '#B08133',
  firmness: '#7A5EA8',
  eyes: '#C25E43',
}

interface Layer {
  key: string
  def: ConcernDef
  region: string
  score: number
  mask: string
}

export function SkinMap({ visuals, lang, t }: SkinMapProps) {
  // Only whole-face readings carry a usable overlay for a single view; the
  // per-region ones (nose, forehead, cheek) repeat the same picture zoomed to
  // a patch, which reads as a duplicate rather than as more information.
  const layers: Layer[] = visuals.concerns
    .filter((c) => c.region === 'whole' && c.masks.length > 0)
    .map((c) => {
      const def = concernOf(c.key)
      return def ? { key: c.key, def, region: c.region, score: c.score, mask: c.masks[0] } : null
    })
    .filter((layer): layer is Layer => layer !== null)

  // Open on whatever scored worst — the thing they most need to see.
  const worst = layers.reduce<Layer | null>(
    (low, layer) => (!low || layer.score < low.score ? layer : low),
    null,
  )
  const [active, setActive] = useState<string | null>(worst?.key ?? null)
  const [failed, setFailed] = useState(false)

  if (!visuals.photo || layers.length === 0 || failed) {
    return (
      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:12px;font-size:12.5px;color:#8A7D6C;line-height:1.5')}>
        {t.none}
      </div>
    )
  }

  const shown = layers.find((layer) => layer.key === active) ?? null

  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:12px')}>
      <div style={s('font-family:Marcellus,serif;font-size:16px')}>{t.title}</div>
      <div style={s('font-size:11.5px;color:#A2957F;margin-top:2px;margin-bottom:12px')}>{t.sub}</div>

      <div style={s('position:relative;width:100%;border-radius:14px;overflow:hidden;background:#EDE6D8')}>
        <img
          src={visuals.photo}
          alt=""
          onError={() => setFailed(true)}
          style={s('display:block;width:100%;height:auto')}
        />
        {shown && (
          <img
            key={shown.key}
            src={shown.mask}
            alt=""
            style={s(
              'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;' +
                'mix-blend-mode:multiply;animation:rise .25s ease both',
            )}
          />
        )}
      </div>

      {/* Tapping a concern swaps the overlay. One at a time on purpose: three
          masks stacked over a face is a smear, not a finding. */}
      <div style={s('display:flex;flex-wrap:wrap;gap:6px;margin-top:12px')}>
        {layers.map((layer) => {
          const on = layer.key === active
          const tint = TINTS[layer.def.group] ?? '#4A4234'
          return (
            <div
              key={layer.key}
              onClick={() => setActive(on ? null : layer.key)}
              style={s(
                'cursor:pointer;border-radius:999px;padding:6px 11px;font-size:11.5px;font-weight:600;' +
                  'display:flex;align-items:center;gap:5px;white-space:nowrap;' +
                  (on
                    ? `background:${tint};color:#FFFFFF;border:1px solid ${tint}`
                    : 'background:#F8F5EF;color:#4A4234;border:1px solid #E2DACA'),
              )}
            >
              <span>{layer.def.name[lang]}</span>
              <span style={s('opacity:0.75;font-weight:700')}>{layer.score}</span>
            </div>
          )
        })}
      </div>

      {shown && (
        <div style={s('margin-top:12px;background:#F8F5EF;border-radius:12px;padding:12px 14px')}>
          <div style={s('font-size:12.5px;line-height:1.6;color:#4A4234')}>
            {shown.def.means[lang]}
          </div>
          {shown.score < 70 && (
            <div style={s('font-size:12.5px;line-height:1.6;color:#2C4A3E;margin-top:8px;padding-top:8px;border-top:1px solid #E7E1D4')}>
              {shown.def.low[lang]}
            </div>
          )}
        </div>
      )}

      <div style={s('font-size:10.5px;color:#B9AC93;margin-top:10px;line-height:1.5')}>
        {t.expires}
      </div>
    </div>
  )
}
