import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createComplianceDocument,
  fetchComplianceDocuments,
  updateComplianceDocument,
} from '../api/complianceDocuments'
import { fetchMyVendor, fetchVendors } from '../api/vendors'
import { getErrorMessage } from '../utils/auth'

const DOC_STATUSES = ['Pending', 'Valid', 'Expired', 'Revoked']

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function expiryTone(expiresAt) {
  if (!expiresAt) return 'ok'
  const days = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'expired'
  if (days <= 30) return 'soon'
  return 'ok'
}

function statusPill(status, tone) {
  if (tone === 'expired' || status === 'Expired' || status === 'Revoked') return 'status-pill--danger'
  if (tone === 'soon' || status === 'Pending') return 'status-pill--warn'
  return 'status-pill--good'
}

export default function ComplianceDocumentsPanel({ user }) {
  const role = user?.role
  const isVendor = role === 'Vendor'
  const canUpload = role === 'Administrator' || role === 'Procurement Manager' || isVendor
  const canUpdate = role === 'Administrator' || role === 'Procurement Manager'

  const [documents, setDocuments] = useState([])
  const [vendors, setVendors] = useState([])
  const [vendorFilter, setVendorFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    vendorId: '',
    documentType: '',
    documentName: '',
    expiresAt: '',
    notes: '',
  })
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (!isVendor && vendorFilter) params.vendor_id = Number(vendorFilter)
      const [rows, vendorList, myVendor] = await Promise.all([
        fetchComplianceDocuments(params),
        isVendor ? Promise.resolve([]) : fetchVendors(),
        isVendor ? fetchMyVendor() : Promise.resolve(null),
      ])
      setDocuments(rows)
      setVendors(vendorList)
      if (myVendor?.id) {
        setForm((current) => ({ ...current, vendorId: String(myVendor.id) }))
      } else if (!isVendor && !form.vendorId && vendorList[0]) {
        setForm((current) => ({ ...current, vendorId: String(vendorList[0].id) }))
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load compliance documents'))
    } finally {
      setLoading(false)
    }
  }, [isVendor, vendorFilter])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const tones = documents.map((doc) => expiryTone(doc.expires_at))
    return {
      total: documents.length,
      soon: tones.filter((tone) => tone === 'soon').length,
      expired: tones.filter((tone) => tone === 'expired').length,
    }
  }, [documents])

  const handleUpload = async (event) => {
    event.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Choose a certification file to upload')
      return
    }
    setUploading(true)
    setError('')
    setNotice('')
    try {
      await createComplianceDocument({
        vendorId: Number(form.vendorId),
        documentType: form.documentType,
        documentName: form.documentName,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        notes: form.notes,
        file,
      })
      setNotice('Certification uploaded')
      setForm((current) => ({ ...current, documentType: '', documentName: '', expiresAt: '', notes: '' }))
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload compliance document'))
    } finally {
      setUploading(false)
    }
  }

  const handleUpdate = async (documentId, payload) => {
    setSavingId(documentId)
    setError('')
    setNotice('')
    try {
      const updated = await updateComplianceDocument(documentId, payload)
      setDocuments((current) => current.map((item) => (item.id === documentId ? { ...item, ...updated } : item)))
      setNotice(`Updated ${updated.document_name}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update document'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <div className="dashboard-admin-grid dashboard-admin-grid--cards-4" style={{ marginBottom: '1rem' }}>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Certifications</div>
          <div className="dashboard-card__value">{stats.total}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Expiring soon</div>
          <div className="dashboard-card__value">{stats.soon}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Expired</div>
          <div className="dashboard-card__value">{stats.expired}</div>
        </article>
      </div>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}
      {notice ? <div className="page-alert page-alert--success">{notice}</div> : null}

      {canUpload ? (
        <form className="table-card" style={{ marginBottom: '1rem', padding: '1rem' }} onSubmit={handleUpload}>
          <div className="table-card__header">
            <h3>Upload certification</h3>
          </div>
          <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            {!isVendor ? (
              <select
                required
                value={form.vendorId}
                onChange={(event) => setForm({ ...form, vendorId: event.target.value })}
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              required
              className="filter-search"
              placeholder="Document type (ISO, insurance…)"
              value={form.documentType}
              onChange={(event) => setForm({ ...form, documentType: event.target.value })}
            />
            <input
              required
              className="filter-search"
              placeholder="Document name"
              value={form.documentName}
              onChange={(event) => setForm({ ...form, documentName: event.target.value })}
            />
            <input
              type="date"
              className="filter-search"
              value={form.expiresAt}
              onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
            />
            <input ref={fileRef} type="file" required />
            <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="page-toolbar">
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
        <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Compliance documents</h3>
          <span className="table-card__meta">{loading ? 'Loading…' : `${documents.length} record${documents.length === 1 ? '' : 's'}`}</span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading certifications…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Type</th>
                <th>Name</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>File</th>
                {canUpdate ? <th>Update</th> : null}
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={canUpdate ? 7 : 6} className="table-empty">
                    No compliance documents found.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const tone = expiryTone(doc.expires_at)
                  return (
                    <tr key={doc.id} className={tone === 'expired' || tone === 'soon' ? 'row--urgent' : ''}>
                      <td>{doc.vendor_name || '—'}</td>
                      <td>{doc.document_type}</td>
                      <td style={{ fontWeight: 600 }}>{doc.document_name}</td>
                      <td>
                        <span className={`status-pill ${statusPill(doc.status, tone)}`}>{doc.status}</span>
                        {tone === 'soon' ? <span className="status-pill status-pill--warn">Expiring soon</span> : null}
                        {tone === 'expired' ? <span className="status-pill status-pill--danger">Expired</span> : null}
                      </td>
                      <td>{formatDate(doc.expires_at)}</td>
                      <td>
                        {doc.file_url ? (
                          <a href={doc.file_url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      {canUpdate ? (
                        <td>
                          <select
                            value={doc.status}
                            disabled={savingId === doc.id}
                            onChange={(event) => handleUpdate(doc.id, { status: event.target.value })}
                          >
                            {DOC_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            disabled={savingId === doc.id}
                            defaultValue={doc.expires_at ? String(doc.expires_at).slice(0, 10) : ''}
                            onBlur={(event) => {
                              if (!event.target.value) return
                              handleUpdate(doc.id, { expires_at: new Date(event.target.value).toISOString() })
                            }}
                          />
                        </td>
                      ) : null}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
