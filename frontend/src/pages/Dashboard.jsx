import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../auth.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <main className="auth-page auth-page--dashboard page-enter">
      <section className="auth-card dashboard-card">
        <div className="dashboard-header">
          <div className="dashboard-greeting">
            Welcome back
            <strong>{user?.name}</strong>
          </div>
          {user?.role && (
            <span className="role-badge" data-role={user.role}>
              {user.role}
            </span>
          )}
        </div>

        <div className="dashboard-profile">
          <p className="dashboard-stat">
            <span>Name</span>
            <strong>{user?.name}</strong>
          </p>
          <p className="dashboard-stat">
            <span>Role</span>
            <strong>{user?.role}</strong>
          </p>
        </div>

        <div className="dashboard-actions">
          <button type="button" className="secondary" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </section>
    </main>
  )
}
