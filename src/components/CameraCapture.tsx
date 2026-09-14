import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { s } from '../lib/css'

/**
 * Take the selfie in the app instead of sending the customer to their photo roll.
 *
 * This is not a convenience. Perfect Corp rejects a photo whose face is under
 * 60% of the image width, or off-centre, or blurred by the hand that pressed the
 * button — and every rejected photo is a round trip and a failed scan. A live
 * preview with the target framing drawn on it is the only point in the flow
 * where any of that can still be fixed.
 *
 * Falls back cleanly: if there is no camera, or permission is refused, the
 * customer is told why and the file picker is still there.
 */

export interface CameraStrings {
  guide: string
  shutter: string
  cancel: string
  denied: string
  missing: string
  failed: string
  flip: string
  usePicker: string
}

export interface CameraCaptureProps {
  open: boolean
  onCapture: (file: File) => void
  onClose: () => void
  /** Offered when the camera cannot be opened at all. */
  onUsePicker: () => void
  t: CameraStrings
}

/**
 * Ask for a portrait frame comfortably above the HD floor of 1080 on the short
 * side. `ideal` rather than `exact` so a webcam that cannot do it still opens
 * at whatever it has, rather than failing outright.
 */
const CONSTRAINTS = (facing: 'user' | 'environment'): MediaStreamConstraints => ({
  video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
  audio: false,
})

/**
 * How long the shutter waits before it fires.
 *
 * Pressing a button while holding the phone at arm's length is exactly what
 * produces the motion blur their docs single out. Three seconds is enough to
 * steady the hand and look up.
 */
const COUNTDOWN_FROM = 3

/** The guide oval, as a share of the frame width. */
const GUIDE_WIDTH_PCT = 68

type Problem = 'denied' | 'missing' | 'failed'

export function CameraCapture({ open, onCapture, onClose, onUsePicker, t }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const [problem, setProblem] = useState<Problem | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [hasMultiple, setHasMultiple] = useState(false)
  const [counting, setCounting] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  /** Release the camera. Skipping this leaves the indicator light on. */
  const stop = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
      countdownTimer.current = null
    }
    setCounting(null)
    setReady(false)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (!open) {
      stop()
      return
    }

    let cancelled = false
    setProblem(null)

    void (async () => {
      // Served over HTTPS everywhere this ships, so getUserMedia is available;
      // an old browser without it gets the picker rather than a broken screen.
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem('missing')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS(facing))
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)

        // Only offer the flip control when there is something to flip to. Asking
        // for the device list before permission returns empty labels anyway, so
        // this runs after the stream is live.
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        if (!cancelled) {
          setHasMultiple(devices.filter((d) => d.kind === 'videoinput').length > 1)
        }
      } catch (err) {
        if (cancelled) return
        const name = (err as DOMException)?.name
        setProblem(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'denied'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'missing'
              : 'failed',
        )
      }
    })()

    return () => {
      cancelled = true
      stop()
    }
  }, [open, facing, stop])

  const grabFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Drawn unmirrored on purpose. The preview is mirrored because that is how
    // people expect to see themselves, but the analysis reports per-region
    // scores — a flipped image would swap the customer's cheeks.
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCapture(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }))
        onClose()
      },
      'image/jpeg',
      0.92,
    )
  }, [onCapture, onClose])

  const shoot = useCallback(() => {
    if (counting !== null || !ready) return
    setCounting(COUNTDOWN_FROM)
    countdownTimer.current = setInterval(() => {
      setCounting((n) => {
        if (n === null) return null
        if (n > 1) return n - 1
        if (countdownTimer.current) clearInterval(countdownTimer.current)
        countdownTimer.current = null
        grabFrame()
        return null
      })
    }, 1000)
  }, [counting, ready, grabFrame])

  if (!open) return null

  const message = problem === 'denied' ? t.denied : problem === 'missing' ? t.missing : t.failed

  /**
   * Rendered into `document.body`, not where it sits in the tree.
   *
   * Every screen animates in with `rise`, which leaves a transform on its root,
   * and a transformed ancestor becomes the containing block for `position:
   * fixed` — so in place this modal was confined to the scan screen's box, with
   * the header and tab bar still drawn over it. A portal is the only reliable
   * way out of both that and the surrounding stacking context.
   */
  return createPortal(
    <div style={s('position:fixed;inset:0;z-index:100;background:#12100D;display:flex;flex-direction:column')}>
      {problem ? (
        <div style={s('flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center')}>
          <div style={s('font-size:14px;line-height:1.6;color:#EDE6D8;max-width:300px')}>{message}</div>
          <div
            onClick={() => { onClose(); onUsePicker() }}
            style={s('cursor:pointer;background:#F5F0E6;color:#221C15;border-radius:999px;padding:13px 22px;font-size:13px;font-weight:700')}
          >
            {t.usePicker}
          </div>
          <div onClick={onClose} style={s('cursor:pointer;font-size:13px;color:#A2957F;text-decoration:underline')}>
            {t.cancel}
          </div>
        </div>
      ) : (
        <>
          <div style={s('position:relative;flex:1;overflow:hidden')}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={s(
                'position:absolute;inset:0;width:100%;height:100%;object-fit:cover' +
                  // Front camera is mirrored so moving left moves you left.
                  (facing === 'user' ? ';transform:scaleX(-1)' : ''),
              )}
            />

            {/* The target framing, drawn over the preview. Everything outside
                the oval is dimmed so the customer can see where to be. */}
            <div
              style={s(
                `position:absolute;inset:0;background:rgba(18,16,13,0.55);` +
                  `-webkit-mask:radial-gradient(ellipse ${GUIDE_WIDTH_PCT / 2}% 32% at 50% 44%,transparent 98%,#000 100%);` +
                  `mask:radial-gradient(ellipse ${GUIDE_WIDTH_PCT / 2}% 32% at 50% 44%,transparent 98%,#000 100%)`,
              )}
            />
            <div
              style={s(
                `position:absolute;left:${(100 - GUIDE_WIDTH_PCT) / 2}%;width:${GUIDE_WIDTH_PCT}%;` +
                  'top:12%;height:64%;border:2px dashed rgba(245,240,230,0.75);border-radius:50%;pointer-events:none',
              )}
            />

            {counting !== null && (
              <div style={s('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Marcellus,serif;font-size:96px;color:#F5F0E6;text-shadow:0 2px 24px rgba(0,0,0,0.6)')}>
                {counting}
              </div>
            )}

            <div style={s('position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:12.5px;color:#EDE6D8;padding:0 28px;line-height:1.5;text-shadow:0 1px 8px rgba(0,0,0,0.7)')}>
              {t.guide}
            </div>
          </div>

          <div style={s('flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 24px 26px;background:#12100D')}>
            <div
              onClick={onClose}
              style={s('cursor:pointer;font-size:13px;color:#A2957F;min-width:64px')}
            >
              {t.cancel}
            </div>

            <div
              onClick={shoot}
              aria-label={t.shutter}
              style={s(
                'cursor:pointer;width:68px;height:68px;border-radius:50%;background:#F5F0E6;' +
                  'border:4px solid rgba(245,240,230,0.35);box-sizing:border-box;flex-shrink:0' +
                  (ready && counting === null ? '' : ';opacity:0.45'),
              )}
            />

            <div
              onClick={() => hasMultiple && setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
              style={s(
                'cursor:pointer;font-size:13px;color:#A2957F;min-width:64px;text-align:right' +
                  (hasMultiple ? '' : ';visibility:hidden'),
              )}
            >
              {t.flip}
            </div>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
