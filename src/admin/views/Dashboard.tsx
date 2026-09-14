import { adminFunnelNote, adminKpis, adminToday } from '../../data/admin'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const ROW_COLS = 'display:grid;grid-template-columns:1.2fr 1fr 0.9fr 0.8fr 1fr;gap:8px'

export function Dashboard() {
  const admin = useAdmin()

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px')}>
        <div style={s('font-family:Marcellus,serif;font-size:24px')}>대시보드</div>
        <div style={s('font-size:12px;color:#8A7D6C')}>{adminToday}</div>
      </div>

      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:16px')}>
        {adminKpis.map((k) => (
          <div key={k.label} style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px')}>
            <div style={s('font-size:12px;color:#8A7D6C')}>{k.label}</div>
            <div style={s('font-family:Marcellus,serif;font-size:26px;margin-top:6px')}>{k.value}</div>
            <div style={s(`font-size:11.5px;font-weight:700;margin-top:4px;color:${k.deltaColor}`)}>{k.delta} vs 어제</div>
          </div>
        ))}
      </div>

      <div style={s('display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px;margin-top:12px')}>
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px')}>
          <div style={s('font-size:13px;font-weight:700')}>국가별 매출 (7일) · Sales by country</div>
          <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
            {admin.countrySales.map((c) => (
              <div key={c.name}>
                <div style={s('display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px')}>
                  <span style={s('font-weight:600')}>{c.name}</span>
                  <span style={s('color:#6E6252')}>{c.amt}</span>
                </div>
                <div style={s('height:8px;background:#EFE9DD;border-radius:99px;overflow:hidden')}>
                  <div style={s(`height:100%;width:${c.w};background:#2E6B58;border-radius:99px`)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px')}>
          <div style={s('font-size:13px;font-weight:700')}>AI 스캔 → 구매 전환</div>
          <div style={s('display:flex;flex-direction:column;gap:8px;margin-top:14px')}>
            {admin.funnel.map((f) => (
              <div key={f.label} style={s(`background:#EAF1EC;border-radius:8px;padding:9px 12px;font-size:12px;display:flex;justify-content:space-between;width:${f.w};min-width:170px;box-sizing:border-box`)}>
                <span style={s('font-weight:600;color:#2C4A3E')}>{f.label}</span>
                <b>{f.n}</b>
              </div>
            ))}
          </div>
          <div style={s('font-size:11.5px;color:#8A7D6C;margin-top:10px')}>
            스캔 완료 고객 전환율 <b style={s('color:#2E6B58')}>{adminFunnelNote.rate}</b> (미스캔 대비 {adminFunnelNote.multiple})
          </div>
        </div>
      </div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px;margin-top:12px')}>
        <div style={s('display:flex;justify-content:space-between;align-items:center')}>
          <div style={s('font-size:13px;font-weight:700')}>최근 주문</div>
          <div onClick={admin.goOrders} style={s('cursor:pointer;font-size:12px;color:#2E6B58;font-weight:600')}>전체 보기 →</div>
        </div>
        <div style={s('margin-top:8px;overflow-x:auto')}>
          <div style={s('min-width:640px')}>
            <div style={s(ROW_COLS + ';font-size:11px;color:#8A7D6C;font-weight:700;letter-spacing:0.04em;padding:8px 6px;border-bottom:1px solid #ECE6DA')}>
              <span>주문번호</span><span>고객 / 국가</span><span>금액</span><span>배송</span><span>상태</span>
            </div>
            {admin.recentOrders.map((o) => (
              <div key={o.no} style={s(ROW_COLS + ';font-size:12.5px;padding:10px 6px;border-bottom:1px solid #F1ECE2;align-items:center')}>
                <b>{o.no}</b>
                <span>{o.customer}</span>
                <span>{o.amtS}</span>
                <span style={s('color:#6E6252')}>{o.carrier}</span>
                <span style={s(o.stStyle)}>{o.stLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
