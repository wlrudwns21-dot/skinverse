import { orderStatusMeta, orderStatusOrder } from '../../data/admin'
import type { OrderStatus } from '../../data/types'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const ROW_COLS = 'display:grid;grid-template-columns:1.1fr 1.1fr 0.7fr 0.9fr 1fr 1.1fr;gap:8px'

export function Orders() {
  const admin = useAdmin()

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>주문 관리</div>

      <div style={s('display:flex;gap:8px;margin:14px 0;flex-wrap:wrap')}>
        {admin.orderChips.map((c) => (
          <div key={c.id} onClick={c.pick} style={s(c.style)}>{c.label}</div>
        ))}
      </div>

      {admin.orderList.length === 0 && (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:22px;text-align:center;font-size:12.5px;color:#8A7D6C;line-height:1.6')}>
          {admin.hasOrders ? '이 상태의 주문이 없습니다.' : '아직 주문이 없습니다. 스토어에서 결제가 완료되면 여기에 나타납니다.'}
        </div>
      )}

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:6px 16px 16px;overflow-x:auto')}>
        <div style={s('min-width:760px')}>
          <div style={s(ROW_COLS + ';font-size:11px;color:#8A7D6C;font-weight:700;padding:10px 6px;border-bottom:1px solid #ECE6DA')}>
            <span>주문번호 / 일시</span><span>고객 / 국가</span><span>금액</span><span>배송 방법</span><span>운송장</span><span>상태 변경</span>
          </div>
          {admin.orderList.map((o) => (
            <div key={o.no} style={s(ROW_COLS + ';font-size:12.5px;padding:11px 6px;border-bottom:1px solid #F1ECE2;align-items:center')}>
              <div>
                <b>{o.no}</b>
                <div style={s('font-size:11px;color:#8A7D6C')}>{o.date}</div>
              </div>
              <div>
                {o.name}
                <div style={s('font-size:11px;color:#8A7D6C')}>{o.country}</div>
              </div>
              <b>{o.amtS}</b>
              <span style={s('color:#6E6252')}>{o.carrier}</span>
              <span style={s('font-size:11.5px;color:#6E6252')}>{o.tracking}</span>
              <select
                value={o.status}
                onChange={(e) => o.setStatus(e.target.value as OrderStatus)}
                style={s('border:1px solid #D8CFBF;border-radius:8px;padding:7px 8px;font-size:12px;background:#FFFFFF;outline:none;cursor:pointer;max-width:130px')}
              >
                {orderStatusOrder.map((st) => (
                  <option key={st} value={st}>{orderStatusMeta[st][0]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
