import { useRef, useState } from 'react'
import { Captcha, type CaptchaHandle } from '../components/Captcha'
import { captchaEnabled } from '../auth/captcha'
import { s } from '../lib/css'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../store/StoreContext'

const field =
  'width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:12px;padding:12px 14px;font-size:14px;background:#FFFFFF;outline:none'
const label = 'font-size:11px;font-weight:700;color:#6E6252;letter-spacing:0.06em;margin-bottom:5px'
const primary =
  'margin-top:16px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700'
const disabled =
  'margin-top:16px;background:#EFE9DD;color:#B0A490;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700'

/**
 * Asking for a reset link.
 *
 * Note what this screen never says: whether the address has an account. The
 * outcome is identical either way, deliberately — otherwise the form becomes a
 * way of checking whether any given person shops here, and a customer who
 * mistyped their own address learns more from an empty inbox than from being
 * told which of their addresses is registered.
 */
export function PasswordReset() {
  const st = useStore()
  const auth = useAuth()
  const a = st.a

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [captcha, setCaptcha] = useState('')
  // Single-use token: a refused attempt has to clear the widget or the retry
  // sends one the server has already spent.
  const captchaRef = useRef<CaptchaHandle | null>(null)

  const submit = async () => {
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(a.errEmail)
    if (captchaEnabled && !captcha) return setError(a.errCaptcha)

    setBusy(true)
    const res = await auth.requestPasswordReset(email, captcha)
    setBusy(false)

    if (!res.ok) {
      captchaRef.current?.reset()
      return setError(a.errResetRate)
    }
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <div style={s('padding:40px 20px;text-align:center;animation:rise .4s ease both')}>
        <div style={s('width:64px;height:64px;border-radius:50%;background:#EAF1EC;color:#2E6B58;font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto')}>✉</div>
        <div style={s('font-family:Marcellus,serif;font-size:22px;margin-top:16px')}>{a.resetSentTitle}</div>
        <div style={s('font-size:13px;color:#8A7D6C;margin-top:8px;line-height:1.6')}>{a.resetSentSub(sentTo)}</div>
        <div onClick={st.goResetBack} style={s('cursor:pointer;' + primary)}>{a.gotIt}</div>
      </div>
    )
  }

  return (
    <div style={s('padding:24px 20px;animation:rise .4s ease both')}>
      <div onClick={st.goResetBack} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:12px')}>{a.back}</div>

      <div style={s('font-family:Marcellus,serif;font-size:24px')}>{a.resetTitle}</div>
      <div style={s('font-size:13px;color:#8A7D6C;margin-top:4px;line-height:1.5')}>{a.resetSub}</div>

      <div style={s('margin-top:18px')}>
        <div style={s(label)}>{a.email}</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          style={s(field)}
        />
      </div>

      {captchaEnabled && (
        <div style={s('margin-top:14px')}>
          <Captcha handleRef={captchaRef} onToken={setCaptcha} />
        </div>
      )}

      {error && (
        <div style={s('background:#FBE9E3;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:12.5px;color:#A64B32;line-height:1.5')}>
          {error}
        </div>
      )}

      <div onClick={() => void submit()} style={s(busy ? disabled : 'cursor:pointer;' + primary)}>
        {busy ? '…' : a.resetSend}
      </div>
    </div>
  )
}

/**
 * Choosing the new password, after the link in the email.
 *
 * Supabase has already signed this visitor in by the time they get here, which
 * is the part worth being careful about: they proved they can read an inbox,
 * not that they know the password. `auth.recovering` keeps them on this screen
 * until they set one, so an unattended phone does not become an open account.
 */
export function NewPassword() {
  const st = useStore()
  const auth = useAuth()
  const a = st.a

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError('')
    if (password.length < 8) return setError(a.errPassword)
    if (password !== confirm) return setError(a.errPasswordMatch)

    setBusy(true)
    const res = await auth.setNewPassword(password)
    setBusy(false)

    if (!res.ok) return setError(a.errNetwork)
    st.say(a.newPwDone)
    st.leaveAuth()
  }

  return (
    <div style={s('padding:24px 20px;animation:rise .4s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>{a.newPwTitle}</div>
      <div style={s('font-size:13px;color:#8A7D6C;margin-top:4px;line-height:1.5')}>{a.newPwSub}</div>

      <div style={s('margin-top:18px')}>
        <div style={s(label)}>{a.newPwField}</div>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          style={s(field)}
        />
      </div>

      <div style={s('margin-top:12px')}>
        <div style={s(label)}>{a.passwordConfirm}</div>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          type="password"
          autoComplete="new-password"
          style={s(field)}
        />
      </div>

      {error && (
        <div style={s('background:#FBE9E3;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:12.5px;color:#A64B32;line-height:1.5')}>
          {error}
        </div>
      )}

      <div onClick={() => void submit()} style={s(busy ? disabled : 'cursor:pointer;' + primary)}>
        {busy ? '…' : a.newPwSave}
      </div>

      {/*
        * The way out for somebody who did not ask for this.
        *
        * A reset link can reach a person who never requested one — that is
        * exactly the case the email warns about — and they must not be stuck
        * on a form demanding they change a password they never wanted changed.
        */}
      <div
        onClick={() => void auth.signOut()}
        style={s('cursor:pointer;margin-top:12px;text-align:center;font-size:12.5px;color:#8A7D6C;font-weight:600')}
      >
        {a.back}
      </div>
    </div>
  )
}
