/**
 * Bot protection for the paths that cost money.
 *
 * Every new member gets a free AI analysis each day, and every analysis spends
 * the operator's prepaid Perfect Corp units — real cash. Without a challenge in
 * front of signup, a script that can create ten thousand accounts can spend ten
 * thousand analyses, and the bill arrives before anyone notices the accounts.
 *
 * Cloudflare Turnstile rather than reCAPTCHA: it is free at this volume, it
 * does not make customers identify traffic lights, and Supabase Auth verifies
 * the token server-side so a forged one is refused where it matters. The
 * browser only ever holds the site key, which is public by design; the secret
 * lives in the Supabase dashboard and never touches this repository.
 */

/**
 * Public, and meant to be. Turnstile site keys are read from the page source by
 * anyone who looks — the secret half is what proves the token, and that is
 * configured in Supabase.
 */
export const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

/**
 * Whether to show a challenge at all.
 *
 * Deliberately off until a key is configured. The alternative — refusing every
 * signup when the key is missing — would turn a forgotten environment variable
 * into a silent outage of the only way to get customers, which is a far worse
 * failure than the one this is defending against.
 *
 * Supabase enforces the other half: once CAPTCHA is switched on in the
 * dashboard, Auth rejects any signup arriving without a valid token, whatever
 * this flag says. The two must be turned on together.
 */
export const captchaEnabled = SITE_KEY.length > 0

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loading: Promise<void> | null = null

/**
 * Load the Turnstile script once, however many widgets ask for it.
 *
 * Note for anyone changing the Content-Security-Policy: this needs
 * `challenges.cloudflare.com` in both `script-src` and `frame-src`. Drop either
 * and the widget never appears — and because the form still submits, signup
 * simply starts failing with a captcha error nobody can see the cause of.
 */
export function loadCaptchaScript(): Promise<void> {
  if (!captchaEnabled) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') return resolve()

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      if (window.turnstile) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('turnstile-blocked')))
      return
    }

    const tag = document.createElement('script')
    tag.src = SCRIPT_SRC
    tag.async = true
    tag.defer = true
    tag.onload = () => resolve()
    tag.onerror = () => {
      // Reset so a later attempt can retry rather than inheriting the failure.
      loading = null
      reject(new Error('turnstile-blocked'))
    }
    document.head.appendChild(tag)
  })

  return loading
}

/** The slice of the Turnstile API this app uses. */
export interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
      theme?: 'light' | 'dark' | 'auto'
      size?: 'normal' | 'compact' | 'flexible'
    },
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}
