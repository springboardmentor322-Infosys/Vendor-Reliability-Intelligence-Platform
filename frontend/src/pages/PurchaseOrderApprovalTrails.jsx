import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchPoApprovalTrails } from '../api/admin'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

export default function PurchaseOrderApprovalTrails() {
  const [trails, setTrails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

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

  const events = useMemo(() => {
    const rows = trails.flatMap((trail) =>
      (trail.events || []).map((event) => ({
        ...event,
        purchase_order_id: trail.purchase_order_id,
        po_number: trail.po_number,
        vendor_name: trail.vendor_name,
      })),
    )
    rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    return rows
  }, [trails])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return events
    return events.filter((event) =>
      [event.po_number, event.vendor_name, event.performer_name, event.action_description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [events, search])

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>PO Status-Change History</h1>
          <p>
            Read-only audit trail of purchase-order status changes (who changed what and when).
            Operational PO management lives on Purchase Orders.
          </p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <div className="page-toolbar">
        <label className="filter-field">
          <span className="filter-field__label">Search</span>
          <input
            type="text"
            className="filter-search"
            placeholder="Search actor, PO, vendor, or action…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Audit events</h3>
          <span className="table-card__meta">
            {loading ? 'Loading…' : `${filtered.length} status change${filtered.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {loading ? (
          <p className="loading-state">Loading status-change history…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Changed by</th>
                <th>PO</th>
                <th>Vendor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No PO status-change audit events recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDateTime(event.timestamp)}</td>
                    <td>{event.performer_name || `User #${event.performed_by}`}</td>
                    <td style={{ fontWeight: 600 }}>{event.po_number}</td>
                    <td>{event.vendor_name || '—'}</td>
                    <td>{event.action_description}</td>
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
