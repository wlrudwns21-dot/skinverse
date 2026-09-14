import type { Lang } from '../data/types'
import { langOptions } from '../i18n'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'
import { WORDMARK } from '../data/brand'

export function Header() {
  const st = useStore()

  return (
    <div style={s('display:flex;align-items:center;justify-content:space-between;gap:8px;padding:18px 16px 14px;position:sticky;top:0;background:rgba(248,245,239,0.92);backdrop-filter:blur(8px);z-index:20;border-bottom:1px solid #ECE6DA')}>
      {/* The brand block absorbs the squeeze so the pills to its right keep
          their designed single-line shape — Korean and Thai labels are wider
          than the English the prototype was laid out against. */}
      <div onClick={st.goHome} style={s('cursor:pointer;line-height:1;min-width:0')}>
        <div style={s('font-family:Marcellus,serif;font-size:21px;letter-spacing:0.06em;white-space:nowrap;overflow:hidden')}>{WORDMARK}</div>
        <div style={s('font-size:10px;color:#8A7D6C;letter-spacing:0.14em;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>K-BEAUTY · AI SKIN LAB</div>
      </div>

      <div style={s('display:flex;align-items:center;gap:7px;flex-shrink:0')}>
        <select
          value={st.lang}
          onChange={(e) => st.setLang(e.target.value as Lang)}
          style={s('border:1px solid #D8CFBF;border-radius:999px;padding:6px 4px 6px 8px;font-size:11px;font-weight:600;background:#FFFFFF;outline:none;cursor:pointer;width:46px;flex-shrink:0')}
        >
          {langOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.short}</option>
          ))}
        </select>

        {/* Points are a member concept — a guest has no balance to show, and the
            freed width is what lets the signup button read clearly. */}
        {st.isMember && (
          <div onClick={st.goMissions} style={s('cursor:pointer;background:#221C15;color:#F3E9D6;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0')}>
            {st.pointsS} P
          </div>
        )}

        <div onClick={st.goCart} style={s('cursor:pointer;position:relative;border:1px solid #D8CFBF;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:600;background:#FFFFFF;white-space:nowrap;flex-shrink:0')}>
          {st.t.bag}
          {st.hasCart && (
            <span style={s('position:absolute;top:-5px;right:-5px;background:#C25E43;color:#FFF;border-radius:999px;font-size:10px;min-width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px')}>
              {st.cartCount}
            </span>
          )}
        </div>

        {st.isMember ? (
          <div onClick={st.goMy} style={s('cursor:pointer;background:#2E6B58;color:#F3EFE6;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0')}>
            {st.t.myPage}
          </div>
        ) : (
          <div onClick={() => st.goAuth('signup')} style={s('cursor:pointer;background:#2E6B58;color:#F3EFE6;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0')}>
            {st.a.signUp}
          </div>
        )}
      </div>
    </div>
  )
}
