import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function TabBar() {
  const { tabs } = useStore()

  return (
    <div style={s('position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--surface-blur);backdrop-filter:blur(10px);border-top:1px solid var(--line);display:flex;z-index:30')}>
      {tabs.map((tab) => (
        <div key={tab.id} onClick={tab.go} style={s('cursor:pointer;flex:1;text-align:center;padding:13px 2px 18px')}>
          <div style={s(`font-size:9.5px;letter-spacing:0.14em;font-weight:${tab.active ? '500' : '400'};color:${tab.color}`)}>
            {tab.label}
          </div>
          <div style={s(`width:12px;height:1px;margin:7px auto 0;background:${tab.bar}`)} />
        </div>
      ))}
    </div>
  )
}
