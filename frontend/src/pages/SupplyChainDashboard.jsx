import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSupplyChainDashboard } from '../api/dashboard'
import { EmptyState, MetricCards, statusPillClass } from '../components/DashboardWidgets'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

export default function SupplyChainDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchSupplyChainDashboard())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load supply chain dashboard'))
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
          <h1>Supply Chain Dashboard</h1>
          <p>Overview of procurement requests, PO tracking and upcoming deliveries.</p>
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
          <h3>Recent Procurement Requests</h3>
          <span className="table-card__meta">Created by you</span>
        </div>
        {(data?.recent_requests || []).length === 0 ? (
          <EmptyState message="No procurement requests yet." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_requests.map((request) => (
                <tr key={request.id}>
                  <td>REQ-{request.id}</td>
                  <td>{request.title}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(request.status)}`}>{request.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="list-card" style={{ marginTop: '1rem' }}>
        <div className="list-card__header">
          <h3>Quick Links</h3>
          <span className="list-card__meta">Actions</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={() => navigate('/procurement-requests')}>
            Create Procurement Request
          </button>
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={() => navigate('/vendor-management')}>
            View Vendor Directory
          </button>
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={() => navigate('/purchase-orders')}>
            Track Purchase Orders
          </button>
        </div>
      </section>
    </section>
  )
}
