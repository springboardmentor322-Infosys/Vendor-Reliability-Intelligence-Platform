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
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <h1>Dashboard</h1>
        <p className="auth-subtitle">Welcome back</p>

        <div className="dashboard-profile">
          <p>
            <span>Name</span>
            <strong>{user?.name}</strong>
          </p>
          <p>
            <span>Role</span>
            <strong>{user?.role}</strong>
          </p>
        </div>

        <button type="button" className="secondary" onClick={handleLogout}>
          Sign out
        </button>
      </section>
    </main>
  )
}
