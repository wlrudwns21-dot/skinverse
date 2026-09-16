import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { captchaEnabled } from '../auth/captcha'
import { Captcha, type CaptchaHandle } from '../components/Captcha'
import { s } from '../lib/css'
import { useAdmin } from './AdminContext'
import { WORDMARK } from '../data/brand'

const field =
  'width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:12px;padding:12px 14px;font-size:14px;background:#FFFFFF;outline:none'
const label = 'font-size:11px;font-weight:700;color:#6E6252;letter-spacing:0.06em;margin-bottom:5px'

/**
 * Where the note survives an email confirmation.
 *
 * Signing up and applying are two steps with a mail round trip in between, so
 * what they typed about themselves would otherwise be lost by the time they
 * come back and the application is actually filed.
 */
const NOTE_KEY = 'skinverse.admin.applyNote'

const readNote = (): string => {
  try {
    return localStorage.getItem(NOTE_KEY) ?? ''
  } catch {
    return ''
  }
}

const keepNote = (note: string) => {
  try {
    if (note) localStorage.setItem(NOTE_KEY, note)
    else localStorage.removeItem(NOTE_KEY)
  } catch {
    /* Private mode. The note is a convenience, not the application. */
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={s('min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#EFEBE2')}>
      <div style={s('width:100%;max-width:380px;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:20px;padding:28px 24px;box-shadow:0 8px 40px rgba(60,45,25,0.10)')}>
        <div style={s('font-family:Marcellus,serif;font-size:21px;letter-spacing:0.06em')}>{WORDMARK}</div>
        <div style={s('font-size:10px;letter-spacing:0.14em;color:#8A7D6C;margin-top:3px')}>ADMIN CONSOLE · 관리자</div>
        <div style={s('height:1px;background:#ECE6DA;margin:18px 0')} />
        {children}
      </div>
    </div>
  )
}

/**
 * The console's front door.
 *
 * Signing in is not enough — the account has to be on the admin list, which
 * lives in a schema the API does not expose. This screen only decides what to
 * render; the real barrier is row level security, so a non-admin who bypassed
 * this UI would still read nothing but their own rows.
 */
export function AdminLogin() {
  const admin = useAdmin()
  const auth = useAuth()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [note, setNote] = useState(readNote)
  const [captcha, setCaptcha] = useState('')
  const captchaRef = useRef<CaptchaHandle | null>(null)

  if (admin.authLoading || (admin.isSignedIn && admin.role === undefined)) {
    return (
      <Frame>
        <div style={s('display:flex;justify-content:center;padding:20px')}>
          <div style={s('width:32px;height:32px;border-radius:50%;border:3px solid #E4DCCB;border-top-color:#2E6B58;animation:spin 1s linear infinite')} />
        </div>
      </Frame>
    )
  }

  // Signed in, but not an operator.
  // Signed in, but not an approved operator. Which of the three things that
  // can mean decides what they see: waiting, turned down, or never asked.
  if (admin.isSignedIn && !admin.isAdmin) {
    const status = admin.applicationStatus

    if (status === 'pending') {
      return (
        <Frame>
          <div style={s('font-size:15px;font-weight:700')}>승인 대기 중입니다</div>
          <div style={s('font-size:13px;color:#6E6252;margin-top:8px;line-height:1.6')}>
            <b>{admin.email}</b> 계정으로 운영자 신청이 접수되었습니다. 마스터 관리자가 승인하면 바로
            이용하실 수 있습니다.
          </div>
          <div onClick={admin.signOut} style={s('cursor:pointer;margin-top:20px;background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700')}>
            로그아웃
          </div>
          <a href="/" style={s('display:block;text-align:center;font-size:12px;color:#8A7D6C;margin-top:14px')}>← 스토어로 돌아가기</a>
        </Frame>
      )
    }

    if (status === 'rejected') {
      return (
        <Frame>
          <div style={s('font-size:15px;font-weight:700')}>신청이 반려되었습니다</div>
          <div style={s('font-size:13px;color:#6E6252;margin-top:8px;line-height:1.6')}>
            <b>{admin.email}</b> 계정의 운영자 신청은 승인되지 않았습니다. 다시 신청하려면 마스터
            관리자에게 문의해주세요.
          </div>
          <div onClick={admin.signOut} style={s('cursor:pointer;margin-top:20px;background:#FFFFFF;border:1px solid #D8CFBF;color:#4A4234;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700')}>
            로그아웃
          </div>
          <a href="/" style={s('display:block;text-align:center;font-size:12px;color:#8A7D6C;margin-top:14px')}>← 스토어로 돌아가기</a>
        </Frame>
      )
    }

    return (
      <Frame>
        <div style={s('font-size:15px;font-weight:700')}>운영자 신청</div>
        <div style={s('font-size:13px;color:#6E6252;margin-top:8px;line-height:1.6')}>
          <b>{admin.email}</b> 계정은 아직 운영자로 등록되어 있지 않습니다. 아래에서 신청하면 마스터
          관리자의 승인 후 이용하실 수 있습니다.
        </div>

        <div style={s('margin-top:16px')}>
          <div style={s(label)}>소속 · 담당 업무 <span style={s('color:#A2957F;font-weight:600')}>· 선택</span></div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 마케팅팀 / CS 담당"
            style={s(field)}
          />
          <div style={s('font-size:11px;color:#A2957F;line-height:1.5;margin-top:5px')}>
            승인하는 사람이 누구인지 알아볼 수 있도록 적어주세요.
          </div>
        </div>

        {/* Every application is a plain admin. Master is granted afterwards by
            a master, never asked for here — which is also what the database
            enforces, so this line is a description rather than a promise. */}
        <div style={s('background:#F8F5EF;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:11.5px;color:#8A7D6C;line-height:1.5')}>
          모든 신청은 <b>일반 관리자</b>로 접수됩니다. 마스터 권한은 승인 후 마스터 관리자가 부여합니다.
        </div>

        <div
          onClick={
            admin.applying
              ? undefined
              : () => {
                  keepNote('')
                  void admin.apply(note.trim())
                }
          }
          style={s(`cursor:${admin.applying ? 'default' : 'pointer'};margin-top:16px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700;opacity:${admin.applying ? '.6' : '1'}`)}
        >
          {admin.applying ? '신청 중…' : '운영자 신청하기'}
        </div>
        <div onClick={admin.signOut} style={s('cursor:pointer;margin-top:10px;text-align:center;font-size:12px;color:#8A7D6C')}>
          다른 계정으로 로그인
        </div>
        <a href="/" style={s('display:block;text-align:center;font-size:12px;color:#8A7D6C;margin-top:12px')}>← 스토어로 돌아가기</a>
      </Frame>
    )
  }

  // The account was created but the mail has not been answered yet. Nothing to
  // apply with until they confirm — the application needs a session to sign it.
  if (sentTo) {
    return (
      <Frame>
        <div style={s('font-size:15px;font-weight:700')}>이메일을 확인해주세요</div>
        <div style={s('font-size:13px;color:#6E6252;margin-top:8px;line-height:1.6')}>
          <b>{sentTo}</b> 로 인증 메일을 보냈습니다. 메일의 링크를 누른 뒤 이 화면에서 로그인하면
          운영자 신청을 이어서 하실 수 있습니다.
        </div>
        <div
          onClick={() => {
            setSentTo('')
            setMode('login')
            setPassword('')
            setConfirm('')
          }}
          style={s('cursor:pointer;margin-top:20px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700')}
        >
          로그인하러 가기
        </div>
        <a href="/" style={s('display:block;text-align:center;font-size:12px;color:#8A7D6C;margin-top:14px')}>← 스토어로 돌아가기</a>
      </Frame>
    )
  }

  const isSignUp = mode === 'signup'

  const submit = async () => {
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('올바른 이메일 주소를 입력해주세요')
    if (!password) return setError('비밀번호를 입력해주세요')
    if (captchaEnabled && !captcha) return setError('보안 확인을 완료해주세요')

    if (!isSignUp) {
      setBusy(true)
      const res = await auth.signIn(email, password, captcha)
      setBusy(false)
      if (!res.ok) {
        // Single-use: the failed attempt consumed it.
        captchaRef.current?.reset()
        setError('이메일 또는 비밀번호가 올바르지 않습니다')
      }
      return
    }

    if (password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다')
    if (password !== confirm) return setError('비밀번호가 일치하지 않습니다')
    if (!name.trim()) return setError('이름을 입력해주세요')

    setBusy(true)
    // An operator account is an account, nothing more — no address, no birth
    // date. The console has no use for them and asking would be collecting
    // personal data for no reason.
    const res = await auth.signUp({ email, password, name: name.trim(), captchaToken: captcha })
    setBusy(false)

    if (!res.ok) {
      captchaRef.current?.reset()
      setError(
        res.error?.toLowerCase().includes('already')
          ? '이미 가입된 이메일입니다. 로그인해주세요.'
          : '가입에 실패했습니다. 잠시 후 다시 시도해주세요',
      )
      return
    }

    // Confirmation on: they leave and come back, and the apply form above is
    // waiting for them with the note restored. Confirmation off: they are
    // already signed in, so file it now and they land on 승인 대기 중.
    if (res.needsEmailConfirm) {
      keepNote(note.trim())
      setSentTo(email)
    } else {
      keepNote('')
      void admin.apply(note.trim())
    }
  }

  return (
    <Frame>
      <div style={s('display:flex;gap:6px;background:#F3EFE6;border-radius:999px;padding:4px;margin-bottom:18px')}>
        {(['login', 'signup'] as const).map((m) => (
          <div
            key={m}
            onClick={() => {
              setMode(m)
              setError('')
            }}
            style={s(
              'cursor:pointer;flex:1;text-align:center;border-radius:999px;padding:9px 0;font-size:12.5px;font-weight:700;' +
                (mode === m ? 'background:#FFFFFF;color:#221C15;box-shadow:0 1px 3px rgba(60,45,25,0.12)' : 'color:#8A7D6C'),
            )}
          >
            {m === 'login' ? '로그인' : '운영자 가입'}
          </div>
        ))}
      </div>

      <div style={s('font-size:15px;font-weight:700')}>{isSignUp ? '운영자 계정 만들기' : '운영자 로그인'}</div>
      <div style={s('font-size:12.5px;color:#8A7D6C;margin-top:6px;line-height:1.6')}>
        {isSignUp
          ? '계정을 만든 뒤 운영자 신청이 접수됩니다. 마스터 관리자가 승인해야 콘솔을 이용할 수 있습니다.'
          : '관리자로 등록된 계정만 접근할 수 있습니다.'}
      </div>

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:18px')}>
        {isSignUp && (
          <div>
            <div style={s(label)}>이름</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
              placeholder="홍길동"
              style={s(field)}
            />
          </div>
        )}

        <div>
          <div style={s(label)}>이메일</div>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
            style={s(field)}
          />
        </div>
        <div>
          <div style={s(label)}>비밀번호</div>
          <input
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
            placeholder={isSignUp ? '8자 이상' : undefined}
            style={s(field)}
          />
        </div>

        {isSignUp && (
          <>
            <div>
              <div style={s(label)}>비밀번호 확인</div>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
                style={s(field)}
              />
            </div>
            <div>
              <div style={s(label)}>
                소속 · 담당 업무 <span style={s('color:#A2957F;font-weight:600')}>· 선택</span>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
                placeholder="예: 마케팅팀 / CS 담당"
                style={s(field)}
              />
              <div style={s('font-size:11px;color:#A2957F;line-height:1.5;margin-top:5px')}>
                승인하는 사람이 누구인지 알아볼 수 있도록 적어주세요.
              </div>
            </div>
          </>
        )}
      </div>

      {isSignUp && (
        <div style={s('background:#F8F5EF;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:11.5px;color:#8A7D6C;line-height:1.5')}>
          모든 신청은 <b>일반 관리자</b>로 접수됩니다. 마스터 권한은 승인 후 마스터 관리자가 부여합니다.
          <br />
          이 계정은 스토어 회원가입과는 <b>별개</b>입니다.
        </div>
      )}

      {error && (
        <div style={s('background:#FBE9E3;border:1px solid #EFCFC3;color:#A64B32;border-radius:12px;padding:11px 14px;margin-top:12px;font-size:12.5px')}>
          {error}
        </div>
      )}

      {captchaEnabled && (
        <div style={s('margin-top:14px')}>
          <Captcha onToken={setCaptcha} handleRef={captchaRef} />
        </div>
      )}

      <div
        onClick={busy ? undefined : submit}
        style={s(`cursor:${busy ? 'default' : 'pointer'};margin-top:18px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:14px;text-align:center;font-size:14px;font-weight:700;opacity:${busy ? '.6' : '1'}`)}
      >
        {busy ? '확인 중…' : isSignUp ? '가입하고 신청하기' : '로그인'}
      </div>

      <div style={s('text-align:center;font-size:12px;color:#8A7D6C;margin-top:14px')}>
        {isSignUp ? '이미 운영자 계정이 있으신가요?' : '아직 운영자 계정이 없으신가요?'}{' '}
        <span
          onClick={() => {
            setMode(isSignUp ? 'login' : 'signup')
            setError('')
          }}
          style={s('cursor:pointer;color:#2E6B58;font-weight:700;text-decoration:underline')}
        >
          {isSignUp ? '로그인' : '운영자 가입'}
        </span>
      </div>

      <a href="/" style={s('display:block;text-align:center;font-size:12px;color:#8A7D6C;margin-top:12px')}>← 스토어로 돌아가기</a>
    </Frame>
  )
}
