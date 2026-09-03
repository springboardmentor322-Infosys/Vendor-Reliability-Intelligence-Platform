import { useCallback, useEffect, useState } from 'react'
import { fetchSystemHealth } from '../api/admin'
import { statusPillClass } from '../components/DashboardWidgets'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

function formatUptime(seconds) {
  const total = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours) return `${hours}h ${minutes}m ${secs}s`
  if (minutes) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export default function SystemHealth() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setHealth(await fetchSystemHealth())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load system health'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const checks = health
    ? [
        { label: 'Database', ...health.database },
        { label: 'Backend', ...health.backend },
        { label: 'SMTP', ...health.smtp },
      ]
    : []

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>System Health</h1>
          <p>Live checks for database connectivity, backend uptime, and SMTP configuration.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Checking…' : 'Run checks'}
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <div className="dashboard-admin-grid dashboard-admin-grid--cards-4" style={{ marginBottom: '1rem' }}>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Uptime</div>
          <div className="dashboard-card__value">{health ? formatUptime(health.uptime_seconds) : '—'}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Started</div>
          <div className="dashboard-card__value" style={{ fontSize: '1rem' }}>
            {health ? formatDateTime(health.started_at) : '—'}
          </div>
        </article>
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Status checks</h3>
        </div>
        {loading && !health ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Running health checks…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.label}>
                  <td style={{ fontWeight: 600 }}>{check.label}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(check.ok ? 'healthy' : 'urgent')}`}>
                      {check.ok ? 'OK' : 'Issue'}
                    </span>
                  </td>
                  <td>{check.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
