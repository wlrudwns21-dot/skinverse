import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const ROW_COLS = 'display:grid;grid-template-columns:1.3fr 0.8fr 0.7fr 0.8fr 0.9fr 1fr;gap:8px'

export function Users() {
  const admin = useAdmin()

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>회원 관리</div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:6px 16px 16px;margin-top:14px;overflow-x:auto')}>
        <div style={s('min-width:700px')}>
          <div style={s(ROW_COLS + ';font-size:11px;color:#8A7D6C;font-weight:700;padding:10px 6px;border-bottom:1px solid #ECE6DA')}>
            <span>회원</span><span>국가</span><span>레벨</span><span>포인트</span><span>스캔 / 주문</span><span>포인트 지급</span>
          </div>
          {admin.userList.map((u) => (
            <div key={u.id} style={s(ROW_COLS + ';font-size:12.5px;padding:11px 6px;border-bottom:1px solid #F1ECE2;align-items:center')}>
              <div>
                <b>{u.name}</b>
                <div style={s('font-size:11px;color:#8A7D6C')}>{u.email}</div>
              </div>
              <span>{u.country}</span>
              <span style={s('background:#EAF1EC;color:#2E6B58;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;justify-self:start')}>{u.level}</span>
              <b>{u.ptsS} P</b>
              <span style={s('color:#6E6252')}>{u.activity}</span>
              <div onClick={u.grant} style={s('cursor:pointer;background:#221C15;color:#F5F0E6;border-radius:999px;padding:7px 0;font-size:11.5px;font-weight:700;text-align:center;max-width:110px')}>
                +{admin.grantPoints} P 지급
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
