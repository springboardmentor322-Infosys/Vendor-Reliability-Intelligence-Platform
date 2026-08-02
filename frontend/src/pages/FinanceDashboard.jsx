import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const metrics = [
  { label: 'Open Invoices', value: '38' },
  { label: 'Pending Payments', value: '$312K' },
  { label: 'Approval Rate', value: '96%' },
  { label: 'Spend Variance', value: '-3%' },
]

const routes = [
  { to: '/dashboard', label: 'Admin Dashboard' },
  { to: '/procurement', label: 'Procurement Dashboard' },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/analytics', label: 'Analytics Dashboard' },
  { to: '/reports', label: 'Reports' },
  { to: '/notifications', label: 'Notifications' },
]

export default function FinanceDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Finance Dashboard</h1>
            <p>Track payments, approvals, and procurement spend.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Refresh</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Review Payments</button>
          </div>
        </header>

        <div className="dashboard-admin-grid dashboard-admin-grid--cards-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="dashboard-card">
              <div className="dashboard-card__label">{metric.label}</div>
              <div className="dashboard-card__value">{metric.value}</div>
            </article>
          ))}
        </div>

        <section className="chart-card" style={{ marginTop: '1rem' }}>
          <div className="chart-card__header">
            <h3>Payment Cycle Trend</h3>
            <span className="chart-card__meta">Last 6 months</span>
          </div>
          <div className="chart-panel" />
        </section>
      </section>
  )
}
