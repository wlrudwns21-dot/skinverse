import { paypalSandboxAccount } from '../data/commerce'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'
import { NAME } from '../data/brand'

export function PaypalModal() {
  const st = useStore()
  if (!st.state.pp) return null

  return (
    <div style={s('position:fixed;inset:0;background:rgba(20,16,10,0.55);z-index:50;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div style={s('width:100%;max-width:340px;background:#FFFFFF;border-radius:20px;padding:22px;animation:rise .3s ease both')}>
        <div style={s('font-size:18px;font-weight:800;color:#0B3D91;font-style:italic')}>
          PayPal <span style={s('font-size:11px;color:#8A7D6C;font-style:normal;font-weight:600')}>SANDBOX</span>
        </div>

        <div style={s('font-size:12px;color:#6E6252;margin-top:10px')}>
          {st.t.loggedInAs}
          <br />
          <b>{paypalSandboxAccount}</b>
        </div>

        <div style={s('border:1px solid #E5E0D4;border-radius:12px;padding:12px 14px;margin-top:12px;display:flex;justify-content:space-between;font-size:14px')}>
          <span>{NAME} Order</span>
          <b>{st.totalS}</b>
        </div>

        {st.state.ppBusy ? (
          <div style={s('margin-top:14px;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px')}>
            <div style={s('width:18px;height:18px;border-radius:50%;border:2.5px solid #E4DCCB;border-top-color:#0B3D91;animation:spin .8s linear infinite')} />
            <span style={s('font-size:13px;font-weight:600;color:#0B3D91')}>{st.t.processing}</span>
          </div>
        ) : (
          <>
            <div onClick={st.pay} style={s('cursor:pointer;margin-top:14px;background:#FFC439;border-radius:999px;padding:13px;text-align:center;font-size:14px;font-weight:800;color:#111')}>
              {st.t.payNow}
            </div>
            <div onClick={st.closePaypal} style={s('cursor:pointer;text-align:center;font-size:12px;color:#8A7D6C;margin-top:12px')}>
              {st.t.cancel}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
