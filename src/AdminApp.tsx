import { AdminProvider, useAdmin } from './admin/AdminContext'
import { Sidebar } from './admin/Sidebar'
import { Dashboard } from './admin/views/Dashboard'
import { Inquiries } from './admin/views/Inquiries'
import { MissionConfig } from './admin/views/MissionConfig'
import { Orders } from './admin/views/Orders'
import { Products } from './admin/views/Products'
import { Users } from './admin/views/Users'
import { Toast } from './components/Toast'
import { s } from './lib/css'

function CurrentView() {
  const { state } = useAdmin()

  switch (state.view) {
    case 'dash':
      return <Dashboard />
    case 'orders':
      return <Orders />
    case 'products':
      return <Products />
    case 'users':
      return <Users />
    case 'missions':
      return <MissionConfig />
    case 'cs':
      return <Inquiries />
  }
}

function AdminShell() {
  const { state } = useAdmin()

  return (
    <div style={s('display:flex;min-height:100vh;max-width:1280px;margin:0 auto;background:#F8F5EF;box-shadow:0 0 60px rgba(60,45,25,0.1)')}>
      <Sidebar />
      <div style={s('flex:1;min-width:0;padding:26px 28px 40px')}>
        <CurrentView />
      </div>
      <Toast message={state.toast} bottom="26px" />
    </div>
  )
}

export function AdminApp() {
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  )
}
