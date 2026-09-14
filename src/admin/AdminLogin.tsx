import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { s } from '../lib/css'
import { useAdmin } from './AdminContext'

const field =
  'width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:12px;padding:12px 14px;font-size:14px;background:#FFFFFF;outline:none'
const label = 'font-size:11px;font-weight:700;color:#6E6252;letter-spacing:0.06em;margin-bottom:5px'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={s('min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#EFEBE2')}>
      <div style={s('width:100%;max-width:380px;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:20px;padding:28px 24px;box-shadow:0 8px 40px rgba(60,45,25,0.10)')}>
        <div style={s('font-family:Marcellus,serif;font-size:21px;letter-spacing:0.06em')}>SKINVERSE</div>
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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
  if (admin.isSignedIn && !admin.isAdmin) {
    return (
      <Frame>
        <div style={s('font-size:15px;font-weight:700')}>접근 권한이 없습니다</div>
        <div style={s('font-size:13px;color:#6E6252;margin-top:8px;line-height:1.6')}>
          <b>{admin.email}</b> 계정은 관리자로 등록되어 있지 않습니다. 운영자 계정으로 다시 로그인해주세요.
        </div>
        <div onClick={admin.signOut} style={s('cursor:pointer;margin-top:20px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700')}>
          다른 계정으로 로그인
        </div>
        <a href="/" style={s('display:block;text-align:center;font-size:12px;color:#8A7D6C;margin-top:14px')}>← 스토어로 돌아가기</a>
      </Frame>
    )
  }

  const submit = async () => {
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('올바른 이메일 주소를 입력해주세요')
    if (!password) return setError('비밀번호를 입력해주세요')

    setBusy(true)
    const res = await auth.signIn(email, password)
    setBusy(false)
    if (!res.ok) setError('이메일 또는 비밀번호가 올바르지 않습니다')
  }

  return (
    <Frame>
      <div style={s('font-size:15px;font-weight:700')}>운영자 로그인</div>
      <div style={s('font-size:12.5px;color:#8A7D6C;margin-top:6px')}>관리자로 등록된 계정만 접근할 수 있습니다.</div>

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:18px')}>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
            style={s(field)}
          />
        </div>
      </div>

      {error && (
        <div style={s('background:#FBE9E3;border:1px solid #EFCFC3;color:#A64B32;border-radius:12px;padding:11px 14px;margin-top:12px;font-size:12.5px')}>
          {error}
        </div>
      )}

      <div
        onClick={busy ? undefined : submit}
        style={s(`cursor:${busy ? 'default' : 'pointer'};margin-top:18px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:14px;text-align:center;font-size:14px;font-weight:700;opacity:${busy ? '.6' : '1'}`)}
      >
        {busy ? '확인 중…' : '로그인'}
      </div>

      <a href="/" style={s('display:block;text-align:center;font-size:12px;color:#8A7D6C;margin-top:14px')}>← 스토어로 돌아가기</a>
    </Frame>
  )
}
