import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  createPurchaseOrder,
  fetchPODocuments,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  updatePurchaseOrderStatus,
  uploadPODocument,
} from '../api/purchaseOrders'
import { fetchProcurementRequests } from '../api/procurement'
import { fetchVendors } from '../api/vendors'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import DetailTabBar from '../components/DetailTabBar'
import DiscussionPanel from '../components/DiscussionPanel'
import '../dashboard-admin.css'
import '../vendor-management.css'

/* ── constants ─────────────────────────────────────────────────── */

const ALL_STATUSES = [
  'Pending',
  'Approved',
  'Ordered',
  'In Progress',
  'Shipped',
  'Partial Delivery',
  'Delivered',
  'Completed',
  'Cancelled',
]

const DELIVERY_STATUSES = ['In Progress', 'Shipped', 'Partial Delivery', 'Delivered']
const PM_STATUSES = ['Approved', 'Ordered', 'Completed', 'Cancelled']

const STATUS_PILL_CLASS = {
  Pending: 'status-pill--neutral',
  Approved: 'status-pill--good',
  Ordered: 'status-pill--good',
  'In Progress': 'status-pill--warn',
  Shipped: 'status-pill--warn',
  'Partial Delivery': 'status-pill--warn',
  Delivered: 'status-pill--good',
  Completed: 'status-pill--good',
  Cancelled: 'status-pill--danger',
}

const STATUS_GROUP = {
  Approval: ['Pending', 'Approved'],
  Fulfilment: ['Ordered', 'In Progress'],
  Delivery: ['Shipped', 'Partial Delivery', 'Delivered'],
  Finalised: ['Completed', 'Cancelled'],
}

const DOC_TYPES = ['Invoice', 'Receipt', 'Proof of Delivery']

/* ── helpers ────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const cls = STATUS_PILL_CLASS[status] ?? 'status-pill--neutral'
  return <span className={`status-pill ${cls}`}>{status}</span>
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0)
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/* ── PO Detail Modal ───────────────────────────────────────────── */

function PODetailModal({ poId, user, onClose, onUpdated }) {
  const [po, setPo] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [activeTab, setActiveTab] = useState('overview')
  const fileRef = useRef(null)

  const role = user?.role
  const isVendor = role === 'Vendor'
  const isPM = role === 'Procurement Manager'
  const canModify = isVendor || isPM

  const allowedStatuses = isVendor ? DELIVERY_STATUSES : isPM ? PM_STATUSES : []

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, documents] = await Promise.all([
        fetchPurchaseOrder(poId),
        fetchPODocuments(poId),
      ])
      setPo(detail)
      setDocs(documents)
      setStatusValue(detail.status)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load purchase order'))
    } finally {
      setLoading(false)
    }
  }, [poId])

  useEffect(() => { load() }, [load])

  const handleStatusUpdate = async () => {
    if (!statusValue || statusValue === po.status) return
    setUpdating(true)
    setError('')
    try {
      const updated = await updatePurchaseOrderStatus(poId, { status: statusValue, notes: notes.trim() || undefined })
      setPo(updated)
      onUpdated?.(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update status'))
    } finally {
      setUpdating(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const doc = await uploadPODocument(poId, docType, file)
      setDocs((prev) => [doc, ...prev])
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload document'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <div>
            <h2>{po ? po.po_number : 'Loading…'}</h2>
            <p>{po ? `Vendor #${po.vendor_id} — ${formatCurrency(po.total_amount)}` : ''}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {loading && <p className="loading-state">Loading purchase order…</p>}

        {po && (
          <div className="modal-panel__body">
            <DetailTabBar activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'discussion' ? (
              <DiscussionPanel threadType="purchase_order" referenceId={poId} />
            ) : (
              <>
            {/* Status pipeline */}
            <div className="approval-pipeline">
              {ALL_STATUSES.filter((s) => s !== 'Cancelled').map((s, i) => {
                const idx = ALL_STATUSES.indexOf(po.status)
                const curIdx = ALL_STATUSES.indexOf(s)
                let stepCls = ''
                if (po.status === 'Cancelled') stepCls = ''
                else if (curIdx < idx) stepCls = 'approval-pipeline__step--complete'
                else if (curIdx === idx) stepCls = 'approval-pipeline__step--active'
                return (
                  <Fragment key={s}>
                    {i > 0 && <span className="approval-pipeline__arrow">→</span>}
                    <span className={`approval-pipeline__step ${stepCls}`}>
                      <span className="approval-pipeline__dot" />
                      {s}
                    </span>
                  </Fragment>
                )
              })}
              {po.status === 'Cancelled' && (
                <span className="approval-pipeline__step approval-pipeline__step--rejected" style={{ marginLeft: '0.5rem' }}>
                  <span className="approval-pipeline__dot" /> Cancelled
                </span>
              )}
            </div>

            {/* Detail grid */}
            <dl className="detail-grid">
              <div><dt>PO Number</dt><dd>{po.po_number}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={po.status} /></dd></div>
              <div><dt>Order Date</dt><dd>{formatDate(po.order_date)}</dd></div>
              <div><dt>Expected Delivery</dt><dd>{formatDate(po.expected_delivery_date)}</dd></div>
              <div><dt>Total Amount</dt><dd style={{ fontWeight: 600 }}>{formatCurrency(po.total_amount)}</dd></div>
              <div><dt>Created By</dt><dd>User #{po.created_by}</dd></div>
            </dl>

            {po.notes && (
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#334155' }}>Notes</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#475569', fontSize: '0.9rem' }}>{po.notes}</p>
              </div>
            )}

            {/* Line items */}
            <div className="vendor-section">
              <h3>Line Items ({po.items.length})</h3>
              <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>
                  {po.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.item_name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Status update */}
            {canModify && !['Completed', 'Cancelled'].includes(po.status) && (
              <div className="approval-panel">
                <h3>Update Status</h3>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <label style={{ fontSize: '0.88rem', color: '#334155' }}>
                    New status
                    <select
                      value={statusValue}
                      onChange={(e) => setStatusValue(e.target.value)}
                      style={{ display: 'block', marginTop: '0.3rem', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem' }}
                    >
                      {allowedStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: '0.88rem', color: '#334155', flex: 1 }}>
                    Notes (optional)
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add a note…"
                      style={{ display: 'block', marginTop: '0.3rem', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem', width: '100%' }}
                    />
                  </label>
                  <button
                    className="dashboard-admin-btn dashboard-admin-btn--primary"
                    disabled={updating || statusValue === po.status}
                    onClick={handleStatusUpdate}
                  >
                    {updating ? 'Updating…' : 'Update'}
                  </button>
                </div>
              </div>
            )}

            {/* Document upload */}
            {canModify && (
              <div className="vendor-section">
                <h3>Upload Document</h3>
                <form className="upload-panel" onSubmit={handleUpload}>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label style={{ fontSize: '0.88rem', color: '#334155' }}>
                      Document type
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        style={{ display: 'block', marginTop: '0.3rem', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem' }}
                      >
                        {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: '0.88rem', color: '#334155', flex: 1 }}>
                      File
                      <input
                        type="file"
                        ref={fileRef}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx"
                        required
                        style={{ display: 'block', marginTop: '0.3rem' }}
                      />
                    </label>
                    <button className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={uploading} type="submit">
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Documents list */}
            <div className="vendor-section">
              <h3>Documents ({docs.length})</h3>
              {docs.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No documents uploaded yet.</p>
              ) : (
                <div className="doc-list">
                  {docs.map((doc) => (
                    <div key={doc.id} className="doc-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{doc.doc_type}</strong>
                        <span>Uploaded by User #{doc.uploaded_by} — {formatDateTime(doc.uploaded_at)}</span>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dashboard-admin-btn dashboard-admin-btn--ghost"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', textDecoration: 'none' }}
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="form-error">{error}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Create PO Modal (PM only) ─────────────────────────────────── */

function CreatePOModal({ onClose, onCreated }) {
  const [prs, setPrs] = useState([])
  const [vendors, setVendors] = useState([])
  const [selectedPr, setSelectedPr] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [prData, vendorData] = await Promise.all([
          fetchProcurementRequests({ status: 'Approved' }),
          fetchVendors(),
        ])
        setPrs(prData.filter((pr) => pr.status === 'Approved'))
        setVendors(vendorData.filter((v) => v.status === 'Approved'))
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load data'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedPr || !vendorId) {
      setError('Select both a procurement request and a vendor')
      return
    }
    setSubmitting(true)
    try {
      const created = await createPurchaseOrder({
        procurement_request_id: Number(selectedPr),
        vendor_id: Number(vendorId),
        expected_delivery_date: expectedDate ? new Date(expectedDate).toISOString() : null,
        notes: notes.trim() || null,
      })
      onCreated(created)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create purchase order'))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPrData = prs.find((pr) => pr.id === Number(selectedPr))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <div>
            <h2>Create Purchase Order</h2>
            <p>Generate a PO from an approved procurement request</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-panel__body">
            {loading && <p className="loading-state">Loading…</p>}

            {!loading && (
              <>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem', color: '#334155' }}>
                  Approved Procurement Request
                  <select
                    value={selectedPr}
                    onChange={(e) => setSelectedPr(e.target.value)}
                    required
                    style={{ padding: '0.5rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem' }}
                  >
                    <option value="">Select a request…</option>
                    {prs.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        #{pr.id} — {pr.department} — {formatCurrency(pr.total_estimated_cost)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPrData && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#334155' }}>Line items from PR #{selectedPrData.id}</strong>
                    <table style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
                      <thead><tr><th>Item</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
                      <tbody>
                        {selectedPrData.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.item_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.estimated_unit_cost)}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(item.quantity * item.estimated_unit_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem', color: '#334155' }}>
                  Assign Vendor
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    required
                    style={{ padding: '0.5rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem' }}
                  >
                    <option value="">Select a vendor…</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.category?.name ?? v.category_id})</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem', color: '#334155' }}>
                  Expected Delivery Date (optional)
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    style={{ padding: '0.5rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem', color: '#334155' }}>
                  Notes (optional)
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions…"
                    style={{ padding: '0.5rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '0.55rem', minHeight: 60 }}
                  />
                </label>

                {error && <p className="form-error">{error}</p>}
              </>
            )}
          </div>

          <div className="modal-panel__footer">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={submitting || loading}>
              {submitting ? 'Creating…' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Status Tabs (kanban-like grouping) ────────────────────────── */

function StatusTabs({ statuses, active, onChange, counts }) {
  return (
    <div className="po-status-tabs">
      <button
        className={`po-status-tab ${active === 'All' ? 'is-active' : ''}`}
        onClick={() => onChange('All')}
      >
        All <span className="po-status-tab__count">{counts.All ?? 0}</span>
      </button>
      {Object.entries(STATUS_GROUP).map(([group, groupStatuses]) => {
        const groupCount = groupStatuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
        const isActive = active === group || groupStatuses.includes(active)
        return (
          <div key={group} className="po-status-group">
            <button
              className={`po-status-tab ${isActive && !groupStatuses.includes(active) ? 'is-active' : ''}`}
              onClick={() => onChange(group)}
            >
              {group} <span className="po-status-tab__count">{groupCount}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */

export default function PurchaseOrders() {
  const { user } = useAuth()
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPoId, setSelectedPoId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const role = user?.role
  const isVendor = role === 'Vendor'
  const isPM = role === 'Procurement Manager'
  const isReadOnly = role === 'Finance Officer' || role === 'Supply Chain Manager' || role === 'Administrator' || role === 'Auditor'

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchPurchaseOrders()
      setAllOrders(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load purchase orders'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  // Counts by status
  const counts = useMemo(() => {
    const c = { All: allOrders.length }
    ALL_STATUSES.forEach((s) => { c[s] = 0 })
    allOrders.forEach((po) => { c[po.status] = (c[po.status] ?? 0) + 1 })
    return c
  }, [allOrders])

  // Filter orders
  const filtered = useMemo(() => {
    let result = allOrders

    // Status filter
    if (statusFilter !== 'All') {
      const groupStatuses = STATUS_GROUP[statusFilter]
      if (groupStatuses) {
        result = result.filter((po) => groupStatuses.includes(po.status))
      } else {
        result = result.filter((po) => po.status === statusFilter)
      }
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter((po) =>
        po.po_number.toLowerCase().includes(q) ||
        String(po.vendor_id).includes(q)
      )
    }

    return result
  }, [allOrders, statusFilter, searchTerm])

  const handlePOUpdated = (updated) => {
    setAllOrders((prev) => prev.map((po) => (po.id === updated.id ? { ...po, ...updated } : po)))
  }

  const handlePOCreated = (created) => {
    setAllOrders((prev) => [created, ...prev])
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Purchase Orders</h1>
          <p>
            {isVendor
              ? 'Track your assigned purchase orders and upload delivery documents.'
              : isPM
                ? 'Create purchase orders, manage statuses, and track fulfilment.'
                : 'View and track purchase orders across the organisation.'}
          </p>
        </div>
        {isPM && (
          <div className="dashboard-admin-header__actions">
            <button
              type="button"
              className="dashboard-admin-btn dashboard-admin-btn--primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create PO
            </button>
          </div>
        )}
      </header>

      {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

      {/* Status tabs */}
      <StatusTabs statuses={ALL_STATUSES} active={statusFilter} onChange={setStatusFilter} counts={counts} />

      {/* Search & filter toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar__filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {Object.entries(STATUS_GROUP).map(([group, statuses]) => (
              <optgroup key={group} label={group}>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s} ({counts[s] ?? 0})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <input
          type="text"
          className="filter-search"
          placeholder="Search by PO number…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Orders table */}
      <section className="table-card">
        <div className="table-card__header">
          <h3>{statusFilter === 'All' ? 'All Purchase Orders' : statusFilter}</h3>
          <span className="table-card__meta">{loading ? 'Loading…' : `${filtered.length} order${filtered.length === 1 ? '' : 's'}`}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>PO #</th>
              <th>Vendor ID</th>
              <th>Order Date</th>
              <th>Expected Delivery</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="table-empty">No purchase orders found.</td></tr>
            )}
            {filtered.map((po) => (
              <tr key={po.id} className="clickable-row" onClick={() => setSelectedPoId(po.id)}>
                <td style={{ fontWeight: 600 }}>{po.po_number}</td>
                <td>#{po.vendor_id}</td>
                <td>{formatDate(po.order_date)}</td>
                <td>{formatDate(po.expected_delivery_date)}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(po.total_amount)}</td>
                <td><StatusBadge status={po.status} /></td>
                <td>
                  <button
                    type="button"
                    className="dashboard-admin-btn dashboard-admin-btn--ghost"
                    style={{ padding: '0.3rem 0.55rem', fontSize: '0.8rem' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedPoId(po.id) }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* PO Detail Modal */}
      {selectedPoId && (
        <PODetailModal
          poId={selectedPoId}
          user={user}
          onClose={() => setSelectedPoId(null)}
          onUpdated={handlePOUpdated}
        />
      )}

      {/* Create PO Modal */}
      {showCreateModal && (
        <CreatePOModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePOCreated}
        />
      )}
    </section>
  )
}
