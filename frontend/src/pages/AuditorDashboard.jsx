import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const summaryCards = [
  { label: 'Compliance Score', value: '88%', hint: 'Within audit threshold' },
  { label: 'Contracts Expiring', value: '9', hint: 'Next 30 days' },
  { label: 'Flagged Vendors', value: '14', hint: 'Review required' },
  { label: 'Recent Audit Events', value: '7', hint: 'Last 14 days' },
]

const auditTasks = [
  { title: 'Review PO approval trail', status: 'Pending' },
  { title: 'Verify contract terms', status: 'In progress' },
  { title: 'Inspect vendor compliance docs', status: 'Pending' },
]

const auditNotes = [
  { label: 'Active audits', value: '3' },
  { label: 'Compliance items', value: '27' },
  { label: 'High-risk vendors', value: '5' },
]

export default function AuditorDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Auditor Dashboard</h1>
            <p>Monitor compliance, approvals, and audit trail activity.</p>
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
            <h3>Current Audit Tasks</h3>
            <span className="table-card__meta">Prioritized by risk</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditTasks.map((task) => (
                <tr key={task.title}>
                  <td>{task.title}</td>
                  <td>{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="list-card" style={{ marginTop: '1rem' }}>
          <div className="list-card__header">
            <h3>Audit Insights</h3>
            <span className="list-card__meta">Compliance snapshot</span>
          </div>
          <div className="dashboard-admin-grid dashboard-admin-grid--cards-3">
            {auditNotes.map((note) => (
              <article key={note.label} className="dashboard-card">
                <div className="dashboard-card__label">{note.label}</div>
                <div className="dashboard-card__value">{note.value}</div>
              </article>
            ))}
          </div>
        </section>
      </section>
  )
}
