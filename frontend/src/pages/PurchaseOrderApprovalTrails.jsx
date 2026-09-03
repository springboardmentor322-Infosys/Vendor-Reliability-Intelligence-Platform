import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchPoApprovalTrails } from '../api/admin'
import { statusPillClass } from '../components/DashboardWidgets'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

export default function PurchaseOrderApprovalTrails() {
  const [trails, setTrails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTrails(await fetchPoApprovalTrails())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load purchase order approval trails'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return trails
    return trails.filter((trail) =>
      [trail.po_number, trail.vendor_name, trail.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [trails, search])

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Purchase Order Approval Trails</h1>
          <p>Read-only status-change history for purchase orders, including who changed what and when.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <div className="page-toolbar">
        <input
          type="text"
          className="filter-search"
          placeholder="Search PO, vendor, or status…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Purchase orders</h3>
          <span className="table-card__meta">
            {loading ? 'Loading…' : `${filtered.length} PO${filtered.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading approval trails…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>PO</th>
                <th>Vendor</th>
                <th>Current status</th>
                <th>Created</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No purchase order trails found.
                  </td>
                </tr>
              ) : (
                filtered.flatMap((trail) => {
                  const rows = [
                    <tr key={trail.purchase_order_id}>
                      <td style={{ fontWeight: 600 }}>{trail.po_number}</td>
                      <td>{trail.vendor_name || '—'}</td>
                      <td>
                        <span className={`status-pill ${statusPillClass(trail.status)}`}>{trail.status}</span>
                      </td>
                      <td>{formatDateTime(trail.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="dashboard-admin-btn dashboard-admin-btn--ghost"
                          onClick={() =>
                            setExpandedId(expandedId === trail.purchase_order_id ? null : trail.purchase_order_id)
                          }
                        >
                          {expandedId === trail.purchase_order_id
                            ? 'Hide'
                            : `${trail.events.length} change${trail.events.length === 1 ? '' : 's'}`}
                        </button>
                      </td>
                    </tr>,
                  ]
                  if (expandedId === trail.purchase_order_id) {
                    rows.push(
                      <tr key={`${trail.purchase_order_id}-history`}>
                        <td colSpan={5} style={{ background: '#f8fafc' }}>
                          {trail.events.length === 0 ? (
                            <p className="table-empty">No status-change audit events recorded for this PO.</p>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                              {trail.events.map((event) => (
                                <li key={event.id} style={{ marginBottom: '0.4rem' }}>
                                  <strong>{event.performer_name || `User #${event.performed_by}`}</strong>
                                  {' · '}
                                  {formatDateTime(event.timestamp)}
                                  <div>{event.action_description}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>,
                    )
                  }
                  return rows
                })
              )}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
