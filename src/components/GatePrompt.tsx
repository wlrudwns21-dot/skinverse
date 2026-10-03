import type { Capability } from '../auth/capabilities'
import type { AuthStrings } from '../i18n/auth'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/** What the prompt says depends on which door the guest just tried. */
function copy(capability: Capability, a: AuthStrings): { title: string; body: string } {
  switch (capability) {
    case 'checkout':
      return { title: a.gateTitle, body: a.gateCheckout }
    case 'saveRoutine':
      return { title: a.gateTitle, body: a.gateSaveRoutine }
    case 'claimMission':
      return { title: a.gateTitle, body: a.gateMission }
    case 'redeem':
      return { title: a.gateTitle, body: a.gateRedeem }
    case 'myPage':
      return { title: a.gateTitle, body: a.gateMyPage }
    // The analysis itself. This is the main door a guest reaches, so it sells
    // the account rather than simply refusing.
    case 'scan':
    case 'saveScan':
      return { title: a.gateScanTitle, body: a.gateScanBody }
    default:
      return { title: a.gateTitle, body: a.gateSaveScan }
  }
}

export function GatePrompt() {
  const st = useStore()
  if (!st.gate) return null

  const { title, body } = copy(st.gate, st.a)

  return (
    <div
      onClick={st.closeGate}
      style={s('position:fixed;inset:0;background:rgba(20,16,10,0.55);z-index:55;display:flex;align-items:center;justify-content:center;padding:24px')}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={s('width:100%;max-width:340px;background:var(--surface);border-radius:4px;padding:24px 22px;animation:rise .3s ease both')}
      >
        <div style={s('width:48px;height:48px;border-radius:50%;background:var(--surface-2);color:var(--warn);font-size:22px;display:flex;align-items:center;justify-content:center')}>✦</div>

        <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:20px;margin-top:14px;line-height:1.3')}>{title}</div>
        <div style={s('font-size:13px;color:var(--ink-2);margin-top:8px;line-height:1.6')}>{body}</div>

        <div style={s('background:var(--surface-2);border-radius:4px;padding:12px 14px;margin-top:16px;display:flex;flex-direction:column;gap:7px')}>
          {st.a.memberBenefits.map((b) => (
            <div key={b} style={s('display:flex;gap:9px;font-size:12px;color:var(--link);line-height:1.4')}>
              <span style={s('color:var(--link);font-weight:500;flex-shrink:0')}>✓</span>
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div
          onClick={() => st.goAuth('signup')}
          style={s('cursor:pointer;margin-top:18px;background:var(--accent);color:var(--on-accent);border-radius:3px;padding:14px;text-align:center;font-size:14px;font-weight:500')}
        >
          {st.a.gateCta}
        </div>
        <div
          onClick={() => st.goAuth('login')}
          style={s('cursor:pointer;text-align:center;font-size:12.5px;color:var(--link);font-weight:500;margin-top:12px')}
        >
          {st.a.logIn}
        </div>
        <div
          onClick={st.closeGate}
          style={s('cursor:pointer;text-align:center;font-size:12px;color:var(--ink-4);margin-top:12px')}
        >
          {st.a.gateLater}
        </div>
      </div>
    </div>
  )
}
