import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchDeliveries } from '../api/supplyChain'
import { statusPillClass } from '../components/DashboardWidgets'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'
import '../vendor-management.css'

function daysLabel(value) {
  if (value == null || value === '') return '—'
  return `${value} day${Number(value) === 1 ? '' : 's'}`
}

export default function DeliveryTracking() {
  const { user } = useAuth()
  const isVendor = user?.role === 'Vendor'
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDeliveries(await fetchDeliveries())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load deliveries'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const statuses = useMemo(() => {
    return [...new Set(deliveries.map((item) => item.delivery_status).filter(Boolean))].sort()
  }, [deliveries])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return deliveries.filter((item) => {
      if (statusFilter && item.delivery_status !== statusFilter) return false
      if (!query) return true
      return [item.po_number, item.vendor_name, item.shipping_mode, item.delivery_status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [deliveries, search, statusFilter])

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>{isVendor ? 'My Delivery Tracking' : 'Delivery Tracking'}</h1>
          <p>Live shipping status, planned vs actual days, and late-delivery risk from purchase orders.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <div className="page-toolbar">
        <div className="page-toolbar__filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          className="filter-search"
          placeholder="Search PO, vendor, or mode…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Deliveries</h3>
          <span className="table-card__meta">{loading ? 'Loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`}</span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading deliveries…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>PO ref</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Scheduled days</th>
                <th>Actual days</th>
                <th>Shipping mode</th>
                <th>Late-delivery risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    No deliveries found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={item.late_delivery_risk ? 'row--urgent' : ''}>
                    <td style={{ fontWeight: 600 }}>{item.po_number || `PO #${item.purchase_order_id}`}</td>
                    <td>{item.vendor_name || '—'}</td>
                    <td>
                      <span className={`status-pill ${statusPillClass(item.delivery_status)}`}>{item.delivery_status}</span>
                    </td>
                    <td>{daysLabel(item.scheduled_shipping_days)}</td>
                    <td>{daysLabel(item.actual_shipping_days)}</td>
                    <td>{item.shipping_mode || '—'}</td>
                    <td>
                      {item.late_delivery_risk ? (
                        <span className="status-pill status-pill--danger">Late risk</span>
                      ) : (
                        <span className="status-pill status-pill--good">On track</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
