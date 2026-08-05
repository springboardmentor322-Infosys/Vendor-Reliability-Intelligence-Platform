import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  approveProcurementRequest,
  createProcurementRequest,
  fetchProcurementRequests,
  rejectProcurementRequest,
} from '../api/procurement'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

const FINANCE_THRESHOLD = 10000

const PROCUREMENT_STATUSES = ['Pending', 'Approved', 'Ordered', 'Delivered', 'Completed', 'Cancelled']

const PROCUREMENT_PILL_CLASS = {
  Pending: 'status-pill--neutral',
  Approved: 'status-pill--good',
  Ordered: 'status-pill--warn',
  Delivered: 'status-pill--good',
  Completed: 'status-pill--good',
  Cancelled: 'status-pill--danger',
}

const EMPTY_ROW = { item_name: '', quantity: '', estimated_unit_cost: '' }

function StatusBadge({ status }) {
  const cls = PROCUREMENT_PILL_CLASS[status] ?? 'status-pill--neutral'
  return <span className={`status-pill ${cls}`}>{status}</span>
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function requiresFinanceApproval(total) {
  return total > FINANCE_THRESHOLD
}

/* ---------- Create Request Form (SCM only) ---------- */

function CreateRequestForm({ onCreated }) {
  const [department, setDepartment] = useState('')
  const [rows, setRows] = useState([{ ...EMPTY_ROW }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const total = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const qty = Number(r.quantity) || 0
        const cost = Number(r.estimated_unit_cost) || 0
        return sum + qty * cost
      }, 0),
    [rows],
  )

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }])

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setDepartment('')
    setRows([{ ...EMPTY_ROW }])
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const items = rows
      .filter((r) => r.item_name.trim() && Number(r.quantity) > 0 && Number(r.estimated_unit_cost) > 0)
      .map((r) => ({
        item_name: r.item_name.trim(),
        quantity: Number(r.quantity),
        estimated_unit_cost: Number(r.estimated_unit_cost),
      }))

    if (!department.trim()) {
      setError('Department is required')
      setSubmitting(false)
      return
    }
    if (items.length === 0) {
      setError('Add at least one valid line item')
      setSubmitting(false)
      return
    }

    try {
      const created = await createProcurementRequest({ department: department.trim(), items })
      onCreated(created)
      setSuccess(`Request #${created.id} created — ${formatCurrency(created.total_estimated_cost)}`)
      resetForm()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create procurement request'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="table-card" style={{ marginBottom: '1.25rem' }}>
      <div className="table-card__header">
        <h3>Create Procurement Request</h3>
        <span className="table-card__meta">Supply Chain Manager</span>
      </div>

      <form className="vendor-form" onSubmit={handleSubmit} style={{ padding: '0.5rem 0' }}>
        <label>
          Department
          <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} required placeholder="e.g. Engineering, Operations, HR" />
        </label>

        <div className="pr-line-items">
          <div className="pr-line-items__header">
            <strong>Line Items</strong>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={addRow} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              + Add row
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item name</th>
                <th style={{ width: 100 }}>Qty</th>
                <th style={{ width: 140 }}>Unit cost ($)</th>
                <th style={{ width: 130 }}>Line total</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const lineTotal = (Number(row.quantity) || 0) * (Number(row.estimated_unit_cost) || 0)
                return (
                  <tr key={i}>
                    <td><input type="text" value={row.item_name} onChange={(e) => updateRow(i, 'item_name', e.target.value)} placeholder="Item description" style={{ width: '100%' }} /></td>
                    <td><input type="number" min="1" value={row.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} placeholder="0" style={{ width: '100%' }} /></td>
                    <td><input type="number" min="0" step="0.01" value={row.estimated_unit_cost} onChange={(e) => updateRow(i, 'estimated_unit_cost', e.target.value)} placeholder="0.00" style={{ width: '100%' }} /></td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(lineTotal)}</td>
                    <td>
                      <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={() => removeRow(i)} disabled={rows.length <= 1} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, color: '#334155' }}>Estimated total</td>
                <td style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{formatCurrency(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>

          {requiresFinanceApproval(total) && (
            <p className="pr-finance-flag">Requests over {formatCurrency(FINANCE_THRESHOLD)} require Finance Officer approval.</p>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={resetForm}>Reset</button>
          <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </section>
  )
}

/* ---------- My Requests list (SCM view) ---------- */

function MyRequestsList({ requests, loading }) {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <section className="table-card">
      <div className="table-card__header">
        <h3>My Requests</h3>
        <span className="table-card__meta">{loading ? 'Loading…' : `${requests.length} request${requests.length === 1 ? '' : 's'}`}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Department</th>
            <th>Total est. cost</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {!loading && requests.length === 0 && (
            <tr><td colSpan={5} className="table-empty">No procurement requests yet.</td></tr>
          )}
          {requests.map((pr) => (
            <Fragment key={pr.id}>
              <tr className="clickable-row" onClick={() => setExpandedId(expandedId === pr.id ? null : pr.id)}>
                <td>{pr.id}</td>
                <td>{pr.department}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(pr.total_estimated_cost)}</td>
                <td><StatusBadge status={pr.status} /></td>
                <td>{formatDateTime(pr.created_at)}</td>
              </tr>
              {expandedId === pr.id && (
                <tr key={`${pr.id}-items`}>
                  <td colSpan={5} style={{ background: '#f8fafc', padding: '0.75rem 1rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#334155' }}>Line items</strong>
                    <table style={{ marginTop: '0.5rem' }}>
                      <thead>
                        <tr><th>Item</th><th>Qty</th><th>Unit cost</th><th>Total</th></tr>
                      </thead>
                      <tbody>
                        {pr.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.item_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.estimated_unit_cost)}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(item.quantity * item.estimated_unit_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {pr.rejection_reason && (
                      <p className="form-error" style={{ marginTop: '0.5rem' }}>Reason: {pr.rejection_reason}</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/* ---------- Approval Queue (PM / FO view) ---------- */

function ApprovalQueue({ requests, loading, userRole, onUpdated }) {
  const [expandedId, setExpandedId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'Pending'), [requests])
  const otherRequests = useMemo(() => requests.filter((r) => r.status !== 'Pending'), [requests])

  const handleApprove = async (pr) => {
    setActionError('')
    setSubmitting(true)
    try {
      const updated = await approveProcurementRequest(pr.id)
      onUpdated(updated)
      setExpandedId(null)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to approve request'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (pr) => {
    setActionError('')
    setSubmitting(true)
    try {
      const updated = await rejectProcurementRequest(pr.id, reason.trim())
      onUpdated(updated)
      setRejectingId(null)
      setReason('')
      setExpandedId(null)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to reject request'))
    } finally {
      setSubmitting(false)
    }
  }

  const canApprove = (pr) => {
    if (requiresFinanceApproval(pr.total_estimated_cost)) {
      return userRole === 'Finance Officer'
    }
    return userRole === 'Procurement Manager' || userRole === 'Finance Officer'
  }

  return (
    <>
      <section className="table-card" style={{ marginBottom: '1.25rem' }}>
        <div className="table-card__header">
          <h3>Pending Approval</h3>
          <span className="table-card__meta">{pendingRequests.length} pending</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Department</th>
              <th>Total est. cost</th>
              <th>Approval</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.length === 0 && (
              <tr><td colSpan={5} className="table-empty">No pending requests to review.</td></tr>
            )}
            {pendingRequests.map((pr) => (
              <Fragment key={pr.id}>
                <tr className="clickable-row" onClick={() => setExpandedId(expandedId === pr.id ? null : pr.id)}>
                  <td>{pr.id}</td>
                  <td>{pr.department}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(pr.total_estimated_cost)}</td>
                  <td>
                    {requiresFinanceApproval(pr.total_estimated_cost) ? (
                      <span className="pr-finance-flag pr-finance-flag--inline">Requires Finance Approval</span>
                    ) : (
                      <span className="status-pill status-pill--warn">PM / FO</span>
                    )}
                  </td>
                  <td>{formatDateTime(pr.created_at)}</td>
                </tr>
                {expandedId === pr.id && (
                  <tr key={`${pr.id}-detail`}>
                    <td colSpan={5} style={{ background: '#f8fafc', padding: '0.75rem 1rem' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#334155' }}>Line items ({pr.items.length})</strong>
                      <table style={{ marginTop: '0.5rem' }}>
                        <thead>
                          <tr><th>Item</th><th>Qty</th><th>Unit cost</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                          {pr.items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.item_name}</td>
                              <td>{item.quantity}</td>
                              <td>{formatCurrency(item.estimated_unit_cost)}</td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(item.quantity * item.estimated_unit_cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="approval-actions" style={{ marginTop: '0.75rem' }}>
                        {rejectingId === pr.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                            <label style={{ fontSize: '0.88rem', color: '#334155' }}>
                              Rejection reason
                              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this request is being rejected…" required style={{ marginTop: '0.3rem' }} />
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button type="button" className="dashboard-admin-btn dashboard-admin-btn--danger" disabled={submitting || !reason.trim()} onClick={() => handleReject(pr)}>
                                {submitting ? 'Rejecting…' : 'Confirm rejection'}
                              </button>
                              <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={() => { setRejectingId(null); setReason('') }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="dashboard-admin-btn dashboard-admin-btn--primary"
                              disabled={submitting || !canApprove(pr)}
                              onClick={() => handleApprove(pr)}
                              title={!canApprove(pr) ? 'Only Finance Officers can approve requests over $10,000' : ''}
                            >
                              {submitting ? 'Approving…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="dashboard-admin-btn dashboard-admin-btn--danger"
                              disabled={submitting}
                              onClick={() => setRejectingId(pr.id)}
                            >
                              Reject
                            </button>
                            {!canApprove(pr) && (
                              <span style={{ fontSize: '0.85rem', color: '#92400e', alignSelf: 'center' }}>
                                This request requires Finance Officer approval.
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {actionError && <p className="form-error" style={{ marginTop: '0.5rem' }}>{actionError}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>

      {otherRequests.length > 0 && (
        <section className="table-card">
          <div className="table-card__header">
            <h3>Processed Requests</h3>
            <span className="table-card__meta">{otherRequests.length} request{otherRequests.length === 1 ? '' : 's'}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Department</th>
                <th>Total est. cost</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {otherRequests.map((pr) => (
                <Fragment key={pr.id}>
                  <tr className="clickable-row" onClick={() => setExpandedId(expandedId === pr.id ? null : pr.id)}>
                    <td>{pr.id}</td>
                    <td>{pr.department}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(pr.total_estimated_cost)}</td>
                    <td><StatusBadge status={pr.status} /></td>
                    <td>{formatDateTime(pr.created_at)}</td>
                  </tr>
                  {expandedId === pr.id && (
                    <tr key={`${pr.id}-items2`}>
                      <td colSpan={5} style={{ background: '#f8fafc', padding: '0.75rem 1rem' }}>
                        <table>
                          <thead><tr><th>Item</th><th>Qty</th><th>Unit cost</th><th>Total</th></tr></thead>
                          <tbody>
                            {pr.items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.item_name}</td>
                                <td>{item.quantity}</td>
                                <td>{formatCurrency(item.estimated_unit_cost)}</td>
                                <td style={{ fontWeight: 600 }}>{formatCurrency(item.quantity * item.estimated_unit_cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {pr.rejection_reason && (
                          <p className="form-error" style={{ marginTop: '0.5rem' }}>Reason: {pr.rejection_reason}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}

/* ---------- Main Page ---------- */

export default function ProcurementRequests() {
  const { user } = useAuth()
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const role = user?.role
  const isSCM = role === 'Supply Chain Manager'
  const isApprover = role === 'Procurement Manager' || role === 'Finance Officer'

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchProcurementRequests()
      setAllRequests(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load procurement requests'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleCreated = (created) => {
    setAllRequests((prev) => [created, ...prev])
  }

  const handleUpdated = (updated) => {
    setAllRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
    )
  }

  // SCM sees their own requests
  const myRequests = useMemo(
    () => (isSCM ? allRequests.filter((r) => r.requested_by === user?.id) : []),
    [allRequests, isSCM, user],
  )

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Procurement Requests</h1>
          <p>
            {isSCM
              ? 'Create and track procurement requests for your department.'
              : isApprover
                ? 'Review and approve incoming procurement requests.'
                : 'View all procurement requests across the organization.'}
          </p>
        </div>
      </header>

      {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

      {isSCM && <CreateRequestForm onCreated={handleCreated} />}
      {isSCM && <MyRequestsList requests={myRequests} loading={loading} />}
      {isApprover && <ApprovalQueue requests={allRequests} loading={loading} userRole={role} onUpdated={handleUpdated} />}

      {!isSCM && !isApprover && (
        <section className="table-card">
          <div className="table-card__header">
            <h3>All Procurement Requests</h3>
            <span className="table-card__meta">{allRequests.length} total</span>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>Department</th><th>Total</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {allRequests.map((pr) => (
                <tr key={pr.id}>
                  <td>{pr.id}</td>
                  <td>{pr.department}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(pr.total_estimated_cost)}</td>
                  <td><StatusBadge status={pr.status} /></td>
                  <td>{formatDateTime(pr.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  )
}
