import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFinanceDashboard } from '../api/dashboard'
import { EmptyState, MetricCards, formatMoney, statusPillClass } from '../components/DashboardWidgets'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

export default function FinanceDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchFinanceDashboard())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load finance dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const maxSpend = Math.max(...(data?.spend_points || []).map((point) => point.total_spend), 1)

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Finance Dashboard</h1>
          <p>Track payments, invoices, and procurement spend from live data.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={() => navigate('/purchase-orders')}>
            Review Payments
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <MetricCards cards={data?.cards || []} columns="cards-4" />

      <section className="chart-card" style={{ marginTop: '1rem' }}>
        <div className="chart-card__header">
          <h3>Payment Cycle Trend</h3>
          <span className="chart-card__meta">Monthly PO spend</span>
        </div>
        <div className="spark-bars">
          {(data?.spend_points || []).length === 0 ? (
            <EmptyState message="No spend history yet." />
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

      <section className="table-card" style={{ marginTop: '1rem' }}>
        <div className="table-card__header">
          <h3>Recent Invoices</h3>
          <span className="table-card__meta">Latest due dates</span>
        </div>
        {(data?.recent_invoices || []).length === 0 ? (
          <EmptyState />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_invoices.map((invoice) => (
                <tr key={invoice.invoice_number}>
                  <td>{invoice.invoice_number}</td>
                  <td>{formatMoney(invoice.amount)}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(invoice.status)}`}>{invoice.status}</span>
                  </td>
                  <td>{invoice.due_date ? invoice.due_date.slice(0, 10) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
