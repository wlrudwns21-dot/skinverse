import { useState } from 'react'
import type { AdminRole } from '../adminRemote'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const ROW_COLS = 'display:grid;grid-template-columns:1.6fr 0.9fr 1.2fr 0.9fr;gap:8px'
const field =
  'box-sizing:border-box;border:1px solid #D8CFBF;border-radius:10px;padding:10px 12px;font-size:13px;background:#FFFFFF;outline:none'

/**
 * Master-only. Adding an address here authorises it before the person has an
 * account — they become an operator the moment they sign up with it.
 */
export function Access() {
  const admin = useAdmin()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('admin')
  const [note, setNote] = useState('')

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return
    admin.addOperator(email, role, note)
    setEmail('')
    setNote('')
    setRole('admin')
  }

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>권한 관리</div>
      <div style={s('font-size:12.5px;color:#8A7D6C;margin-top:6px;line-height:1.6')}>
        <b>마스터</b>는 모든 기능에 더해 이 화면과 미션 · 포인트 설정을 사용할 수 있습니다.
        <b> 일반 관리자</b>는 주문 · 상품 · 회원 · CS 운영만 가능합니다.
        <br />
        아직 가입하지 않은 이메일도 미리 등록할 수 있고, 해당 주소로 가입하는 순간 권한이 적용됩니다.
      </div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px;margin-top:14px')}>
        <div style={s('font-size:13px;font-weight:700')}>운영자 추가</div>
        <div style={s('display:flex;gap:8px;margin-top:12px;flex-wrap:wrap')}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="operator@example.com"
            style={s(field + ';flex:2;min-width:220px')}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} style={s(field + ';min-width:130px;cursor:pointer')}>
            <option value="admin">일반 관리자</option>
            <option value="master">마스터</option>
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="메모 (선택)"
            style={s(field + ';flex:1;min-width:140px')}
          />
          <div onClick={submit} style={s('cursor:pointer;background:#221C15;color:#F5F0E6;border-radius:999px;padding:10px 20px;font-size:13px;font-weight:700;white-space:nowrap')}>
            추가
          </div>
        </div>
      </div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:6px 16px 16px;margin-top:12px;overflow-x:auto')}>
        <div style={s('min-width:620px')}>
          <div style={s(ROW_COLS + ';font-size:11px;color:#8A7D6C;font-weight:700;padding:10px 6px;border-bottom:1px solid #ECE6DA')}>
            <span>이메일</span><span>권한</span><span>메모</span><span>관리</span>
          </div>

          {admin.operators.map((o) => (
            <div key={o.email} style={s(ROW_COLS + ';font-size:12.5px;padding:11px 6px;border-bottom:1px solid #F1ECE2;align-items:center')}>
              <div style={s('min-width:0')}>
                <b style={s('overflow:hidden;text-overflow:ellipsis;display:block')}>{o.email}</b>
                {o.isSelf && <div style={s('font-size:11px;color:#2E6B58;font-weight:700')}>본인</div>}
              </div>

              <select
                value={o.role}
                onChange={(e) => o.setRole(e.target.value as AdminRole)}
                style={s('border:1px solid #D8CFBF;border-radius:8px;padding:7px 8px;font-size:12px;background:#FFFFFF;outline:none;cursor:pointer;max-width:130px')}
              >
                <option value="admin">일반 관리자</option>
                <option value="master">마스터</option>
              </select>

              <span style={s('color:#6E6252;overflow:hidden;text-overflow:ellipsis')}>{o.note || '—'}</span>

              <div
                onClick={o.remove}
                style={s('cursor:pointer;border:1px solid #EFCFC3;color:#A64B32;background:#FBE9E3;border-radius:999px;padding:7px 0;font-size:11.5px;font-weight:700;text-align:center;max-width:90px')}
              >
                삭제
              </div>
            </div>
          ))}

          {admin.operators.length === 0 && (
            <div style={s('padding:22px;text-align:center;font-size:12.5px;color:#8A7D6C')}>
              등록된 운영자가 없습니다.
            </div>
          )}
        </div>
      </div>

      <div style={s('font-size:11.5px;color:#A2957F;margin-top:12px;line-height:1.6')}>
        마지막 남은 마스터는 삭제하거나 권한을 낮출 수 없습니다 — 아무도 콘솔에 들어올 수 없게 되는 상황을
        데이터베이스에서 막고 있습니다.
      </div>
    </div>
  )
}
