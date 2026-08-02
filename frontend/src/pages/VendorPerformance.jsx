import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const performance = [
  { label: 'On-Time Delivery', value: '92%' },
  { label: 'Quality Rating', value: '4.8 / 5' },
  { label: 'Average Response Time', value: '1.6h' },
  { label: 'Supplier Score', value: '88' },
]

const trendPoints = [
  { label: 'Jan', value: 74 },
  { label: 'Feb', value: 78 },
  { label: 'Mar', value: 81 },
  { label: 'Apr', value: 84 },
  { label: 'May', value: 88 },
  { label: 'Jun', value: 91 },
]

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

export default function VendorPerformance() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Vendor Performance</h1>
            <p>Compare supplier performance with quality, delivery, and response metrics.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Select Vendor</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Refresh Metrics</button>
          </div>
        </header>

        <div className="page-toolbar">
          <div className="filter-group">
            <div className="filter-pill">Vendor: Northstar Supply</div>
            <div className="filter-pill">Date: Last 90 days</div>
          </div>
        </div>

        <div className="dashboard-admin-grid dashboard-admin-grid--cards-4">
          {performance.map((item) => (
            <article key={item.label} className="dashboard-card">
              <div className="dashboard-card__label">{item.label}</div>
              <div className="dashboard-card__value">{item.value}</div>
            </article>
          ))}
        </div>

        <div className="dashboard-row" style={{ marginTop: '1rem' }}>
          <section className="chart-card" style={{ minHeight: '320px' }}>
            <div className="chart-card__header">
              <h3>Performance Trend</h3>
              <span className="chart-card__meta">Score progression over 6 months</span>
            </div>
            <div className="chart-panel" />
          </section>
          <section className="list-card" style={{ minHeight: '320px' }}>
            <div className="list-card__header">
              <h3>Vendor Highlights</h3>
              <span className="list-card__meta">Top improvement areas</span>
            </div>
            <div className="activity-list">
              <div className="activity-item">
                <span>Delivery accuracy improved</span>
                <strong>+4%</strong>
              </div>
              <div className="activity-item">
                <span>Quality score stable</span>
                <strong>4.8/5</strong>
              </div>
              <div className="activity-item">
                <span>Response time below target</span>
                <strong>1.6h</strong>
              </div>
            </div>
          </section>
        </div>
      </section>
  )
}
