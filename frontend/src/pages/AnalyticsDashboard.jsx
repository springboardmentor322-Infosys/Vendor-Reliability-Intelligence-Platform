import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const routes = [
  { to: '/dashboard', label: 'Admin Dashboard' },
  { to: '/vendor-management', label: 'Vendor Management' },
  { to: '/procurement', label: 'Procurement Dashboard' },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/vendor-performance', label: 'Vendor Performance' },
  { to: '/analytics', label: 'Analytics Dashboard' },
  { to: '/reports', label: 'Reports' },
  { to: '/notifications', label: 'Notifications' },
]

export default function AnalyticsDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Analytics Dashboard</h1>
            <p>Explore procurement, spend, and vendor category trends.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Download Data</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">View Insights</button>
          </div>
        </header>

        <div className="dashboard-admin-grid dashboard-admin-grid--cards-4">
          <article className="dashboard-card">
            <div className="dashboard-card__label">Spend Over Time</div>
            <div className="dashboard-card__value">$3.8M</div>
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card__label">Category Distribution</div>
            <div className="dashboard-card__value">7 categories</div>
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card__label">Cost Trend</div>
            <div className="dashboard-card__value">+8% QoQ</div>
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card__label">Supplier Mix</div>
            <div className="dashboard-card__value">34 vendors</div>
          </article>
        </div>

        <div className="dashboard-row" style={{ marginTop: '1rem' }}>
          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Spend Over Time</h3>
            </div>
            <div className="chart-panel" />
          </section>
          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Vendor Category Distribution</h3>
            </div>
            <div className="chart-panel" />
          </section>
          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Procurement Cost Trends</h3>
            </div>
            <div className="chart-panel" />
          </section>
        </div>
      </section>
  )
}
