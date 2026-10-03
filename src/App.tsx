import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { StoreApp } from './StoreApp'
import { s } from './lib/css'

// The admin console is a separate surface with its own data and no overlap with
// the storefront, so shoppers should not download it. It arrives on demand.
const AdminApp = lazy(() => import('./AdminApp').then((m) => ({ default: m.AdminApp })))

/** The two prototypes sit on different page grounds; only body shows through. */
const BODY_BACKGROUND: Record<string, string> = {
  store: 'var(--bg)',
  admin: 'var(--bg)',
}

function useBodyBackground() {
  const { pathname } = useLocation()
  const surface = pathname.startsWith('/admin') ? 'admin' : 'store'

  useEffect(() => {
    document.body.style.background = BODY_BACKGROUND[surface]
  }, [surface])
}

function Loading() {
  return (
    <div style={s('min-height:100vh;display:flex;align-items:center;justify-content:center')}>
      <div style={s('width:36px;height:36px;border-radius:50%;border:3px solid var(--line-2);border-top-color:var(--link);animation:spin 1s linear infinite')} />
    </div>
  )
}

export function App() {
  useBodyBackground()

  return (
    <Routes>
      <Route path="/" element={<StoreApp />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<Loading />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
