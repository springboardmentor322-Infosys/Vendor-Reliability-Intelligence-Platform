import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchQualityInspections } from '../api/supplyChain'
import { fetchVendors } from '../api/vendors'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'
import '../vendor-management.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function scoreClass(score) {
  const value = Number(score)
  const pct = value <= 5 ? value * 20 : value
  if (pct >= 80) return 'status-pill--good'
  if (pct >= 60) return 'status-pill--warn'
  return 'status-pill--danger'
}

function formatScore(score) {
  const value = Number(score)
  if (Number.isNaN(value)) return '—'
  if (value <= 5) return `${value.toFixed(1)} / 5`
  return `${value.toFixed(1)}`
}

export default function QualityInspection() {
  const { user } = useAuth()
  const isVendor = user?.role === 'Vendor'
  const [inspections, setInspections] = useState([])
  const [vendors, setVendors] = useState([])
  const [vendorFilter, setVendorFilter] = useState('')
  const [poFilter, setPoFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (!isVendor && vendorFilter) params.vendor_id = Number(vendorFilter)
      const [rows, vendorList] = await Promise.all([
        fetchQualityInspections(params),
        isVendor ? Promise.resolve([]) : fetchVendors(),
      ])
      setInspections(rows)
      setVendors(vendorList)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load quality inspections'))
    } finally {
      setLoading(false)
    }
  }, [isVendor, vendorFilter])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const query = poFilter.trim().toLowerCase()
    if (!query) return inspections
    return inspections.filter((item) =>
      [item.po_number, String(item.purchase_order_id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [inspections, poFilter])

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>{isVendor ? 'My Quality Inspections' : 'Quality Inspection'}</h1>
          <p>Inspection dates, scores, defects, and notes from live quality records.</p>
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
          {!isVendor ? (
            <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="text"
            className="filter-search"
            placeholder="Filter by PO ref…"
            value={poFilter}
            onChange={(event) => setPoFilter(event.target.value)}
          />
        </div>
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Inspections</h3>
          <span className="table-card__meta">{loading ? 'Loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`}</span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading inspections…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>PO ref</th>
                <th>Inspection date</th>
                <th>Quality score</th>
                <th>Defects</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No quality inspections found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.vendor_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{item.po_number || `PO #${item.purchase_order_id}`}</td>
                    <td>{formatDate(item.inspection_date)}</td>
                    <td>
                      <span className={`status-pill ${scoreClass(item.quality_score)}`}>
                        {formatScore(item.quality_score)}
                      </span>
                    </td>
                    <td>{item.defects_found}</td>
                    <td>{item.inspector_notes || '—'}</td>
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
