import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (location.pathname === '/dashboard' || location.pathname === '/vendor-dashboard') {
    if (user?.role === 'Vendor') {
      if (location.pathname !== '/vendor-dashboard') {
        return <Navigate to="/vendor-dashboard" replace />
      }
      return <Outlet />
    }

    if (user?.role === 'Administrator') {
      if (location.pathname !== '/dashboard') {
        return <Navigate to="/dashboard" replace />
      }
      return <Outlet />
    }
  }

  return <Outlet />
}
