import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const summaryCards = [
  { label: 'My Procurement Requests', value: '18', hint: 'Across statuses' },
  { label: 'Requests Pending Approval', value: '5', hint: 'Need attention' },
  { label: 'Purchase Orders In Progress', value: '7', hint: 'Active orders' },
  { label: 'Deliveries Due This Week', value: '4', hint: 'Upcoming' },
]

const recentRequests = [
  { id: 'REQ-1001', title: 'Replacement bearings', status: 'Pending Approval' },
  { id: 'REQ-1002', title: 'Filter stock replenishment', status: 'Approved' },
  { id: 'REQ-1003', title: 'Packaging materials', status: 'In Progress' },
]

export default function SupplyChainDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Supply Chain Dashboard</h1>
            <p>Overview of procurement requests, PO tracking and upcoming deliveries.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Refresh</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={() => { logout(); navigate('/login') }}>
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

        <section className="table-card" style={{ marginTop: '1rem' }}>
          <div className="table-card__header">
            <h3>Recent Procurement Requests</h3>
            <span className="table-card__meta">Your recent activity</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Title</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="list-card" style={{ marginTop: '1rem' }}>
          <div className="list-card__header">
            <h3>Quick Links</h3>
            <span className="list-card__meta">Actions</span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Create Procurement Request</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">View Vendor Directory</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Track Purchase Orders</button>
          </div>
        </section>
      </section>
  )
}
