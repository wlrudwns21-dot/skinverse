import { useState } from 'react'
import { shippingCountries } from '../data/cities'
import { s } from '../lib/css'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../store/StoreContext'

const field =
  'width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:12px;padding:12px 14px;font-size:14px;background:#FFFFFF;outline:none'
const label = 'font-size:11px;font-weight:700;color:#6E6252;letter-spacing:0.06em;margin-bottom:5px'

/** Supabase reports failures as English prose; map the ones users actually hit. */
function translateError(raw: string, a: ReturnType<typeof useStore>['a']): string {
  const m = raw.toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) return a.errEmailTaken
  if (m.includes('invalid login')) return a.errCredentials
  if (m.includes('password')) return a.errPassword
  if (m.includes('email')) return a.errEmail
  if (m === 'not-configured') return a.errNotConfigured
  return a.errNetwork
}

export function Auth() {
  const st = useStore()
  const auth = useAuth()
  const a = st.a

  const isSignUp = st.state.authMode === 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [country, setCountry] = useState(st.state.country)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const submit = async () => {
    setError('')

    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(a.errEmail)
    if (password.length < 8) return setError(a.errPassword)
    if (isSignUp) {
      if (!name.trim()) return setError(a.errName)
      if (password !== confirm) return setError(a.errPasswordMatch)
    }

    setBusy(true)
    const res = isSignUp
      ? await auth.signUp({
          email,
          password,
          name: name.trim(),
          language: st.lang,
          country,
          city: st.state.city,
        })
      : await auth.signIn(email, password)
    setBusy(false)

    if (!res.ok) return setError(translateError(res.error ?? '', a))
    // Email confirmation is on: tell them to go check, rather than silently
    // leaving them signed out.
    if (res.needsEmailConfirm) return setSentTo(email)
    st.leaveAuth()
  }

  if (sentTo) {
    return (
      <div style={s('padding:40px 20px;text-align:center;animation:rise .4s ease both')}>
        <div style={s('width:64px;height:64px;border-radius:50%;background:#EAF1EC;color:#2E6B58;font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto')}>✉</div>
        <div style={s('font-family:Marcellus,serif;font-size:22px;margin-top:16px')}>{a.checkEmail}</div>
        <div style={s('font-size:13px;color:#8A7D6C;margin-top:8px;line-height:1.6')}>{a.checkEmailSub(sentTo)}</div>
        <div onClick={st.leaveAuth} style={s('cursor:pointer;margin-top:22px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:14px;font-size:13px;font-weight:700')}>
          {a.gotIt}
        </div>
      </div>
    )
  }

  return (
    <div style={s('padding:24px 20px;animation:rise .4s ease both')}>
      <div onClick={st.leaveAuth} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:12px')}>{a.back}</div>

      <div style={s('font-family:Marcellus,serif;font-size:24px')}>{isSignUp ? a.signUpTitle : a.logInTitle}</div>
      <div style={s('font-size:13px;color:#8A7D6C;margin-top:4px;line-height:1.5')}>{isSignUp ? a.signUpSub : a.logInSub}</div>

      {isSignUp && (
        <div style={s('background:#EAF1EC;border-radius:14px;padding:14px 16px;margin-top:16px;display:flex;flex-direction:column;gap:8px')}>
          {a.memberBenefits.map((b) => (
            <div key={b} style={s('display:flex;gap:10px;font-size:12.5px;color:#2C4A3E;line-height:1.4')}>
              <span style={s('color:#2E6B58;font-weight:700;flex-shrink:0')}>✓</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:18px')}>
        {isSignUp && (
          <div>
            <div style={s(label)}>{a.name}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={a.namePlaceholder} style={s(field)} />
          </div>
        )}

        <div>
          <div style={s(label)}>{a.email}</div>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={s(field)}
          />
        </div>

        <div>
          <div style={s(label)}>{a.password}</div>
          <input
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={a.passwordHint}
            style={s(field)}
          />
        </div>

        {isSignUp && (
          <>
            <div>
              <div style={s(label)}>{a.passwordConfirm}</div>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={s(field)}
              />
            </div>
            <div>
              <div style={s(label)}>{st.t.country}</div>
              <select value={country} onChange={(e) => setCountry(e.target.value)} style={s(field)}>
                {shippingCountries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={s('background:#FBE9E3;border:1px solid #EFCFC3;color:#A64B32;border-radius:12px;padding:11px 14px;margin-top:12px;font-size:12.5px;line-height:1.4')}>
          {error}
        </div>
      )}

      <div
        onClick={busy ? undefined : submit}
        style={s(`cursor:${busy ? 'default' : 'pointer'};margin-top:18px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700;opacity:${busy ? '.6' : '1'}`)}
      >
        {busy ? a.submitting : isSignUp ? a.signUp : a.logIn}
      </div>

      <div style={s('text-align:center;font-size:12.5px;color:#8A7D6C;margin-top:16px')}>
        {isSignUp ? a.hasAccount : a.noAccount}{' '}
        <span
          onClick={() => {
            setError('')
            st.goAuth(isSignUp ? 'login' : 'signup')
          }}
          style={s('cursor:pointer;color:#2E6B58;font-weight:700;text-decoration:underline')}
        >
          {isSignUp ? a.logIn : a.signUp}
        </span>
      </div>
    </div>
  )
}
