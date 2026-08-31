import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createComplianceDocument, fetchComplianceDocuments } from '../api/complianceDocuments'
import { fetchMyVendor, fetchVendorDocuments, uploadVendorDocument } from '../api/vendors'
import { getErrorMessage } from '../utils/auth'
import DocumentViewLink from '../components/DocumentViewLink'
import { DOCUMENT_TYPES, formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

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
  if (status === 'Rejected' || tone === 'expired') return 'status-pill--danger'
  if (status === 'Pending' || tone === 'soon') return 'status-pill--warn'
  return 'status-pill--good'
}

export default function MyDocuments() {
  const [vendor, setVendor] = useState(null)
  const [vendorDocs, setVendorDocs] = useState([])
  const [complianceDocs, setComplianceDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [uploadingVendor, setUploadingVendor] = useState(false)
  const [uploadingCompliance, setUploadingCompliance] = useState(false)
  const [vendorDocType, setVendorDocType] = useState(DOCUMENT_TYPES[0])
  const vendorFileRef = useRef(null)
  const complianceFileRef = useRef(null)
  const [complianceForm, setComplianceForm] = useState({
    documentType: '',
    documentName: '',
    expiresAt: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let mine = null
      try {
        mine = await fetchMyVendor()
      } catch (err) {
        if (err?.response?.status !== 404) throw err
      }
      setVendor(mine)
      if (!mine?.id) {
        setVendorDocs([])
        setComplianceDocs([])
        return
      }
      const [docs, certifications] = await Promise.all([
        fetchVendorDocuments(mine.id),
        fetchComplianceDocuments(),
      ])
      setVendorDocs(docs)
      setComplianceDocs(certifications)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load documents'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const tones = complianceDocs.map((doc) => expiryTone(doc.expires_at))
    return {
      vendorCount: vendorDocs.length,
      complianceCount: complianceDocs.length,
      soon: tones.filter((tone) => tone === 'soon').length,
      expired: tones.filter((tone) => tone === 'expired').length,
    }
  }, [vendorDocs, complianceDocs])

  const handleVendorUpload = async (event) => {
    event.preventDefault()
    const file = vendorFileRef.current?.files?.[0]
    if (!vendor?.id) {
      setError('Create your vendor profile before uploading documents.')
      return
    }
    if (!file) {
      setError('Choose a vendor document to upload.')
      return
    }
    setUploadingVendor(true)
    setError('')
    setNotice('')
    try {
      await uploadVendorDocument(vendor.id, vendorDocType, file)
      setNotice('Vendor document uploaded')
      if (vendorFileRef.current) vendorFileRef.current.value = ''
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload vendor document'))
    } finally {
      setUploadingVendor(false)
    }
  }

  const handleComplianceUpload = async (event) => {
    event.preventDefault()
    const file = complianceFileRef.current?.files?.[0]
    if (!vendor?.id) {
      setError('Create your vendor profile before uploading documents.')
      return
    }
    if (!file) {
      setError('Choose a compliance file to upload.')
      return
    }
    setUploadingCompliance(true)
    setError('')
    setNotice('')
    try {
      await createComplianceDocument({
        vendorId: vendor.id,
        documentType: complianceForm.documentType,
        documentName: complianceForm.documentName,
        expiresAt: complianceForm.expiresAt ? new Date(complianceForm.expiresAt).toISOString() : null,
        notes: complianceForm.notes,
        file,
      })
      setNotice('Compliance document uploaded')
      setComplianceForm({ documentType: '', documentName: '', expiresAt: '', notes: '' })
      if (complianceFileRef.current) complianceFileRef.current.value = ''
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload compliance document'))
    } finally {
      setUploadingCompliance(false)
    }
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>My Documents</h1>
          <p>
            Registration documents are used only for vendor approval. Compliance certifications
            (ISO, insurance, and similar) have their own Approved/Rejected status and do not
            change your vendor registration status.
          </p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}
      {notice ? <div className="page-alert page-alert--success">{notice}</div> : null}

      {!vendor?.id && !loading ? (
        <div className="page-alert page-alert--error">
          No vendor profile is linked to this account yet. Complete My Vendor Profile first.
        </div>
      ) : null}

      <div className="dashboard-admin-grid dashboard-admin-grid--cards-4" style={{ marginBottom: '1rem' }}>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Registration documents</div>
          <div className="dashboard-card__value">{stats.vendorCount}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Compliance certifications</div>
          <div className="dashboard-card__value">{stats.complianceCount}</div>
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

      <form className="table-card" style={{ marginBottom: '1rem', padding: '1rem' }} onSubmit={handleVendorUpload}>
        <div className="table-card__header">
          <h3>Upload registration document</h3>
        </div>
        <p className="table-empty" style={{ padding: '0 0 0.75rem' }}>
          These files are reviewed in Vendor Management as part of Pending → Under Review → Approved/Rejected.
        </p>
        <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <select value={vendorDocType} onChange={(event) => setVendorDocType(event.target.value)}>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input ref={vendorFileRef} type="file" required />
          <button
            type="submit"
            className="dashboard-admin-btn dashboard-admin-btn--primary"
            disabled={uploadingVendor || !vendor?.id}
          >
            {uploadingVendor ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>

      <section className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-card__header">
          <h3>Registration Documents</h3>
          <span className="table-card__meta">
            {loading ? 'Loading…' : `${vendorDocs.length} file${vendorDocs.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading documents…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Uploaded</th>
                <th>Used for</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {vendorDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-empty">
                    No registration documents uploaded yet.
                  </td>
                </tr>
              ) : (
                vendorDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600 }}>{doc.doc_type}</td>
                    <td>{formatDateTime(doc.uploaded_at)}</td>
                    <td>Vendor approval pipeline</td>
                    <td>
                      <DocumentViewLink href={doc.file_url} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <form className="table-card" style={{ marginBottom: '1rem', padding: '1rem' }} onSubmit={handleComplianceUpload}>
        <div className="table-card__header">
          <h3>Upload compliance certification</h3>
        </div>
        <p className="table-empty" style={{ padding: '0 0 0.75rem' }}>
          Ongoing certifications (ISO, insurance, etc.). Status is Approved/Rejected independently of vendor approval.
        </p>
        <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <input
            required
            className="filter-search"
            placeholder="Document type (ISO, insurance…)"
            value={complianceForm.documentType}
            onChange={(event) => setComplianceForm({ ...complianceForm, documentType: event.target.value })}
          />
          <input
            required
            className="filter-search"
            placeholder="Document name"
            value={complianceForm.documentName}
            onChange={(event) => setComplianceForm({ ...complianceForm, documentName: event.target.value })}
          />
          <input
            type="date"
            className="filter-search"
            value={complianceForm.expiresAt}
            onChange={(event) => setComplianceForm({ ...complianceForm, expiresAt: event.target.value })}
          />
          <input ref={complianceFileRef} type="file" required />
          <button
            type="submit"
            className="dashboard-admin-btn dashboard-admin-btn--primary"
            disabled={uploadingCompliance || !vendor?.id}
          >
            {uploadingCompliance ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Compliance Certifications</h3>
          <span className="table-card__meta">
            {loading ? 'Loading…' : `${complianceDocs.length} record${complianceDocs.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading certifications…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Uploaded</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {complianceDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No compliance certifications uploaded yet.
                  </td>
                </tr>
              ) : (
                complianceDocs.map((doc) => {
                  const tone = expiryTone(doc.expires_at)
                  return (
                    <tr key={doc.id} className={tone === 'expired' || tone === 'soon' ? 'row--urgent' : ''}>
                      <td>{doc.document_type}</td>
                      <td style={{ fontWeight: 600 }}>{doc.document_name}</td>
                      <td>
                        <span className={`status-pill ${statusPill(doc.status, tone)}`}>{doc.status}</span>
                        {tone === 'soon' ? <span className="status-pill status-pill--warn">Expiring soon</span> : null}
                        {tone === 'expired' ? <span className="status-pill status-pill--danger">Expired</span> : null}
                      </td>
                      <td>{formatDate(doc.expires_at)}</td>
                      <td>{formatDateTime(doc.uploaded_at)}</td>
                      <td>
                        <DocumentViewLink href={doc.file_url} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
