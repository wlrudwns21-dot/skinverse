import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

const numberInput =
  'width:56px;border:1px solid #D8CFBF;border-radius:8px;padding:7px 8px;font-size:13px;font-weight:700;text-align:right;outline:none'
const ruleRow = 'display:flex;justify-content:space-between;align-items:center'
const smallStepper =
  'cursor:pointer;width:22px;height:22px;border:1px solid #D8CFBF;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px'

export function MissionConfig() {
  const admin = useAdmin()
  const { earnRate, useCap, streakBonus } = admin

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>미션 · 포인트 설정</div>

      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:14px')}>
        <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px')}>
          <div style={s('font-size:13px;font-weight:700')}>미션 보상 (P)</div>
          <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:12px')}>
            {admin.missionCfg.map((m) => (
              <div key={m.id} style={s('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
                <div style={s('flex:1')}>
                  <div style={s(`font-size:13px;font-weight:600;color:${m.txtColor}`)}>{m.label}</div>
                  <div style={s('font-size:11px;color:#A2957F')}>{m.cat}</div>
                </div>
                <input
                  type="number"
                  value={m.pts}
                  onChange={(e) => m.setPts(parseInt(e.target.value, 10) || 0)}
                  style={s('width:64px;border:1px solid #D8CFBF;border-radius:8px;padding:7px 8px;font-size:13px;font-weight:700;text-align:right;outline:none;background:#FFFFFF')}
                />
                <div onClick={m.toggle} style={s(`cursor:pointer;width:40px;height:24px;border-radius:99px;background:${m.togBg};position:relative;transition:background .2s;flex-shrink:0`)}>
                  <div style={s(`position:absolute;top:3px;left:${m.togLeft};width:18px;height:18px;border-radius:50%;background:#FFF;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,0.25)`)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={s('display:flex;flex-direction:column;gap:12px')}>
          <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px')}>
            <div style={s('font-size:13px;font-weight:700')}>구매 적립 · 사용 규칙</div>
            <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:12px;font-size:13px')}>
              <div style={s(ruleRow)}>
                <span>구매 $1당 적립</span>
                <div style={s('display:flex;align-items:center;gap:6px')}>
                  <input type="number" value={earnRate} onChange={(e) => admin.setEarnRate(parseInt(e.target.value, 10) || 0)} style={s(numberInput)} />
                  <span style={s('color:#8A7D6C')}>P</span>
                </div>
              </div>
              <div style={s(ruleRow)}>
                <span>포인트 사용 한도 (주문액 대비)</span>
                <div style={s('display:flex;align-items:center;gap:6px')}>
                  <input type="number" value={useCap} onChange={(e) => admin.setUseCap(parseInt(e.target.value, 10) || 0)} style={s(numberInput)} />
                  <span style={s('color:#8A7D6C')}>%</span>
                </div>
              </div>
              <div style={s(ruleRow)}>
                <span>스트릭 보너스 (일일 미션 전체 달성)</span>
                <div style={s('display:flex;align-items:center;gap:6px')}>
                  <input type="number" value={streakBonus} onChange={(e) => admin.setStreakBonus(parseInt(e.target.value, 10) || 0)} style={s(numberInput)} />
                  <span style={s('color:#8A7D6C')}>P</span>
                </div>
              </div>
            </div>
          </div>

          <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:16px')}>
            <div style={s('font-size:13px;font-weight:700')}>교환 리워드 재고</div>
            <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:12px')}>
              {admin.rewardCfg.map((r) => (
                <div key={r.id} style={s('display:flex;justify-content:space-between;align-items:center;font-size:13px')}>
                  <span style={s('font-weight:600')}>
                    {r.name} <span style={s('color:#A2957F;font-weight:400')}>· {r.cost} P</span>
                  </span>
                  <div style={s('display:flex;align-items:center;gap:8px')}>
                    <div onClick={r.dec} style={s(smallStepper)}>−</div>
                    <b style={s(`min-width:26px;text-align:center;color:${r.color}`)}>{r.stock}</b>
                    <div onClick={r.inc} style={s(smallStepper)}>+</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
