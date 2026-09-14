import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdminApp } from './AdminApp'
import { StoreApp } from './StoreApp'

/** The two prototypes sit on different page grounds; only body shows through. */
const BODY_BACKGROUND: Record<string, string> = {
  store: '#E7E1D6',
  admin: '#EFEBE2',
}

function useBodyBackground() {
  const { pathname } = useLocation()
  const surface = pathname.startsWith('/admin') ? 'admin' : 'store'

  useEffect(() => {
    document.body.style.background = BODY_BACKGROUND[surface]
  }, [surface])
}

export function App() {
  useBodyBackground()

  return (
    <Routes>
      <Route path="/" element={<StoreApp />} />
      <Route path="/admin" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
