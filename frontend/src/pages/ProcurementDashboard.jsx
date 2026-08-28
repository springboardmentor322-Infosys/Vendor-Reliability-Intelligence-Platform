import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProcurementDashboard } from '../api/dashboard'
import { EmptyState, MetricCards, formatMoney, statusPillClass } from '../components/DashboardWidgets'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

export default function ProcurementDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchProcurementDashboard())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load procurement dashboard'))
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
          <h1>Procurement Dashboard</h1>
          <p>Track purchase order flow and procurement health in one view.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh Data'}
          </button>
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={() => navigate('/purchase-orders')}>
            Create Purchase Order
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <MetricCards cards={data?.cards || []} columns="cards-4" />

      <section className="table-card" style={{ marginTop: '1rem' }}>
        <div className="table-card__header">
          <h3>Purchase Order Pipeline</h3>
          <span className="table-card__meta">From pending through completion</span>
        </div>
        <div className="kanban-board">
          {(data?.pipeline || []).map((column) => (
            <div key={column.title} className="kanban-column">
              <div className="kanban-column__title">
                {column.title} ({column.items.length})
              </div>
              {column.items.length === 0 ? (
                <EmptyState message="None" />
              ) : (
                column.items.map((item) => (
                  <div key={item.po_number} className="kanban-card">
                    <strong>{item.po_number}</strong>
                    <p>
                      {item.vendor_name} · {formatMoney(item.amount)}
                    </p>
                    <span className={`status-pill ${statusPillClass(item.status)}`}>{item.status}</span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
