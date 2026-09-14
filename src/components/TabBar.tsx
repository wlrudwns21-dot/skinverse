import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function TabBar() {
  const { tabs } = useStore()

  return (
    <div style={s('position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(255,255,255,0.96);backdrop-filter:blur(10px);border-top:1px solid #ECE6DA;display:flex;z-index:30')}>
      {tabs.map((tab) => (
        <div key={tab.id} onClick={tab.go} style={s('cursor:pointer;flex:1;text-align:center;padding:10px 2px 14px;position:relative')}>
          <div style={s(`position:absolute;top:0;left:25%;right:25%;height:2.5px;border-radius:99px;background:${tab.bar}`)} />
          <div style={s(`font-size:12px;font-weight:700;color:${tab.color};margin-top:6px`)}>{tab.label}</div>
        </div>
      ))}
    </div>
  )
}
