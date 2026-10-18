import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function TabBar() {
  const { tabs } = useStore()

  return (
    <div style={s('position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--surface-blur);backdrop-filter:blur(10px);border-top:1px solid var(--line);display:flex;z-index:30')}>
      {tabs.map((tab) => (
        <div key={tab.id} onClick={tab.go} style={s('cursor:pointer;flex:1;text-align:center;padding:13px 2px 18px')}>
          {/*
            The selected tab used to be 500 weight against 400 and a 1px rule
            12px wide. One weight step and a hairline is a difference you have
            to go looking for, on the one control that has to answer "where am
            I" without being read. It is two steps and a 2px bar in the accent
            now — the same green as the primary button, so the app has one
            colour meaning "this one".
          */}
          <div style={s(`font-size:9.5px;letter-spacing:0.14em;font-weight:${tab.active ? '600' : '400'};color:${tab.color}`)}>
            {tab.label}
          </div>
          <div style={s(`width:${tab.active ? '16px' : '12px'};height:2px;border-radius:2px;margin:6px auto 0;background:${tab.bar}`)} />
        </div>
      ))}
    </div>
  )
}
