import { AuthProvider } from './auth/AuthContext'
import { CatalogProvider } from './catalog/CatalogContext'
import { GatePrompt } from './components/GatePrompt'
import { Header } from './components/Header'
import { PaypalModal } from './components/PaypalModal'
import { TabBar } from './components/TabBar'
import { Toast } from './components/Toast'
import { s } from './lib/css'
import { Auth } from './screens/Auth'
import { Cart } from './screens/Cart'
import { CheckoutConfirmed, CheckoutPayment, CheckoutShipping } from './screens/Checkout'
import { Home } from './screens/Home'
import { Missions } from './screens/Missions'
import { MyPage } from './screens/MyPage'
import { Routine } from './screens/Routine'
import { Support } from './screens/Support'
import { ProductDetail, Shop } from './screens/Shop'
import { ScanFailed, ScanIntro, Scanning, ScanResults } from './screens/Scan'
import { StoreProvider, useStore } from './store/StoreContext'

function CurrentScreen() {
  const { state } = useStore()

  switch (state.screen) {
    case 'home':
      return <Home />
    case 'auth':
      return <Auth />
    case 'scan':
      if (state.scanStep === 'intro') return <ScanIntro />
      if (state.scanStep === 'scanning') return <Scanning />
      if (state.scanStep === 'failed') return <ScanFailed />
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
    case 'support':
      return <Support />
  }
}

function StoreShell() {
  const st = useStore()

  return (
    <div style={s('min-height:100vh;display:flex;justify-content:center;background:radial-gradient(120% 80% at 50% 0%, #F0EBE1 0%, #E7E1D6 60%)')}>
      <div style={s('width:100%;max-width:430px;min-height:100vh;background:#F8F5EF;box-shadow:0 0 60px rgba(60,45,25,0.12);display:flex;flex-direction:column;position:relative')}>
        <Header />
        <div style={s('flex:1;padding:0 0 96px')}>
          {/* Hold the first paint until the stored session is read, so a signed-in
              member never flashes the guest header on reload. */}
          {st.authLoading ? (
            <div style={s('display:flex;align-items:center;justify-content:center;padding:80px 20px')}>
              <div style={s('width:36px;height:36px;border-radius:50%;border:3px solid #E4DCCB;border-top-color:#2E6B58;animation:spin 1s linear infinite')} />
            </div>
          ) : (
            <CurrentScreen />
          )}
        </div>
        <TabBar />
        <Toast message={st.state.toast} />
        <GatePrompt />
        <PaypalModal />
      </div>
    </div>
  )
}

export function StoreApp() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <StoreProvider>
          <StoreShell />
        </StoreProvider>
      </CatalogProvider>
    </AuthProvider>
  )
}
