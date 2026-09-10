import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardRouteForRole, getAllowedRoutesForRole } from '../utils/roleRoutes'

export default function ProtectedRoute() {
  const { isAuthenticated, user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-subtitle">Loading your session…</p>
        </section>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (location.pathname === '/my-vendor-profile') {
    return <Navigate to="/profile" replace />
  }

  const allowedRoutes = getAllowedRoutesForRole(user?.role)
  if (!allowedRoutes.includes(location.pathname)) {
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />
  }

  return <Outlet />
}
