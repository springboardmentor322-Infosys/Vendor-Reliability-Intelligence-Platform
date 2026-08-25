import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchVendor,
  fetchVendorCategories,
  fetchVendors,
  updateVendorStatus,
} from '../api/vendors'
import { getErrorMessage } from '../utils/auth'
import {
  canManageApprovals,
  formatDateTime,
  getNextApprovalActions,
  getPipelineStepState,
  getStatusPillClass,
  APPROVAL_PIPELINE,
  VENDOR_STATUSES,
} from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

function StatusBadge({ status }) {
  return <span className={`status-pill ${getStatusPillClass(status)}`}>{status}</span>
}

function ApprovalPipeline({ status }) {
  return (
    <div className="approval-pipeline">
      {APPROVAL_PIPELINE.map((step, index) => (
        <span key={step} style={{ display: 'contents' }}>
          <span className={`approval-pipeline__step approval-pipeline__step--${getPipelineStepState(status, step)}`}>
            <span className="approval-pipeline__dot" />
            {step}
            {status === 'Rejected' && step === 'Under Review' && ' (rejected)'}
          </span>
          {index < APPROVAL_PIPELINE.length - 1 && <span className="approval-pipeline__arrow">→</span>}
        </span>
      ))}
    </div>
  )
}

function VendorDetailModal({ vendorId, userRole, onClose, onUpdated }) {
  const [vendor, setVendor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const loadVendor = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchVendor(vendorId)
      setVendor(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load vendor details'))
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    loadVendor()
  }, [loadVendor])

  const handleStatusAction = async (nextStatus) => {
    if (nextStatus === 'Rejected') {
      setPendingAction('Rejected')
      return
    }

    setActionError('')
    setSubmitting(true)
    try {
      const updated = await updateVendorStatus(vendorId, { status: nextStatus })
      setVendor((current) => ({ ...current, ...updated }))
      onUpdated(updated)
      await loadVendor()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update vendor status'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    setActionError('')
    setSubmitting(true)
    try {
      const updated = await updateVendorStatus(vendorId, {
        status: 'Rejected',
        rejection_reason: rejectionReason.trim(),
      })
      setVendor((current) => ({ ...current, ...updated }))
      onUpdated(updated)
      setPendingAction(null)
      setRejectionReason('')
      await loadVendor()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to reject vendor'))
    } finally {
      setSubmitting(false)
    }
  }

  const approvalActions = vendor ? getNextApprovalActions(vendor.status) : []
  const showApprovalPanel = vendor && canManageApprovals(userRole) && approvalActions.length > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel--wide" onClick={(event) => event.stopPropagation()}>
        <div className="modal-panel__header">
          <div>
            <h2>{vendor?.name ?? 'Vendor profile'}</h2>
            {vendor && (
              <p>
                {vendor.category.name} · <StatusBadge status={vendor.status} />
              </p>
            )}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-panel__body">
          {loading && <p className="loading-state">Loading vendor details…</p>}
          {error && <p className="form-error">{error}</p>}

          {vendor && (
            <>
              <section className="vendor-section">
                <h3>Vendor information</h3>
                <dl className="detail-grid">
                  <div>
                    <dt>Name</dt>
                    <dd>{vendor.name}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{vendor.category.name}</dd>
                  </div>
                  <div>
                    <dt>Primary email</dt>
                    <dd>{vendor.contact_email}</dd>
                  </div>
                  <div>
                    <dt>Primary phone</dt>
                    <dd>{vendor.contact_phone}</dd>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <dt>Address</dt>
                    <dd>{vendor.address}</dd>
                  </div>
                  <div>
                    <dt>Registered</dt>
                    <dd>{formatDateTime(vendor.created_at)}</dd>
                  </div>
                  {vendor.rejection_reason && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <dt>Rejection reason</dt>
                      <dd>{vendor.rejection_reason}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="vendor-section">
                <h3>Contacts</h3>
                {vendor.contacts?.length ? (
                  <div className="contact-list">
                    {vendor.contacts.map((contact) => (
                      <div key={contact.id} className="contact-card">
                        <strong>{contact.contact_name}</strong>
                        {contact.designation && <span>{contact.designation}</span>}
                        <span>
                          {contact.email} · {contact.phone}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="table-empty">No additional contacts listed.</p>
                )}
              </section>

              <section className="vendor-section">
                <h3>Documents</h3>
                {vendor.documents?.length ? (
                  <div className="doc-list">
                    {vendor.documents.map((doc) => (
                      <div key={doc.id} className="doc-card">
                        <strong>{doc.doc_type}</strong>
                        <span>Uploaded {formatDateTime(doc.uploaded_at)}</span>
                        <span>
                          <a href={doc.file_url} target="_blank" rel="noreferrer" download>
                            Download file
                          </a>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="table-empty">No documents uploaded yet.</p>
                )}
              </section>

              <section className="vendor-section">
                <h3>Status history</h3>
                {vendor.status_history?.length ? (
                  <div className="history-list">
                    {[...vendor.status_history].reverse().map((entry) => (
                      <div key={entry.id} className="history-item">
                        <div className="history-item__meta">
                          <StatusBadge status={entry.to_status} />
                          <span>{formatDateTime(entry.changed_at)}</span>
                        </div>
                        <span>
                          {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : `Registered as ${entry.to_status}`}
                        </span>
                        {entry.rejection_reason && <span>Reason: {entry.rejection_reason}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="table-empty">No status changes recorded yet.</p>
                )}
              </section>

              {showApprovalPanel && (
                <section className="approval-panel">
                  <h3>Approval workflow</h3>
                  <ApprovalPipeline status={vendor.status} />
                  <p>Move this vendor through: Pending → Under Review → Approved or Rejected.</p>

                  {pendingAction === 'Rejected' ? (
                    <div className="vendor-form">
                      <label>
                        Rejection reason (required)
                        <textarea
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          placeholder="Explain why this vendor is being rejected…"
                          required
                        />
                      </label>
                      <div className="approval-actions">
                        <button
                          type="button"
                          className="dashboard-admin-btn dashboard-admin-btn--ghost"
                          onClick={() => {
                            setPendingAction(null)
                            setRejectionReason('')
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="dashboard-admin-btn dashboard-admin-btn--danger"
                          disabled={submitting || !rejectionReason.trim()}
                          onClick={handleReject}
                        >
                          {submitting ? 'Rejecting…' : 'Confirm rejection'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="approval-actions">
                      {approvalActions.map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          className={`dashboard-admin-btn ${
                            action.variant === 'danger'
                              ? 'dashboard-admin-btn--danger'
                              : action.variant === 'primary'
                                ? 'dashboard-admin-btn--primary'
                                : 'dashboard-admin-btn--ghost'
                          }`}
                          disabled={submitting}
                          onClick={() => handleStatusAction(action.status)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {actionError && <p className="form-error">{actionError}</p>}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VendorManagement() {
  const { user } = useAuth()
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState(null)

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchVendorCategories()
      setCategories(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load categories'))
    }
  }, [])

  const loadVendors = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (categoryFilter) params.category = Number(categoryFilter)
      if (statusFilter) params.status = statusFilter
      const data = await fetchVendors(params)
      setVendors(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load vendors. Check that the backend is running.'))
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, statusFilter])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const timer = setTimeout(loadVendors, 250)
    return () => clearTimeout(timer)
  }, [loadVendors])

  const handleVendorUpdated = (updatedVendor) => {
    setVendors((current) =>
      current.map((vendor) => (vendor.id === updatedVendor.id ? { ...vendor, ...updatedVendor } : vendor)),
    )
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Vendor Management</h1>
          <p>Review supplier health, status, and reliability at a glance.</p>
        </div>
      </header>

      <div className="page-toolbar">
        <div className="page-toolbar__filters">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {VENDOR_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          className="filter-search"
          placeholder="Search vendors by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Vendors</h3>
          <span className="table-card__meta">
            {loading ? 'Loading…' : `Showing ${vendors.length} supplier${vendors.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && vendors.length === 0 ? (
              <tr>
                <td colSpan={3} className="table-empty">
                  No vendors match your filters.
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  className="clickable-row"
                  onClick={() => setSelectedVendorId(vendor.id)}
                >
                  <td>{vendor.name}</td>
                  <td>{vendor.category?.name ?? '—'}</td>
                  <td>
                    <StatusBadge status={vendor.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {selectedVendorId && (
        <VendorDetailModal
          vendorId={selectedVendorId}
          userRole={user?.role}
          onClose={() => setSelectedVendorId(null)}
          onUpdated={handleVendorUpdated}
        />
      )}
    </section>
  )
}
