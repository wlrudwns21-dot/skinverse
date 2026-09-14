import { Header } from './components/Header'
import { PaypalModal } from './components/PaypalModal'
import { TabBar } from './components/TabBar'
import { Toast } from './components/Toast'
import { s } from './lib/css'
import { Cart } from './screens/Cart'
import { CheckoutConfirmed, CheckoutPayment, CheckoutShipping } from './screens/Checkout'
import { Home } from './screens/Home'
import { Missions } from './screens/Missions'
import { MyPage } from './screens/MyPage'
import { Routine } from './screens/Routine'
import { ProductDetail, Shop } from './screens/Shop'
import { ScanIntro, Scanning, ScanResults } from './screens/Scan'
import { StoreProvider, useStore } from './store/StoreContext'

function CurrentScreen() {
  const { state } = useStore()

  switch (state.screen) {
    case 'home':
      return <Home />
    case 'scan':
      if (state.scanStep === 'intro') return <ScanIntro />
      if (state.scanStep === 'scanning') return <Scanning />
      return <ScanResults />
    case 'shop':
      return <Shop />
    case 'detail':
      return <ProductDetail />
    case 'cart':
      return <Cart />
    case 'checkout':
      if (state.chkStep === 1) return <CheckoutShipping />
      if (state.chkStep === 2) return <CheckoutPayment />
      return <CheckoutConfirmed />
    case 'routine':
      return <Routine />
    case 'missions':
      return <Missions />
    case 'my':
      return <MyPage />
  }
}

function StoreShell() {
  const { state } = useStore()

  return (
    <div style={s('min-height:100vh;display:flex;justify-content:center;background:radial-gradient(120% 80% at 50% 0%, #F0EBE1 0%, #E7E1D6 60%)')}>
      <div style={s('width:100%;max-width:430px;min-height:100vh;background:#F8F5EF;box-shadow:0 0 60px rgba(60,45,25,0.12);display:flex;flex-direction:column;position:relative')}>
        <Header />
        <div style={s('flex:1;padding:0 0 96px')}>
          <CurrentScreen />
        </div>
        <TabBar />
        <Toast message={state.toast} />
        <PaypalModal />
      </div>
    </div>
  )
}

export function StoreApp() {
  return (
    <StoreProvider>
      <StoreShell />
    </StoreProvider>
  )
}
