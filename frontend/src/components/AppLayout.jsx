import { NavLink, Outlet } from 'react-router-dom'
import '../auth.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/reset-password', label: 'Reset Password' },
]

export default function AppLayout() {
  return (
    <div className="app-layout">
      <nav className="app-nav">
        <p className="app-nav-title">VendorIQ</p>
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
