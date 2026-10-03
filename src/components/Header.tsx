import type { Lang } from '../data/types'
import { langOptions } from '../i18n'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'
import { WORDMARK } from '../data/brand'

export function Header() {
  const st = useStore()

  return (
    <div style={s('display:flex;align-items:center;justify-content:space-between;gap:8px;padding:15px 18px 13px;position:sticky;top:0;background:var(--bg-blur);backdrop-filter:blur(8px);z-index:20;border-bottom:1px solid var(--line)')}>
      {/* The brand block absorbs the squeeze so the pills to its right keep
          their designed single-line shape — Korean and Thai labels are wider
          than the English the prototype was laid out against. */}
      <div onClick={st.goHome} style={s('cursor:pointer;line-height:1;min-width:0')}>
        <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:19px;letter-spacing:0.15em;white-space:nowrap;overflow:hidden')}>{WORDMARK}</div>
        <div style={s('font-size:8.5px;color:var(--ink-4);letter-spacing:0.26em;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>K-BEAUTY · AI SKIN LAB</div>
      </div>

      <div style={s('display:flex;align-items:center;gap:7px;flex-shrink:0')}>
        <select
          value={st.lang}
          onChange={(e) => st.setLang(e.target.value as Lang)}
          style={s('border:1px solid var(--line-2);border-radius:3px;padding:6px 2px 6px 6px;font-size:10.5px;font-weight:500;letter-spacing:0.04em;background:transparent;color:var(--ink-2);outline:none;cursor:pointer;width:44px;flex-shrink:0')}
        >
          {langOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.short}</option>
          ))}
        </select>

        {/* Points are a member concept — a guest has no balance to show, and the
            freed width is what lets the signup button read clearly. */}
        {st.isMember && (
          <div onClick={st.goMissions} style={s('cursor:pointer;color:var(--ink-3);padding:7px 2px;font-size:11px;letter-spacing:0.1em;white-space:nowrap;flex-shrink:0')}>
            {st.pointsS} P
          </div>
        )}

        <div onClick={st.goCart} style={s('cursor:pointer;position:relative;border:1px solid var(--line-2);border-radius:3px;padding:7px 10px;font-size:11px;font-weight:500;letter-spacing:0.04em;background:transparent;white-space:nowrap;flex-shrink:0')}>
          {st.t.bag}
          {st.hasCart && (
            <span style={s('position:absolute;top:-5px;right:-5px;background:var(--warn-mid);color:var(--on-dark);border-radius:999px;font-size:10px;min-width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px')}>
              {st.cartCount}
            </span>
          )}
        </div>

        {st.isMember ? (
          <div onClick={st.goMy} style={s('cursor:pointer;background:var(--accent);color:var(--on-accent);border-radius:3px;padding:8px 12px;font-size:11px;font-weight:500;letter-spacing:0.04em;white-space:nowrap;flex-shrink:0')}>
            {st.t.myPage}
          </div>
        ) : (
          <div onClick={() => st.goAuth('login')} style={s('cursor:pointer;background:var(--accent);color:var(--on-accent);border-radius:3px;padding:8px 12px;font-size:11px;font-weight:500;letter-spacing:0.04em;white-space:nowrap;flex-shrink:0')}>
            {st.a.logIn}
          </div>
        )}
      </div>
    </div>
  )
}
