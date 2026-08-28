import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminDashboard } from '../api/dashboard'
import { EmptyState, MetricCards, formatMoney, statusPillClass } from '../components/DashboardWidgets'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchAdminDashboard())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const donut = useMemo(() => {
    const dist = data?.risk_distribution || {}
    const total = dist.total || 0
    if (!total) return { low: 0, medium: 0, high: 0, label: '—' }
    const low = (dist.Low / total) * 100
    const medium = (dist.Medium / total) * 100
    return { low, medium, high: 100 - low - medium, label: `${Math.round(low)}%` }
  }, [data])

  const maxSpend = Math.max(...(data?.spend_points || []).map((point) => point.total_spend), 1)

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Administration Dashboard</h1>
          <p>Welcome back, {user?.name || 'Administrator'}.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={() => navigate('/reports')}>
            Export Report
          </button>
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
            <h3>Vendor Reliability Distribution</h3>
            <span className="chart-card__meta">Live risk levels</span>
          </div>
          <div className="donut-visual">
            <div
              className="donut-ring"
              style={{
                background: `conic-gradient(#22c55e 0 ${donut.low}%, #f59e0b ${donut.low}% ${donut.low + donut.medium}%, #ef4444 ${donut.low + donut.medium}% 100%)`,
              }}
            >
              <span>{donut.label}</span>
            </div>
            <div className="legend-list">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#22c55e' }} /> Low ({data?.risk_distribution?.Low ?? 0})
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#f59e0b' }} /> Medium ({data?.risk_distribution?.Medium ?? 0})
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#ef4444' }} /> High ({data?.risk_distribution?.High ?? 0})
              </div>
            </div>
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Procurement Overview</h3>
            <span className="chart-card__meta">Last 6 months of spend</span>
          </div>
          <div className="spark-bars">
            {(data?.spend_points || []).length === 0 ? (
              <EmptyState message="No purchase order spend yet." />
            ) : (
              data.spend_points.map((point) => (
                <div key={point.period} className="spark-bar">
                  <div className="spark-bar__fill" style={{ height: `${Math.max((point.total_spend / maxSpend) * 100, 6)}%` }} />
                  <span>{point.period.slice(5)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="table-card">
          <div className="table-card__header">
            <h3>Top 5 Vendors</h3>
            <span className="table-card__meta">Reliability score</span>
          </div>
          {(data?.top_vendors || []).length === 0 ? (
            <EmptyState />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Score</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.top_vendors.map((vendor) => (
                  <tr key={vendor.vendor_id}>
                    <td>{vendor.vendor_name}</td>
                    <td>{Number(vendor.overall_score).toFixed(1)}</td>
                    <td>
                      <span className={`status-pill ${statusPillClass(vendor.risk_level)}`}>{vendor.risk_level}</span>
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
            <h3>User Management</h3>
            <span className="list-card__meta">Active roles</span>
          </div>
          <div className="activity-list">
            {(data?.role_counts || []).length === 0 ? (
              <EmptyState />
            ) : (
              data.role_counts.map((role) => (
                <div key={role.name} className="activity-item">
                  <span>{role.name}</span>
                  <strong>{role.count}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="list-card">
          <div className="list-card__header">
            <h3>Contract Alerts</h3>
            <span className="list-card__meta">Expiring in 30 days</span>
          </div>
          <div className="activity-list">
            {(data?.contract_alerts || []).length === 0 ? (
              <EmptyState message="No contracts expiring soon." />
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
            <h3>Compliance Overview</h3>
            <span className="list-card__meta">Contract flags</span>
          </div>
          <div className="donut-visual">
            <div
              className="donut-ring"
              style={{
                background: `conic-gradient(#10b981 0 ${data?.compliance_pct ?? 0}%, #e2e8f0 ${data?.compliance_pct ?? 0}% 100%)`,
              }}
            >
              <span>{data?.compliance_pct != null ? `${Number(data.compliance_pct).toFixed(0)}%` : '—'}</span>
            </div>
            <div className="legend-list">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#10b981' }} /> Compliant
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#e2e8f0' }} /> Other
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
          {(data?.recent_orders || []).length === 0 ? (
            <EmptyState />
          ) : (
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
                {data.recent_orders.map((order) => (
                  <tr key={order.po_number}>
                    <td>{order.po_number}</td>
                    <td>{order.vendor_name}</td>
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

        <section className="list-card">
          <div className="list-card__header">
            <h3>System Activity</h3>
            <span className="list-card__meta">Audit feed</span>
          </div>
          <div className="activity-list">
            {(data?.activity || []).length === 0 ? (
              <EmptyState message="No audit events yet." />
            ) : (
              data.activity.map((entry) => (
                <div key={`${entry.title}-${entry.detail}`} className="activity-item">
                  <div>
                    <strong>{entry.title}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{entry.detail}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="list-card">
          <div className="list-card__header">
            <h3>System Health</h3>
            <span className="list-card__meta">Service status</span>
          </div>
          <div className="health-list">
            {(data?.health || []).map((item) => (
              <div key={item.label} className="health-item">
                <span>{item.label}</span>
                <span className={`status-pill ${statusPillClass(item.status)}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="kpi-grid">
        {(data?.kpis || []).map((kpi) => (
          <div key={kpi.label} className="kpi-widget">
            <strong>{kpi.value}</strong>
            <span>{kpi.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
