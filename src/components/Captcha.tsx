import { useEffect, useRef, useState } from 'react'
import { captchaEnabled, loadCaptchaScript, SITE_KEY } from '../auth/captcha'
import { s } from '../lib/css'

export interface CaptchaHandle {
  /** Clear the widget so the next attempt gets a fresh token. */
  reset: () => void
}

interface Props {
  /** Fires with a token when solved, and with '' when it expires or fails. */
  onToken: (token: string) => void
  /** Set by the parent so it can reset the widget after a failed submit. */
  handleRef?: React.MutableRefObject<CaptchaHandle | null>
}

/**
 * The Turnstile widget, or nothing at all.
 *
 * Renders nothing when no site key is configured, so a project without CAPTCHA
 * set up behaves exactly as it did before rather than showing an empty box.
 */
export function Captcha({ onToken, handleRef }: Props) {
  const host = useRef<HTMLDivElement | null>(null)
  const widget = useRef<string | null>(null)
  const [blocked, setBlocked] = useState(false)

  // The callback is read through a ref so re-rendering the parent does not tear
  // down and re-render the widget — which would drop a token already solved.
  const notify = useRef(onToken)
  notify.current = onToken

  useEffect(() => {
    if (!captchaEnabled) return
    let dead = false

    void loadCaptchaScript()
      .then(() => {
        if (dead || !host.current || !window.turnstile) return
        widget.current = window.turnstile.render(host.current, {
          sitekey: SITE_KEY,
          callback: (token) => notify.current(token),
          // A token is single-use and short-lived. Both of these mean "what you
          // hold is no longer valid", so the parent is told to forget it.
          'expired-callback': () => notify.current(''),
          'error-callback': () => notify.current(''),
          theme: 'light',
          size: 'flexible',
        })
      })
      .catch(() => {
        if (!dead) setBlocked(true)
      })

    return () => {
      dead = true
      if (widget.current && window.turnstile) {
        try {
          window.turnstile.remove(widget.current)
        } catch {
          /* Already gone with the page. */
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!handleRef) return
    handleRef.current = {
      reset: () => {
        notify.current('')
        if (widget.current && window.turnstile) {
          try {
            window.turnstile.reset(widget.current)
          } catch {
            /* Nothing to reset. */
          }
        }
      },
    }
    return () => {
      handleRef.current = null
    }
  }, [handleRef])

  if (!captchaEnabled) return null

  // An ad blocker or a locked-down network can stop the script loading. Saying
  // so beats an invisible widget and a form that refuses without explanation.
  if (blocked) {
    return (
      <div style={s('background:#FBE9E3;border:1px solid #EFCFC3;color:#A64B32;border-radius:12px;padding:11px 14px;font-size:12px;line-height:1.5')}>
        보안 확인을 불러오지 못했습니다. 광고 차단 프로그램을 끄거나 다른 네트워크에서 다시
        시도해주세요.
      </div>
    )
  }

  return <div ref={host} style={s('min-height:65px')} />
}
