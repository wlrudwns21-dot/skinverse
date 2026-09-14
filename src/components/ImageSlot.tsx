import { useCallback, useEffect, useRef, useState } from 'react'
import { s } from '../lib/css'

/**
 * The user-fillable image placeholder from `project/image-slot.js`, reduced to
 * the part that is product behaviour rather than design-tool tooling.
 *
 * Kept: the empty state (icon + caption + "browse files"), click-to-pick,
 * drag-and-drop with the drop highlight, the `mask` clip-path, and cover fit.
 * Dropped: reframe handles, Unsplash credits/attribution errors, the canvas
 * re-encode and the design canvas's sidecar persistence — all of which exist to
 * serve the editor, not the shopper taking a selfie.
 */
export interface ImageSlotProps {
  /** Any CSS clip-path value, e.g. `ellipse(50% 50% at 50% 50%)`. */
  mask?: string
  /** Corner radius used when no `mask` is given. */
  radius?: number
  placeholder?: string
  /** Secondary line under the caption. */
  browseLabel?: string
  fit?: 'cover' | 'contain'
  onChange?: (file: File | null) => void
  /**
   * The image to show, when the owner holds it — a photo just taken with the
   * camera, for instance. Passing this makes the slot controlled: it stops
   * keeping its own copy and draws whatever it is given.
   */
  value?: File | null
}

const DROP_ACCENT = '#c96442'

export function ImageSlot({
  mask,
  radius = 12,
  placeholder = 'Drop an image',
  browseLabel,
  fit = 'cover',
  onChange,
  value,
}: ImageSlotProps) {
  const controlled = value !== undefined

  const inputRef = useRef<HTMLInputElement>(null)
  const [own, setOwn] = useState<File | null>(null)
  const [over, setOver] = useState(false)

  const file = controlled ? value : own

  // One object URL per file, released as soon as the file changes or the slot
  // goes away — a leaked blob URL pins the whole image in memory.
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  const accept = useCallback(
    (picked: File | null | undefined) => {
      if (!picked || !picked.type.startsWith('image/')) return
      if (!controlled) setOwn(picked)
      onChange?.(picked)
    },
    [controlled, onChange],
  )

  const frameStyle = s(
    'position:absolute;inset:0;overflow:hidden;background:rgba(127,127,127,.08);cursor:pointer;' +
      (mask ? `clip-path:${mask}` : `border-radius:${radius}px`) +
      (over ? `;outline:2px solid ${DROP_ACCENT};outline-offset:-2px;background:rgba(201,100,66,.10)` : ''),
  )

  return (
    <div style={s('display:block;position:relative;width:100%;height:100%;font:13px/1.3 system-ui,-apple-system,sans-serif;color:inherit')}>
      <div
        style={frameStyle}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          accept(e.dataTransfer.files?.[0])
        }}
      >
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            style={s(`position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};user-select:none`)}
          />
        ) : (
          <div style={s('position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;user-select:none')}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={s('opacity:.45')}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <div style={s('max-width:90%;font-weight:500;letter-spacing:.01em;opacity:.75')}>{placeholder}</div>
            {browseLabel ? (
              <div style={s('font-size:11px;opacity:.75')}>
                <u style={s('text-underline-offset:2px')}>{browseLabel}</u>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={s('display:none')}
        onChange={(e) => {
          accept(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
