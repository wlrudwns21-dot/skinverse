import { Link } from 'react-router-dom'
import { s } from '../lib/css'
import { useAdmin } from './AdminContext'

export function Sidebar() {
  const admin = useAdmin()

  return (
    <div style={s('width:216px;flex-shrink:0;background:#221C15;color:#D8CFBF;display:flex;flex-direction:column;padding:22px 0')}>
      <div style={s('padding:0 20px 20px;border-bottom:1px solid rgba(255,255,255,0.1)')}>
        <div style={s('font-family:Marcellus,serif;font-size:19px;letter-spacing:0.06em;color:#F5F0E6')}>SKINVERSE</div>
        <div style={s('font-size:10px;letter-spacing:0.14em;color:#8A7D6C;margin-top:3px')}>ADMIN CONSOLE · 관리자</div>
      </div>

      <div style={s('display:flex;flex-direction:column;gap:2px;padding:14px 10px;flex:1')}>
        {admin.menu.map((m) => (
          <div
            key={m.id}
            onClick={m.go}
            style={s(`cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;font-size:13.5px;font-weight:600;background:${m.bg};color:${m.color}`)}
          >
            <span>{m.label}</span>
            {m.hasBadge && (
              <span style={s('background:#C25E43;color:#FFF;border-radius:999px;font-size:10px;font-weight:700;padding:2px 7px')}>
                {m.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={s('padding:14px 20px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px')}>
        <Link to="/" style={s('color:#C7B99E;font-weight:600')}>↗ 스토어 보기 · View store</Link>
        <div style={s('margin-top:10px;display:flex;align-items:center;gap:8px')}>
          <div style={s('width:28px;height:28px;border-radius:50%;background:#2E6B58;color:#F3EFE6;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0')}>
            관
          </div>
          <div style={s('min-width:0')}>
            <div style={s('color:#F5F0E6;font-weight:600')}>{admin.isMaster ? '마스터' : '일반 관리자'}</div>
            <div style={s('font-size:10.5px;color:#8A7D6C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{admin.email}</div>
          </div>
        </div>
        <div onClick={admin.signOut} style={s('cursor:pointer;margin-top:12px;border:1px solid rgba(255,255,255,0.16);border-radius:999px;padding:8px;text-align:center;font-size:11.5px;font-weight:600;color:#B0A490')}>
          로그아웃
        </div>
      </div>
    </div>
  )
}
