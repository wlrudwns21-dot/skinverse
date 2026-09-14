import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

export function Inquiries() {
  const admin = useAdmin()

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>CS 문의</div>

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        {admin.csList.map((c) => (
          <div key={c.id} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px 16px')}>
            <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap')}>
              <div style={s('flex:1;min-width:220px')}>
                <div style={s('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
                  <span style={s('background:#F1EAF3;color:#6B4B78;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700')}>{c.cat}</span>
                  <b style={s('font-size:13.5px')}>{c.title}</b>
                </div>
                <div style={s('font-size:12px;color:#6E6252;margin-top:6px;line-height:1.5')}>{c.body}</div>
                <div style={s('font-size:11px;color:#A2957F;margin-top:6px')}>{c.who}</div>
              </div>
              <div onClick={c.toggle} style={s(`cursor:pointer;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;white-space:nowrap;${c.btnStyle}`)}>
                {c.btnLabel}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
