import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardRouteForRole, getAllowedRoutesForRole } from '../utils/roleRoutes'

export default function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const allowedRoutes = getAllowedRoutesForRole(user?.role)
  if (!allowedRoutes.includes(location.pathname)) {
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />
  }

  return <Outlet />
}
