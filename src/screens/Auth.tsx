import { useRef, useState } from 'react'
import { shippingCountries } from '../data/cities'
import {
  dialCodeFor,
  dialCodes,
  dialKey,
  genders,
  isBirthDate,
  isCustomsCode,
  isPhone,
  normaliseCustomsCode,
  normalisePhone,
} from '../data/signup'
import { Captcha, type CaptchaHandle } from '../components/Captcha'
import { captchaEnabled } from '../auth/captcha'
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
  // Preselected from the country they already chose, so the common case is
  // already right and the dropdown is there for the exception.
  const [phoneCc, setPhoneCc] = useState(() => dialCodeFor(st.state.country))
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [postal, setPostal] = useState('')
  const [gender, setGender] = useState('undisclosed')
  const [birth, setBirth] = useState('')
  const [customs, setCustoms] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [captcha, setCaptcha] = useState('')
  // A Turnstile token is single-use, so a refused attempt must clear the widget
  // — otherwise the second try sends a token the server has already spent.
  const captchaRef = useRef<CaptchaHandle | null>(null)

  const submit = async () => {
    setError('')

    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(a.errEmail)
    if (password.length < 8) return setError(a.errPassword)
    if (isSignUp) {
      if (!name.trim()) return setError(a.errName)
      if (password !== confirm) return setError(a.errPasswordMatch)
      if (!isPhone(phone)) return setError(a.errPhone)
      if (!isBirthDate(birth, new Date())) return setError(a.errBirthDate)
      if (!address.trim()) return setError(a.errAddress)
      // The only optional field, and the only one checked just for shape: an
      // empty customs code is valid, a malformed one is a typo worth catching
      // now rather than at the customs desk.
      if (!isCustomsCode(customs)) return setError(a.errCustomsCode)
    }
    // Checked last, so the form's own complaints come first — being told to
    // solve a puzzle and then that the address is missing is two trips.
    if (captchaEnabled && !captcha) return setError(a.errCaptcha)

    setBusy(true)
    const res = isSignUp
      ? await auth.signUp({
          email,
          password,
          name: name.trim(),
          language: st.lang,
          country,
          city: st.state.city,
          phoneCc,
          phone: normalisePhone(phone),
          address: address.trim(),
          postalCode: postal.trim(),
          gender,
          birthDate: birth,
          customsCode: normaliseCustomsCode(customs),
          captchaToken: captcha,
        })
      : await auth.signIn(email, password, captcha)
    setBusy(false)

    if (!res.ok) {
      // The token is spent whether or not the attempt succeeded.
      captchaRef.current?.reset()
      return setError(translateError(res.error ?? '', a))
    }
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
            placeholder={isSignUp ? a.passwordHint : undefined}
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
              <div style={s(label)}>{a.birthDate}</div>
              <input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                style={s(field)}
              />
            </div>

            <div>
              <div style={s(label)}>{a.gender}</div>
              <div style={s('display:flex;gap:6px;flex-wrap:wrap')}>
                {genders.map((g) => {
                  const on = gender === g.key
                  return (
                    <div
                      key={g.key}
                      onClick={() => setGender(g.key)}
                      style={s(
                        'cursor:pointer;flex:1;min-width:70px;text-align:center;border-radius:10px;padding:10px 6px;font-size:12.5px;font-weight:600;' +
                          (on
                            ? 'background:#221C15;color:#F5F0E6'
                            : 'background:#FFFFFF;border:1px solid #D8CFBF;color:#6E6252'),
                      )}
                    >
                      {g.label[st.lang]}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Everything below is for getting a parcel to them. Grouped and
                labelled as such so it reads as one purpose rather than five
                more questions. */}
            <div style={s('border-top:1px solid #ECE6DA;margin-top:6px;padding-top:14px')}>
              <div style={s('font-size:13px;font-weight:700;color:#4A4234')}>{a.deliveryTitle}</div>
              <div style={s('font-size:11.5px;color:#A2957F;line-height:1.5;margin-top:3px')}>
                {a.deliveryHint}
              </div>
            </div>

            <div>
              <div style={s(label)}>{a.phone}</div>
              <div style={s('display:flex;gap:8px')}>
                {/* The code is a country choice, not something to be typed
                    wrong — a number without it cannot be dialled from abroad,
                    and this store ships to thirty countries. */}
                <select
                  value={phoneCc}
                  onChange={(e) => setPhoneCc(e.target.value)}
                  aria-label={a.dialCode}
                  style={s(field + ';width:116px;flex-shrink:0;padding-inline:10px')}
                >
                  {dialCodes.map((d) => (
                    <option key={dialKey(d)} value={d.code}>
                      {d.code} {d.iso}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={a.phonePlaceholder}
                  style={s(field)}
                />
              </div>
            </div>

            <div>
              <div style={s(label)}>{st.t.country}</div>
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value)
                  // Follow the country unless they have already picked a code
                  // by hand — changing it under them would be worse than a
                  // stale default.
                  setPhoneCc((current) =>
                    current === dialCodeFor(country) ? dialCodeFor(e.target.value) : current,
                  )
                }}
                style={s(field)}
              >
                {shippingCountries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={s(label)}>{a.address}</div>
              <input
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={a.addressPlaceholder}
                style={s(field)}
              />
            </div>

            <div>
              <div style={s(label)}>{a.postalCode}</div>
              <input
                autoComplete="postal-code"
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
                placeholder={a.postalPlaceholder}
                style={s(field)}
              />
            </div>

            <div>
              <div style={s(label)}>
                {a.customsCode}
                <span style={s('color:#A2957F;font-weight:600')}> · {a.optional}</span>
              </div>
              <input
                value={customs}
                onChange={(e) => setCustoms(e.target.value)}
                placeholder={a.customsPlaceholder}
                style={s(field)}
              />
              <div style={s('font-size:11px;color:#A2957F;line-height:1.5;margin-top:5px')}>
                {a.customsHelp}
              </div>
            </div>
          </>
        )}
      </div>

      {captchaEnabled && (
        <div style={s('margin-top:14px')}>
          <Captcha onToken={setCaptcha} handleRef={captchaRef} />
        </div>
      )}

      {/* Shown at the point the data is actually handed over, not buried in a
          footer. The wording says what pressing the button means, which is the
          honest version of a pre-ticked consent box. */}
      {isSignUp && (
        <div style={s('font-size:11.5px;color:#8A7D6C;line-height:1.6;margin-top:14px;text-align:center')}>
          회원가입을 누르면{' '}
          <span
            onClick={() => st.goLegal('terms')}
            style={s('cursor:pointer;color:#2E6B58;font-weight:700;text-decoration:underline')}
          >
            이용약관
          </span>
          과{' '}
          <span
            onClick={() => st.goLegal('privacy')}
            style={s('cursor:pointer;color:#2E6B58;font-weight:700;text-decoration:underline')}
          >
            개인정보처리방침
          </span>
          에 동의하는 것으로 봅니다.
        </div>
      )}

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

      {/* On the login screen signing up is a destination, not a footnote: the
          form asks for a lot, so it gets its own page rather than unfolding
          under someone who only came here to log in. */}
      {!isSignUp && (
        <>
          <div style={s('display:flex;align-items:center;gap:10px;margin-top:20px;color:#A2957F;font-size:11.5px')}>
            <div style={s('flex:1;height:1px;background:#E4DCCB')} />
            {a.noAccount}
            <div style={s('flex:1;height:1px;background:#E4DCCB')} />
          </div>
          <div
            onClick={() => {
              setError('')
              st.goAuth('signup')
            }}
            style={s('cursor:pointer;margin-top:12px;background:#FFFFFF;border:1.5px solid #2E6B58;color:#2E6B58;border-radius:999px;padding:14px;text-align:center;font-size:14px;font-weight:700')}
          >
            {a.signUp}
          </div>
        </>
      )}

      {isSignUp && (
        <div style={s('text-align:center;font-size:12.5px;color:#8A7D6C;margin-top:16px')}>
          {a.hasAccount}{' '}
          <span
            onClick={() => {
              setError('')
              st.goAuth('login')
            }}
            style={s('cursor:pointer;color:#2E6B58;font-weight:700;text-decoration:underline')}
          >
            {a.logIn}
          </span>
        </div>
      )}
    </div>
  )
}
