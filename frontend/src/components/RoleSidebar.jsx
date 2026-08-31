import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSidebarItemsForRole, getDashboardRouteForRole, getRoleDashboardLabel } from '../utils/roleRoutes'
import '../dashboard-admin.css'

export default function RoleSidebar() {
  const { user, logout } = useAuth()
  const role = user?.role
  const sidebarSections = getSidebarItemsForRole(role)
  const dashboardRoute = getDashboardRouteForRole(role)
  const dashboardLabel = getRoleDashboardLabel(role)

  return (
    <aside className="dashboard-admin-sidebar">
      <div className="dashboard-admin-sidebar__brand">
        <span className="brand-mark__logo">VQ</span>
        <strong>VendorIQ</strong>
      </div>

      {sidebarSections.map((section) => (
        <div key={section.title} className="dashboard-admin-nav-group">
          <h4>{section.title}</h4>
          {section.items.map((item) => {
            const to = item.to === 'role-dashboard' ? dashboardRoute : item.to
            const label = item.to === 'role-dashboard' ? dashboardLabel : item.label
            if (to && to.startsWith('#')) {
              return (
                <a key={`${section.title}-${label}`} href={to} className="dashboard-admin-nav-item">
                  {label}
                </a>
              )
            }
            return (
              <NavLink
                key={`${section.title}-${to}-${label}`}
                to={to || '#'}
                className={({ isActive }) => `dashboard-admin-nav-item ${isActive ? 'is-active' : ''}`}
              >
                {label}
              </NavLink>
            )
          })}
        </div>
      ))}

      <div className="dashboard-admin-nav-group">
        <h4>Account</h4>
        <button type="button" className="dashboard-admin-nav-item dashboard-admin-nav-action" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  )
}
