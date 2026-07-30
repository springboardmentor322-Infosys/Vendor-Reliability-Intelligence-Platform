import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const summaryCards = [
  { label: 'Total Users', value: '184', hint: '+12% vs last month' },
  { label: 'Total Vendors', value: '96', hint: '18 new this quarter' },
  { label: 'Total Purchase Orders', value: '1,248', hint: '94 pending approvals' },
  { label: 'Total Spend', value: '$4.8M', hint: 'Tracked across 34 categories' },
  { label: 'Active Contracts', value: '73', hint: '6 expiring in 30 days' },
  { label: 'Compliance Score', value: '92%', hint: 'Above target threshold' },
]

const topVendors = [
  { name: 'Northstar Supply', score: '4.9', status: 'Excellent' },
  { name: 'BluePeak Logistics', score: '4.7', status: 'Excellent' },
  { name: 'Apex Industrial', score: '4.4', status: 'Strong' },
  { name: 'Harbor Tech', score: '4.1', status: 'Stable' },
  { name: 'Summit Parts', score: '3.9', status: 'Watch' },
]

const recentOrders = [
  { po: 'PO-1042', vendor: 'Northstar Supply', amount: '$42,300', status: 'Approved' },
  { po: 'PO-1043', vendor: 'BluePeak Logistics', amount: '$18,900', status: 'In Review' },
  { po: 'PO-1044', vendor: 'Apex Industrial', amount: '$63,400', status: 'Pending' },
  { po: 'PO-1045', vendor: 'Harbor Tech', amount: '$11,220', status: 'Approved' },
]

const activityFeed = [
  { title: 'Contract renewed', detail: 'Apex Industrial • 2 hours ago' },
  { title: 'Vendor onboarding', detail: 'Summit Parts • 5 hours ago' },
  { title: 'Compliance review', detail: 'Finance team • Yesterday' },
]

const healthItems = [
  { item: 'Database Cluster', status: 'Healthy' },
  { item: 'API Gateway', status: 'Warning' },
  { item: 'Document Storage', status: 'Healthy' },
]

const kpis = [
  { label: 'On-Time Delivery', value: '87%' },
  { label: 'Avg. Response Time', value: '1.8h' },
  { label: 'Open Risks', value: '14' },
  { label: 'Resolved Issues', value: '28' },
  { label: 'Audit Findings', value: '3' },
  { label: 'Renewal Coverage', value: '81%' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarItems = useMemo(
    () => [
      ['Dashboard', true],
      ['User Management', false],
      ['Vendor Management', false],
      ['Procurement Overview', false],
      ['Contracts & Compliance', false],
      ['Invoices & Payments', false],
      ['Communication', false],
      ['Performance Analytics', false],
      ['Reports & Exports', false],
      ['Notifications', false],
    ],
    [],
  )

  return (
    <main className="dashboard-admin-shell page-enter">
      <aside className="dashboard-admin-sidebar">
        <div className="dashboard-admin-sidebar__brand">
          <span className="brand-mark__logo">VQ</span>
          <strong>VendorIQ</strong>
        </div>

        <div className="dashboard-admin-nav-group">
          <h4>Platform</h4>
          {sidebarItems.map(([label, active]) => (
            <a
              key={label}
              href="#"
              className={`dashboard-admin-nav-item ${active ? 'is-active' : ''}`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="dashboard-admin-nav-group">
          <h4>Administration</h4>
          <a href="#" className="dashboard-admin-nav-item">
            Role & Permissions
          </a>
          <a href="#" className="dashboard-admin-nav-item">
            System Settings
          </a>
          <a href="#" className="dashboard-admin-nav-item">
            Audit Logs
          </a>
          <a href="#" className="dashboard-admin-nav-item">
            Data Management
          </a>
          <a href="#" className="dashboard-admin-nav-item">
            System Health
          </a>
        </div>
      </aside>

      <section className="dashboard-admin-main">
        <header className="dashboard-admin-header">
          <div>
            <h1>Administration Dashboard</h1>
            <p>Welcome back, {user?.name || 'Administrator'}.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">
              Export Report
            </button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>

        <div className="dashboard-admin-grid dashboard-admin-grid--cards">
          {summaryCards.map((card) => (
            <article key={card.label} className="dashboard-card">
              <div className="dashboard-card__label">{card.label}</div>
              <div className="dashboard-card__value">{card.value}</div>
              <div className="dashboard-card__hint">{card.hint}</div>
            </article>
          ))}
        </div>

        <div className="dashboard-row" style={{ marginTop: '1rem' }}>
          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Vendor Reliability Distribution</h3>
              <span className="chart-card__meta">Current quarter</span>
            </div>
            <div className="donut-visual">
              <div className="donut-ring">
                <span>58%</span>
              </div>
              <div className="legend-list">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#3b82f6' }} /> Excellent
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#8b5cf6' }} /> Strong
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#e2e8f0' }} /> Watch
                </div>
              </div>
            </div>
          </section>

          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Procurement Overview</h3>
              <span className="chart-card__meta">6-month trend</span>
            </div>
            <div className="line-chart" />
          </section>

          <section className="table-card">
            <div className="table-card__header">
              <h3>Top 5 Vendors</h3>
              <span className="table-card__meta">Reliability score</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topVendors.map((vendor) => (
                  <tr key={vendor.name}>
                    <td>{vendor.name}</td>
                    <td>{vendor.score}</td>
                    <td>
                      <span className={`status-pill ${vendor.status === 'Excellent' ? 'status-pill--good' : vendor.status === 'Watch' ? 'status-pill--warn' : 'status-pill--good'}`}>
                        {vendor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="dashboard-row dashboard-row--bottom" style={{ marginTop: '1rem' }}>
          <section className="list-card">
            <div className="list-card__header">
              <h3>User Management</h3>
              <span className="list-card__meta">Active roles</span>
            </div>
            <div className="activity-list">
              <div className="activity-item">
                <span>Procurement Managers</span>
                <strong>24</strong>
              </div>
              <div className="activity-item">
                <span>Finance Officers</span>
                <strong>12</strong>
              </div>
              <div className="activity-item">
                <span>Auditors</span>
                <strong>8</strong>
              </div>
            </div>
          </section>

          <section className="list-card">
            <div className="list-card__header">
              <h3>Contract Alerts</h3>
              <span className="list-card__meta">Needs attention</span>
            </div>
            <div className="activity-list">
              <div className="activity-item">
                <span>Renewal due in 7 days</span>
                <span className="status-pill status-pill--warn">High</span>
              </div>
              <div className="activity-item">
                <span>Missing SLA clause</span>
                <span className="status-pill status-pill--danger">Urgent</span>
              </div>
            </div>
          </section>

          <section className="list-card">
            <div className="list-card__header">
              <h3>Compliance Overview</h3>
              <span className="list-card__meta">Status by domain</span>
            </div>
            <div className="donut-visual">
              <div className="donut-ring" style={{ background: 'conic-gradient(#10b981 0 72%, #e2e8f0 72% 100%)' }}>
                <span>72%</span>
              </div>
              <div className="legend-list">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#10b981' }} /> Compliant
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#f59e0b' }} /> Review
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="dashboard-row" style={{ marginTop: '1rem' }}>
          <section className="table-card">
            <div className="table-card__header">
              <h3>Recent Purchase Orders</h3>
              <span className="table-card__meta">Latest activity</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.po}>
                    <td>{order.po}</td>
                    <td>{order.vendor}</td>
                    <td>{order.amount}</td>
                    <td>
                      <span className={`status-pill ${order.status === 'Approved' ? 'status-pill--good' : order.status === 'Pending' ? 'status-pill--warn' : 'status-pill--warn'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="list-card">
            <div className="list-card__header">
              <h3>System Activity</h3>
              <span className="list-card__meta">Live feed</span>
            </div>
            <div className="activity-list">
              {activityFeed.map((entry) => (
                <div key={entry.title} className="activity-item">
                  <div>
                    <strong>{entry.title}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{entry.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="list-card">
            <div className="list-card__header">
              <h3>System Health</h3>
              <span className="list-card__meta">Service status</span>
            </div>
            <div className="health-list">
              {healthItems.map((item) => (
                <div key={item.item} className="health-item">
                  <span>{item.item}</span>
                  <span className={`status-pill ${item.status === 'Healthy' ? 'status-pill--good' : 'status-pill--warn'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="kpi-widget">
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
