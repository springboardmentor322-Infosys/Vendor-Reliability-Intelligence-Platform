import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchVendorDashboard } from '../api/dashboard'
import { EmptyState, MetricCards, formatMoney, statusPillClass } from '../components/DashboardWidgets'
import DocumentViewLink from '../components/DocumentViewLink'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1']

export default function VendorDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchVendorDashboard())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load vendor dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const score = data?.reliability_score
  const contractTotal = Object.values(data?.contract_counts || {}).reduce((sum, value) => sum + value, 0)
  const activeShare = contractTotal ? ((data.contract_counts.Active || 0) / contractTotal) * 100 : 0

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Vendor Dashboard</h1>
          <p>Operational visibility for {data?.vendor_name || 'your performance and commitments'}.</p>
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

      <div className="dashboard-row" style={{ marginTop: '1rem' }}>
        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Overall Reliability Score</h3>
            <span className="chart-card__meta">Live weighted score</span>
          </div>
          <div className="donut-visual">
            <div
              className="donut-ring"
              style={{
                background: `conic-gradient(#10b981 0 ${score ?? 0}%, #e2e8f0 ${score ?? 0}% 100%)`,
              }}
            >
              <span>{score != null ? Number(score).toFixed(1) : '—'}</span>
            </div>
            <div className="legend-list">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#10b981' }} /> {data?.risk_level || 'Unscored'} risk
              </div>
            </div>
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Performance Summary</h3>
            <span className="chart-card__meta">Reliability factors</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {(data?.factors || []).length === 0 ? (
              <EmptyState />
            ) : (
              data.factors.map((bar, index) => (
                <div key={bar.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    <span>{bar.label}</span>
                    <strong>{Number(bar.value).toFixed(1)}</strong>
                  </div>
                  <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0' }}>
                    <div
                      style={{
                        width: `${Math.min(Number(bar.value) || 0, 100)}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: BAR_COLORS[index % BAR_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="table-card">
          <div className="table-card__header">
            <h3>Recent Purchase Orders</h3>
            <span className="table-card__meta">Assigned to you</span>
          </div>
          {(data?.recent_orders || []).length === 0 ? (
            <EmptyState />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((order) => (
                  <tr key={order.po_number}>
                    <td>{order.po_number}</td>
                    <td>{formatMoney(order.amount)}</td>
                    <td>
                      <span className={`status-pill ${statusPillClass(order.status)}`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="dashboard-row dashboard-row--bottom" style={{ marginTop: '1rem' }}>
        <section className="list-card">
          <div className="list-card__header">
            <h3>Contract Alerts</h3>
            <span className="list-card__meta">Expiring in 30 days</span>
          </div>
          <div className="activity-list">
            {(data?.contract_alerts || []).length === 0 ? (
              <EmptyState message="No upcoming expiries." />
            ) : (
              data.contract_alerts.map((alert) => (
                <div key={alert.title} className="activity-item">
                  <span>{alert.title}</span>
                  <span className={`status-pill ${statusPillClass(alert.severity)}`}>{alert.severity}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="list-card">
          <div className="list-card__header">
            <h3>Notifications</h3>
            <span className="list-card__meta">Recent updates</span>
          </div>
          <div className="activity-list">
            {(data?.notifications || []).length === 0 ? (
              <EmptyState message="No notifications." />
            ) : (
              data.notifications.map((item) => (
                <div key={`${item.title}-${item.detail}`} className="activity-item">
                  <div>
                    <strong>{item.title}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.detail}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="list-card">
          <div className="list-card__header">
            <h3>Account Summary</h3>
            <span className="list-card__meta">Current standing</span>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <span>Account Status</span>
              <strong>{data?.account_status || '—'}</strong>
            </div>
            <div className="activity-item">
              <span>Risk Level</span>
              <strong>{data?.risk_level || '—'}</strong>
            </div>
            <div className="activity-item">
              <span>Active Contracts</span>
              <strong>{data?.contract_counts?.Active ?? 0}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="dashboard-row" style={{ marginTop: '1rem' }}>
        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Contract Status</h3>
            <span className="chart-card__meta">Current portfolio</span>
          </div>
          <div className="donut-visual">
            <div
              className="donut-ring"
              style={{ background: `conic-gradient(#3b82f6 0 ${activeShare}%, #10b981 ${activeShare}% 100%)` }}
            >
              <span>
                {data?.contract_counts?.Active ?? 0}/{contractTotal}
              </span>
            </div>
            <div className="legend-list">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#3b82f6' }} /> Active
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#10b981' }} /> Other
              </div>
            </div>
          </div>
        </section>

        <section className="list-card">
          <div className="list-card__header">
            <h3>Registration Documents</h3>
            <span className="list-card__meta">Vendor approval files</span>
          </div>
          <div className="activity-list">
            {(data?.documents || []).length === 0 ? (
              <EmptyState message="No registration documents uploaded." />
            ) : (
              data.documents.map((doc) => (
                <div key={`${doc.name}-${doc.uploaded_at}`} className="activity-item">
                  <span>{doc.name}</span>
                  {doc.file_url ? (
                    <DocumentViewLink href={doc.file_url}>Open</DocumentViewLink>
                  ) : (
                    <span>{doc.doc_type}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
