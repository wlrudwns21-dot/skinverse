import { AuthProvider } from './auth/AuthContext'
import { AdminProvider, useAdmin } from './admin/AdminContext'
import { AdminLogin } from './admin/AdminLogin'
import { CatalogProvider } from './catalog/CatalogContext'
import { Sidebar } from './admin/Sidebar'
import { Access } from './admin/views/Access'
import { Audit } from './admin/views/Audit'
import { Dashboard } from './admin/views/Dashboard'
import { Inquiries } from './admin/views/Inquiries'
import { MissionConfig } from './admin/views/MissionConfig'
import { Orders } from './admin/views/Orders'
import { Products } from './admin/views/Products'
import { Users } from './admin/views/Users'
import { Pricing } from './admin/views/Pricing'
import { Refunds } from './admin/views/Refunds'
import { Withdrawals } from './admin/views/Withdrawals'
import { Toast } from './components/Toast'
import { s } from './lib/css'

function CurrentView() {
  const admin = useAdmin()

  if (admin.isDash) return <Dashboard />
  if (admin.isOrders) return <Orders />
  if (admin.isProducts) return <Products />
  if (admin.isUsers) return <Users />
  if (admin.isMissions) return <MissionConfig />
  if (admin.isAccess) return <Access />
  if (admin.isAudit) return <Audit />
  if (admin.isWithdrawals) return <Withdrawals />
  if (admin.isRefunds) return <Refunds />
  if (admin.isPricing) return <Pricing />
  return <Inquiries />
}

function AdminShell() {
  const admin = useAdmin()

  // Anyone who is not a signed-in operator gets the door, not the console.
  if (!admin.isSignedIn || admin.isAdmin !== true) return <AdminLogin />

  return (
    <div style={s('display:flex;min-height:100vh;max-width:1280px;margin:0 auto;background:#F8F5EF;box-shadow:0 0 60px rgba(60,45,25,0.1)')}>
      <Sidebar />
      <div style={s('flex:1;min-width:0;padding:26px 28px 40px')}>
        <CurrentView />
      </div>
      <Toast message={admin.toast} bottom="26px" />
    </div>
  )
}

export function AdminApp() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <AdminProvider>
          <AdminShell />
        </AdminProvider>
      </CatalogProvider>
    </AuthProvider>
  )
}
