import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAuditorDashboard } from '../api/dashboard'
import { EmptyState, MetricCards, statusPillClass } from '../components/DashboardWidgets'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

export default function AuditorDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchAuditorDashboard())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load auditor dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Auditor Dashboard</h1>
          <p>Monitor compliance, approvals, and audit trail activity.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="dashboard-admin-btn dashboard-admin-btn--primary"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <MetricCards cards={data?.cards || []} />

      <section className="table-card" style={{ marginTop: '1rem' }}>
        <div className="table-card__header">
          <h3>Current Audit Tasks</h3>
          <span className="table-card__meta">Derived from live exceptions</span>
        </div>
        {(data?.tasks || []).length === 0 ? (
          <EmptyState />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((task) => (
                <tr key={task.label}>
                  <td>{task.label}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(task.status)}`}>{task.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="list-card" style={{ marginTop: '1rem' }}>
        <div className="list-card__header">
          <h3>Audit Insights</h3>
          <span className="list-card__meta">Compliance snapshot</span>
        </div>
        <MetricCards cards={data?.insights || []} columns="cards-3" />
      </section>

      <section className="list-card" style={{ marginTop: '1rem' }}>
        <div className="list-card__header">
          <h3>Recent Audit Events</h3>
          <span className="list-card__meta">Last 14 days</span>
        </div>
        <div className="activity-list">
          {(data?.recent_events || []).length === 0 ? (
            <EmptyState message="No recent audit events." />
          ) : (
            data.recent_events.map((event) => (
              <div key={`${event.title}-${event.detail}`} className="activity-item">
                <span>{event.title}</span>
                <strong>{event.detail}</strong>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  )
}
