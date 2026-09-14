import { shippingCountries } from '../data/cities'
import { shipping } from '../data/commerce'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

const fieldStyle =
  'width:100%;box-sizing:border-box;border:1px solid #D8CFBF;border-radius:12px;padding:12px 14px;font-size:14px;background:#FFFFFF;outline:none'
const labelStyle = 'font-size:11px;font-weight:700;color:#6E6252;letter-spacing:0.06em;margin-bottom:5px'

export function CheckoutShipping() {
  const st = useStore()

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div onClick={st.goCart} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:10px')}>← {st.t.bag}</div>
      <div style={s('font-family:Marcellus,serif;font-size:22px')}>
        {st.t.shipTitle} <span style={s("font-size:13px;color:#A2957F;font-family:'Albert Sans'")}>· 1/2</span>
      </div>

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
        <div>
          <div style={s(labelStyle)}>{st.t.fullName}</div>
          <input value={st.state.name} onChange={(e) => st.setName(e.target.value)} style={s(fieldStyle)} />
        </div>
        <div>
          <div style={s(labelStyle)}>{st.t.country}</div>
          <select value={st.state.country} onChange={(e) => st.setCountry(e.target.value)} style={s(fieldStyle)}>
            {shippingCountries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={s(labelStyle)}>{st.t.address}</div>
          <input value={st.state.addr} onChange={(e) => st.setAddr(e.target.value)} style={s(fieldStyle)} />
        </div>
      </div>

      <div style={s(labelStyle + ';margin:16px 0 8px')}>{st.t.shipMethod}</div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        <div onClick={st.pickDhl} style={s(`cursor:pointer;background:#FFFFFF;border:1.5px solid ${st.dhlBorder};border-radius:14px;padding:13px 14px;display:flex;justify-content:space-between;align-items:center`)}>
          <div>
            <b style={s('font-size:13px')}>DHL Express</b>
            <div style={s('font-size:12px;color:#8A7D6C')}>{st.t.dhlDesc}</div>
          </div>
          <b style={s('font-size:13px')}>${shipping.dhl.fee.toFixed(2)}</b>
        </div>
        <div onClick={st.pickEms} style={s(`cursor:pointer;background:#FFFFFF;border:1.5px solid ${st.emsBorder};border-radius:14px;padding:13px 14px;display:flex;justify-content:space-between;align-items:center`)}>
          <div>
            <b style={s('font-size:13px')}>K-Packet / EMS</b>
            <div style={s('font-size:12px;color:#8A7D6C')}>{st.t.emsDesc}</div>
          </div>
          <b style={s('font-size:13px')}>${shipping.ems.fee.toFixed(2)}</b>
        </div>
      </div>

      <div onClick={st.toPayment} style={s('cursor:pointer;margin-top:18px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700')}>
        {st.t.toPayment}
      </div>
    </div>
  )
}

export function CheckoutPayment() {
  const st = useStore()

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div onClick={st.backShip} style={s('cursor:pointer;font-size:13px;color:#8A7D6C;margin-bottom:10px')}>← {st.t.shipTitle}</div>
      <div style={s('font-family:Marcellus,serif;font-size:22px')}>
        {st.t.payTitle} <span style={s("font-size:13px;color:#A2957F;font-family:'Albert Sans'")}>· 2/2</span>
      </div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:14px;margin-top:14px;font-size:13px;display:flex;flex-direction:column;gap:6px')}>
        <div style={s('display:flex;justify-content:space-between')}>
          <span style={s('color:#6E6252')}>{st.t.subtotal}</span>
          <b>{st.subS}</b>
        </div>
        <div style={s('display:flex;justify-content:space-between')}>
          <span style={s('color:#6E6252')}>{st.t.shipFee} ({st.shipName})</span>
          <b>{st.shipS}</b>
        </div>
        <div style={s('display:flex;justify-content:space-between;color:#2E6B58')}>
          <span>{st.t.ptsDisc}</span>
          <b>{st.discS}</b>
        </div>
        <div style={s('border-top:1px solid #ECE6DA;margin-top:4px;padding-top:8px;display:flex;justify-content:space-between;font-size:15px')}>
          <b>{st.t.total}</b>
          <b>{st.totalS}</b>
        </div>
      </div>

      <div onClick={st.togglePoints} style={s('cursor:pointer;background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:13px 14px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:10px')}>
        <div>
          <b style={s('font-size:13px')}>{st.usePtsLine}</b>
          <div style={s('font-size:12px;color:#9A8455')}>{st.t.ptsNote}</div>
        </div>
        <div style={s(`width:44px;height:26px;border-radius:99px;background:${st.togBg};position:relative;transition:background .2s;flex-shrink:0`)}>
          <div style={s(`position:absolute;top:3px;left:${st.togLeft};width:20px;height:20px;border-radius:50%;background:#FFF;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,0.25)`)} />
        </div>
      </div>

      <div onClick={st.openPaypal} style={s('cursor:pointer;margin-top:16px;background:#0B3D91;color:#FFFFFF;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700')}>
        {st.t.payWith} <i>PayPal</i> · Sandbox
      </div>
      <div style={s('text-align:center;font-size:11px;color:#A2957F;margin-top:10px')}>{st.t.testNote}</div>
    </div>
  )
}

export function CheckoutConfirmed() {
  const st = useStore()
  const order = st.state.order

  return (
    <div style={s('padding:40px 20px;text-align:center;animation:rise .4s ease both')}>
      <div style={s('width:72px;height:72px;border-radius:50%;background:#2E6B58;color:#FFF;font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto')}>✓</div>
      <div style={s('font-family:Marcellus,serif;font-size:24px;margin-top:16px')}>{st.t.confirmed}</div>
      <div style={s('font-size:13px;color:#8A7D6C;margin-top:4px')}>{st.t.confirmedSub} 🇰🇷</div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:18px;font-size:13px;text-align:left;display:flex;flex-direction:column;gap:8px')}>
        <div style={s('display:flex;justify-content:space-between')}>
          <span style={s('color:#6E6252')}>{st.t.orderNo}</span>
          <b>{order?.no}</b>
        </div>
        <div style={s('display:flex;justify-content:space-between')}>
          <span style={s('color:#6E6252')}>{st.t.paidVia}</span>
          <b>{order?.total}</b>
        </div>
        <div style={s('display:flex;justify-content:space-between')}>
          <span style={s('color:#6E6252')}>{st.t.delivery}</span>
          <b>{order?.eta}</b>
        </div>
        <div style={s('display:flex;justify-content:space-between;color:#C29A5B')}>
          <span>{st.t.ptsEarned}</span>
          <b>+{order?.earn} P</b>
        </div>
      </div>

      <div onClick={st.goShop} style={s('cursor:pointer;margin-top:18px;background:#221C15;color:#F5F0E6;border-radius:999px;padding:14px;font-size:13px;font-weight:700')}>
        {st.t.contShop}
      </div>
      <div onClick={st.goMy} style={s('cursor:pointer;margin-top:10px;font-size:13px;color:#2E6B58;font-weight:600')}>
        {st.t.viewMy}
      </div>
    </div>
  )
}
