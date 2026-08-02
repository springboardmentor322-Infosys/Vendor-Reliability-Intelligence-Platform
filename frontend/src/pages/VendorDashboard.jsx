import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const summaryCards = [
  { label: 'Reliability Score', value: '4.7/5', hint: 'Above benchmark' },
  { label: 'Total Purchase Orders', value: '128', hint: '12 this month' },
  { label: 'On-Time Delivery %', value: '96%', hint: 'Steady improvement' },
  { label: 'Quality Rating', value: '4.8/5', hint: 'Excellent supplier score' },
  { label: 'Total Invoiced', value: '$1.24M', hint: 'YTD' },
  { label: 'Pending Payments', value: '$84K', hint: '2 invoices due' },
]

const performanceBars = [
  { label: 'Delivery', value: 92, color: '#3b82f6' },
  { label: 'Quality', value: 88, color: '#10b981' },
  { label: 'Response', value: 84, color: '#f59e0b' },
]

const recentOrders = [
  { po: 'PO-1021', client: 'Northstar Corp', amount: '$18,400', status: 'Delivered' },
  { po: 'PO-1022', client: 'BluePeak', amount: '$9,750', status: 'In Transit' },
  { po: 'PO-1023', client: 'Apex Retail', amount: '$24,300', status: 'Pending' },
]

const contractAlerts = [
  { title: 'Renewal due in 14 days', type: 'High' },
  { title: 'Insurance document expiring', type: 'Medium' },
]

const notifications = [
  { title: 'New purchase order approved', time: '1h ago' },
  { title: 'Compliance reminder sent', time: '4h ago' },
]

const documents = [
  { name: 'Supplier Profile.pdf', type: 'PDF' },
  { name: 'Compliance Pack.zip', type: 'ZIP' },
  { name: 'Contract Summary.docx', type: 'DOC' },
]

export default function VendorDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Vendor Dashboard</h1>
            <p>Operational visibility for your performance and commitments.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">
              Download Summary
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
              <h3>Overall Reliability Score</h3>
              <span className="chart-card__meta">Current month</span>
            </div>
            <div className="donut-visual">
              <div className="donut-ring" style={{ background: 'conic-gradient(#10b981 0 78%, #e2e8f0 78% 100%)' }}>
                <span>4.7</span>
              </div>
              <div className="legend-list">
                <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} /> Excellent</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }} /> Stable</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }} /> Needs attention</div>
              </div>
            </div>
          </section>

          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Performance Summary</h3>
              <span className="chart-card__meta">By category</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {performanceBars.map((bar) => (
                <div key={bar.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    <span>{bar.label}</span>
                    <strong>{bar.value}%</strong>
                  </div>
                  <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0' }}>
                    <div style={{ width: `${bar.value}%`, height: '100%', borderRadius: '999px', background: bar.color }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="table-card">
            <div className="table-card__header">
              <h3>Recent Purchase Orders</h3>
              <span className="table-card__meta">Latest updates</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.po}>
                    <td>{order.po}</td>
                    <td>{order.client}</td>
                    <td>{order.amount}</td>
                    <td><span className="status-pill status-pill--good">{order.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="dashboard-row dashboard-row--bottom" style={{ marginTop: '1rem' }}>
          <section className="list-card">
            <div className="list-card__header">
              <h3>Contract Alerts</h3>
              <span className="list-card__meta">Priority items</span>
            </div>
            <div className="activity-list">
              {contractAlerts.map((alert) => (
                <div key={alert.title} className="activity-item">
                  <span>{alert.title}</span>
                  <span className="status-pill status-pill--warn">{alert.type}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="list-card">
            <div className="list-card__header">
              <h3>Notifications</h3>
              <span className="list-card__meta">Recent updates</span>
            </div>
            <div className="activity-list">
              {notifications.map((item) => (
                <div key={item.title} className="activity-item">
                  <div>
                    <strong>{item.title}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="list-card">
            <div className="list-card__header">
              <h3>Account Summary</h3>
              <span className="list-card__meta">Current standing</span>
            </div>
            <div className="activity-list">
              <div className="activity-item"><span>Account Status</span><strong>Active</strong></div>
              <div className="activity-item"><span>Risk Level</span><strong>Low</strong></div>
              <div className="activity-item"><span>Next Review</span><strong>Aug 15</strong></div>
            </div>
          </section>
        </div>

        <div className="dashboard-row" style={{ marginTop: '1rem' }}>
          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Performance Trend</h3>
              <span className="chart-card__meta">Last 6 months</span>
            </div>
            <div className="line-chart" />
          </section>

          <section className="chart-card">
            <div className="chart-card__header">
              <h3>Contract Status</h3>
              <span className="chart-card__meta">Current portfolio</span>
            </div>
            <div className="donut-visual">
              <div className="donut-ring" style={{ background: 'conic-gradient(#3b82f6 0 60%, #10b981 60% 100%)' }}>
                <span>3/5</span>
              </div>
              <div className="legend-list">
                <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }} /> Active</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} /> Renewals</div>
              </div>
            </div>
          </section>

          <section className="list-card">
            <div className="list-card__header">
              <h3>Important Documents</h3>
              <span className="list-card__meta">Download-ready</span>
            </div>
            <div className="activity-list">
              {documents.map((doc) => (
                <div key={doc.name} className="activity-item">
                  <span>{doc.name}</span>
                  <span style={{ color: '#3b82f6', cursor: 'pointer' }}>⬇</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
  )
}
