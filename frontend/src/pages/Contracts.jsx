import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  createContract,
  fetchContracts,
  fetchContract,
  updateContract,
  uploadContractFile,
} from '../api/contracts'
import { fetchVendors } from '../api/vendors'
import { getErrorMessage } from '../utils/auth'
import DetailTabBar from '../components/DetailTabBar'
import DiscussionPanel from '../components/DiscussionPanel'
import ComplianceDocumentsPanel from './ComplianceDocumentsPanel'
import '../dashboard-admin.css'
import '../vendor-management.css'

/* ── constants ─────────────────────────────────────────────────── */

const CONTRACT_STATUSES = ['Active', 'Expiring Soon', 'Expired', 'Draft']
const COMPLIANCE_FLAGS = ['Compliant', 'Non-Compliant', 'Under Review']

const STATUS_PILL_CLASS = {
  Active: 'status-pill--good',
  'Expiring Soon': 'status-pill--warn',
  Expired: 'status-pill--danger',
  Draft: 'status-pill--neutral',
}

const COMPLIANCE_PILL_CLASS = {
  Compliant: 'status-pill--good',
  'Non-Compliant': 'status-pill--danger',
  'Under Review': 'status-pill--warn',
}

/* ── helpers ────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const cls = STATUS_PILL_CLASS[status] ?? 'status-pill--neutral'
  return <span className={`status-pill ${cls}`}>{status}</span>
}

function ComplianceBadge({ flag }) {
  const cls = COMPLIANCE_PILL_CLASS[flag] ?? 'status-pill--neutral'
  return <span className={`status-pill ${cls}`}>{flag}</span>
}

function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value ?? 0)
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diff = expiry - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days
}

function formatCountdown(days) {
  if (days === null || days === undefined) return '—'
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Expires today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

/* ── Contract Detail Modal ───────────────────────────────────────── */

function ContractDetailModal({ contractId, user, onClose, onUpdated }) {
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const fileRef = useRef(null)

  const role = user?.role
  const canModify = role === 'Administrator' || role === 'Procurement Manager'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const detail = await fetchContract(contractId)
      setContract(detail)
      setEditForm({
        title: detail.title,
        compliance_flag: detail.compliance_flag,
        status: detail.status,
        terms: detail.terms,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load contract'))
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    load()
  }, [load])

  const handleUpdate = async () => {
    setError('')
    setUpdating(true)
    try {
      const updated = await updateContract(contractId, editForm)
      setContract(updated)
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update contract'))
    } finally {
      setUpdating(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const updated = await uploadContractFile(contractId, file)
      setContract(updated)
      onUpdated?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload file'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const daysLeft = contract ? getDaysUntilExpiry(contract.expiry_date) : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <div>
            <h2>Contract Details</h2>
            {contract && <p>{contract.contract_number}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-panel__body">
          {loading ? (
            <p className="loading-state">Loading contract…</p>
          ) : error && !contract ? (
            <p className="form-error">{error}</p>
          ) : contract ? (
            <>
              <DetailTabBar activeTab={activeTab} onChange={setActiveTab} />

              {activeTab === 'discussion' ? (
                <DiscussionPanel threadType="contract" referenceId={contractId} />
              ) : (
            <div className="contract-detail">
              <div className="contract-detail__header">
                <h3>{contract.title}</h3>
                <span className="contract-number">{contract.contract_number}</span>
              </div>

              <div className="contract-detail__badges">
                <StatusBadge status={contract.status} />
                <ComplianceBadge flag={contract.compliance_flag} />
              </div>

              <div className="contract-detail__grid">
                <div className="detail-item">
                  <label>Vendor ID</label>
                  <span>{contract.vendor_id}</span>
                </div>
                <div className="detail-item">
                  <label>Contract Value</label>
                  <span>{formatCurrency(contract.contract_value, contract.currency)}</span>
                </div>
                <div className="detail-item">
                  <label>Start Date</label>
                  <span>{formatDate(contract.start_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Expiry Date</label>
                  <span>{formatDate(contract.expiry_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Days Until Expiry</label>
                  <span className={`countdown ${daysLeft !== null && daysLeft <= 30 ? 'countdown--urgent' : ''}`}>
                    {formatCountdown(daysLeft)}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Renewal Notice</label>
                  <span>{contract.renewal_notice_period_days} days</span>
                </div>
              </div>

              {editing ? (
                <div className="contract-detail__edit">
                  {error && <p className="form-error">{error}</p>}
                  <form className="vendor-form">
                    <label>
                      Title
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </label>
                    <div className="vendor-form__grid">
                      <label>
                        Status
                        <select
                          value={editForm.status || ''}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        >
                          {CONTRACT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Compliance Flag
                        <select
                          value={editForm.compliance_flag || ''}
                          onChange={(e) => setEditForm({ ...editForm, compliance_flag: e.target.value })}
                        >
                          {COMPLIANCE_FLAGS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      Terms
                      <textarea
                        rows={4}
                        value={editForm.terms || ''}
                        onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                      />
                    </label>
                  </form>
                </div>
              ) : (
                <>
                  {contract.terms && (
                    <div className="contract-detail__terms">
                      <h4>Terms & Conditions</h4>
                      <p>{contract.terms}</p>
                    </div>
                  )}

                  {contract.file_url && (
                    <div className="contract-detail__file">
                      <h4>Contract File</h4>
                      <a href={contract.file_url} target="_blank" rel="noopener noreferrer" className="file-link">
                        Download Contract File
                      </a>
                    </div>
                  )}

                  {error && <p className="form-error">{error}</p>}
                </>
              )}
            </div>
              )}
            </>
          ) : null}
        </div>

        <div className="modal-panel__footer">
          {editing ? (
            <>
              <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={() => setEditing(false)} disabled={updating}>
                Cancel
              </button>
              <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={handleUpdate} disabled={updating}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={onClose}>
                Close
              </button>
              {canModify && (
                <>
                  <label className="dashboard-admin-btn dashboard-admin-btn--ghost upload-btn">
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      hidden
                    />
                  </label>
                  <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={() => setEditing(true)}>
                    Edit Contract
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Create Contract Modal ───────────────────────────────────────── */

function CreateContractModal({ onClose, onCreated }) {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    vendor_id: '',
    title: '',
    start_date: '',
    expiry_date: '',
    renewal_notice_period_days: 30,
    contract_value: '',
    currency: 'USD',
    terms: '',
    compliance_flag: 'Under Review',
    status: 'Draft',
  })
  const [file, setFile] = useState(null)

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const all = await fetchVendors({ status: 'Approved' })
        setVendors(all)
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load vendors'))
      } finally {
        setLoading(false)
      }
    }
    loadVendors()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        vendor_id: parseInt(form.vendor_id, 10),
        renewal_notice_period_days: parseInt(form.renewal_notice_period_days, 10),
        contract_value: parseFloat(form.contract_value),
        start_date: new Date(form.start_date).toISOString(),
        expiry_date: new Date(form.expiry_date).toISOString(),
      }
      await createContract(payload, file)
      onCreated?.()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create contract'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <div>
            <h2>Create New Contract</h2>
            <p>Select vendor and enter contract details</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-panel__body">
          {loading ? (
            <p className="loading-state">Loading vendors…</p>
          ) : (
            <form id="create-contract-form" className="vendor-form" onSubmit={handleSubmit}>
              {error && <p className="form-error">{error}</p>}

              <label>
                Vendor *
                <select
                  value={form.vendor_id}
                  onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                  required
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Contract Title *
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  maxLength={255}
                />
              </label>

              <div className="vendor-form__grid">
                <label>
                  Start Date *
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Expiry Date *
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="vendor-form__grid">
                <label>
                  Contract Value *
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.contract_value}
                    onChange={(e) => setForm({ ...form, contract_value: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Currency
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    maxLength={10}
                  />
                </label>
              </div>

              <label style={{ maxWidth: '220px' }}>
                Renewal Notice (days)
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.renewal_notice_period_days}
                  onChange={(e) => setForm({ ...form, renewal_notice_period_days: e.target.value })}
                />
              </label>

              <div className="vendor-form__grid">
                <label>
                  Compliance Flag
                  <select
                    value={form.compliance_flag}
                    onChange={(e) => setForm({ ...form, compliance_flag: e.target.value })}
                  >
                    {COMPLIANCE_FLAGS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Initial Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {CONTRACT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Terms & Conditions
                <textarea
                  rows={4}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  maxLength={10000}
                />
              </label>

              <label>
                Contract File (optional)
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </form>
          )}
        </div>

        {!loading && (
          <div className="modal-panel__footer">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="create-contract-form" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */

export default function Contracts() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ status: '', compliance_flag: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [pageTab, setPageTab] = useState('contracts')

  const role = user?.role
  const canCreate = role === 'Administrator' || role === 'Procurement Manager'
  const isVendor = role === 'Vendor'
  const isReadOnly = role === 'Auditor' || role === 'Finance Officer' || role === 'Supply Chain Manager'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.compliance_flag) params.compliance_flag = filters.compliance_flag
      const data = await fetchContracts(params)
      setContracts(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load contracts'))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    return {
      total: contracts.length,
      active: contracts.filter((c) => c.status === 'Active').length,
      expiringSoon: contracts.filter((c) => c.status === 'Expiring Soon').length,
      expired: contracts.filter((c) => c.status === 'Expired').length,
      nonCompliant: contracts.filter((c) => c.compliance_flag === 'Non-Compliant').length,
    }
  }, [contracts])

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Contracts & Compliance</h1>
          <p>
            {isVendor ? 'Your contracts and compliance certifications' : 'Manage vendor contracts and monitor ongoing compliance certifications'}
          </p>
        </div>
        {canCreate && pageTab === 'contracts' && (
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={() => setShowCreate(true)}>
              + New Contract
            </button>
          </div>
        )}
      </header>

      <DetailTabBar
        activeTab={pageTab}
        onChange={setPageTab}
        tabs={[
          { id: 'contracts', label: 'Contracts' },
          { id: 'documents', label: 'Compliance Certifications' },
        ]}
      />

      {pageTab === 'documents' ? (
        <div style={{ marginTop: '1rem' }}>
          <ComplianceDocumentsPanel user={user} />
        </div>
      ) : (
        <>
      <div className="dashboard-admin-grid dashboard-admin-grid--cards-4">
        <article className="dashboard-card">
          <div className="dashboard-card__label">Total Contracts</div>
          <div className="dashboard-card__value">{stats.total}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Active</div>
          <div className="dashboard-card__value">{stats.active}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Expiring Soon</div>
          <div className="dashboard-card__value">{stats.expiringSoon}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Non-Compliant</div>
          <div className="dashboard-card__value">{stats.nonCompliant}</div>
        </article>
      </div>

      <div className="page-toolbar" style={{ marginTop: '1rem' }}>
        <div className="filter-group">
          <select
            className="filter-search"
            style={{ width: 'auto', minWidth: '160px' }}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            {CONTRACT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="filter-search"
            style={{ width: 'auto', minWidth: '160px' }}
            value={filters.compliance_flag}
            onChange={(e) => setFilters({ ...filters, compliance_flag: e.target.value })}
          >
            <option value="">All Compliance</option>
            {COMPLIANCE_FLAGS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          {(filters.status || filters.compliance_flag) && (
            <button type="button" className="btn-text" onClick={() => setFilters({ status: '', compliance_flag: '' })}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="loading-state">Loading contracts…</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : contracts.length === 0 ? (
        <section className="table-card">
          <p style={{ color: '#64748b' }}>No contracts found.</p>
          {canCreate && (
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary" onClick={() => setShowCreate(true)} style={{ marginTop: '0.75rem' }}>
              Create your first contract
            </button>
          )}
        </section>
      ) : (
        <section className="table-card">
          <div className="table-card__header">
            <h3>Contracts</h3>
            <span className="table-card__meta">{contracts.length} contract{contracts.length === 1 ? '' : 's'}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Title</th>
                <th>Vendor ID</th>
                <th>Value</th>
                <th>Expiry Date</th>
                <th>Countdown</th>
                <th>Status</th>
                <th>Compliance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const daysLeft = getDaysUntilExpiry(c.expiry_date)
                const isUrgent = daysLeft !== null && daysLeft <= 30
                return (
                  <tr key={c.id} className={isUrgent ? 'row--urgent' : ''}>
                    <td className="col-mono">{c.contract_number}</td>
                    <td className="col-title">{c.title}</td>
                    <td>{c.vendor_id}</td>
                    <td className="col-currency">{formatCurrency(c.contract_value, c.currency)}</td>
                    <td>{formatDate(c.expiry_date)}</td>
                    <td className={`col-countdown ${isUrgent ? 'countdown--urgent' : ''}`}>
                      {formatCountdown(daysLeft)}
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td><ComplianceBadge flag={c.compliance_flag} /></td>
                    <td>
                      <button
                        type="button"
                        className="dashboard-admin-btn dashboard-admin-btn--ghost"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                        onClick={() => setSelectedId(c.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Modals */}
      {selectedId && (
        <ContractDetailModal
          contractId={selectedId}
          user={user}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
        />
      )}

      {showCreate && (
        <CreateContractModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
        </>
      )}
    </section>
  )
}
