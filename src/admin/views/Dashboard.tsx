import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const ROW_COLS = 'display:grid;grid-template-columns:1.2fr 1fr 0.9fr 0.8fr 1fr;gap:8px'

const today = new Date().toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={s('border:1px dashed var(--line-2);border-radius:4px;padding:22px;text-align:center;font-size:12.5px;color:var(--ink-3);line-height:1.6')}>
      {children}
    </div>
  )
}

export function Dashboard() {
  const admin = useAdmin()

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px')}>
        <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:24px')}>대시보드</div>
        <div style={s('display:flex;align-items:center;gap:12px')}>
          <div style={s('font-size:12px;color:var(--ink-3)')}>{today} · 오늘 기준</div>
          <div onClick={admin.refresh} style={s('cursor:pointer;border:1px solid var(--line-2);border-radius:3px;padding:6px 12px;font-size:12px;font-weight:500;background:var(--surface)')}>
            {admin.loadingData ? '불러오는 중…' : '새로고침'}
          </div>
        </div>
      </div>

      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:16px')}>
        {admin.kpis.map((k) => (
          <div key={k.label} style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px')}>
            <div style={s('font-size:12px;color:var(--ink-3)')}>{k.label}</div>
            <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:26px;margin-top:6px')}>{k.value}</div>
            <div style={s(`font-size:11.5px;font-weight:500;margin-top:4px;color:${k.deltaColor}`)}>{k.delta} vs 어제</div>
          </div>
        ))}
      </div>

      <div style={s('display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px;margin-top:12px')}>
        <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px')}>
          <div style={s('font-size:13px;font-weight:500')}>국가별 매출 (7일) · Sales by country</div>
          <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
            {admin.countrySales.length > 0 ? (
              admin.countrySales.map((c) => (
                <div key={c.name}>
                  <div style={s('display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px')}>
                    <span style={s('font-weight:500')}>{c.name}</span>
                    <span style={s('color:var(--ink-2)')}>{c.amt}</span>
                  </div>
                  <div style={s('height:8px;background:var(--surface-2);border-radius:99px;overflow:hidden')}>
                    <div style={s(`height:100%;width:${c.w};background:var(--accent);border-radius:3px`)} />
                  </div>
                </div>
              ))
            ) : (
              <Empty>최근 7일 주문이 없습니다.</Empty>
            )}
          </div>
        </div>

        <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px')}>
          <div style={s('font-size:13px;font-weight:500')}>가입 → 구매 전환</div>
          <div style={s('display:flex;flex-direction:column;gap:8px;margin-top:14px')}>
            {admin.funnel.map((f) => (
              <div key={f.label} style={s(`background:var(--surface-2);border-radius:4px;padding:9px 12px;font-size:12px;display:flex;justify-content:space-between;width:${f.w};min-width:170px;box-sizing:border-box`)}>
                <span style={s('font-weight:500;color:var(--link)')}>{f.label}</span>
                <b>{f.n}</b>
              </div>
            ))}
          </div>
          <div style={s('font-size:11.5px;color:var(--ink-3);margin-top:10px;line-height:1.5')}>
            회원 대비 구매 전환율 <b style={s('color:var(--link)')}>{admin.conversionRate}</b>
            {admin.scanLift !== '—' && <> · 스캔 완료 고객은 {admin.scanLift}</>}
          </div>
        </div>
      </div>

      <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px;margin-top:12px')}>
        <div style={s('display:flex;justify-content:space-between;align-items:center')}>
          <div style={s('font-size:13px;font-weight:500')}>최근 주문</div>
          <div onClick={admin.goOrders} style={s('cursor:pointer;font-size:12px;color:var(--link);font-weight:500')}>전체 보기 →</div>
        </div>

        {admin.hasOrders ? (
          <div style={s('margin-top:8px;overflow-x:auto')}>
            <div style={s('min-width:640px')}>
              <div style={s(ROW_COLS + ';font-size:11px;color:var(--ink-3);font-weight:500;letter-spacing:0.04em;padding:8px 6px;border-bottom:1px solid var(--line)')}>
                <span>주문번호</span><span>고객 / 국가</span><span>금액</span><span>배송</span><span>상태</span>
              </div>
              {admin.recentOrders.map((o) => (
                <div key={o.no} style={s(ROW_COLS + ';font-size:12.5px;padding:10px 6px;border-bottom:1px solid var(--line);align-items:center')}>
                  <b>{o.no}</b>
                  <span>{o.customer}</span>
                  <span>{o.amtS}</span>
                  <span style={s('color:var(--ink-2)')}>{o.carrier}</span>
                  <span style={s(o.stStyle)}>{o.stLabel}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={s('margin-top:12px')}>
            <Empty>
              아직 주문이 없습니다.
              <br />
              스토어에서 회원이 결제를 완료하면 여기에 바로 나타납니다.
            </Empty>
          </div>
        )}
      </div>
    </div>
  )
}
