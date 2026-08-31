import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  createVendor,
  fetchMyVendor,
  fetchVendorCategories,
  updateVendor,
  uploadVendorDocument,
} from '../api/vendors'
import { getErrorMessage } from '../utils/auth'
import DocumentViewLink from '../components/DocumentViewLink'
import {
  APPROVAL_PIPELINE,
  DOCUMENT_TYPES,
  formatDateTime,
  getPipelineStepState,
  getStatusPillClass,
} from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

const EMPTY_CONTACT = { contact_name: '', designation: '', email: '', phone: '' }

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

function DocumentUploadPanel({ vendorId, onUploaded }) {
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0])
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Choose a file to upload.')
      return
    }

    setError('')
    setUploading(true)
    try {
      await uploadVendorDocument(vendorId, docType, file)
      setFile(null)
      onUploaded()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload document'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleUpload}>
      <label>
        Document type
        <select value={docType} onChange={(event) => setDocType(event.target.value)}>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        File (PDF, DOC, DOCX, PNG, JPG)
        <input
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={uploading}>
        {uploading ? 'Uploading…' : 'Upload document'}
      </button>
    </form>
  )
}

export default function VendorProfile() {
  const { user } = useAuth()
  const [vendor, setVendor] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profile, categoryList] = await Promise.all([
        fetchMyVendor(),
        fetchVendorCategories(),
      ])
      setVendor(profile)
      setCategories(categoryList)
      setForm({
        name: profile.name,
        category_id: String(profile.category.id),
        contact_email: profile.contact_email,
        contact_phone: profile.contact_phone,
        address: profile.address,
        contacts: profile.contacts?.length
          ? profile.contacts.map(({ contact_name, designation, email, phone }) => ({
              contact_name,
              designation: designation ?? '',
              email,
              phone,
            }))
          : [],
      })
    } catch (err) {
      if (err?.response?.status === 404) {
        const categoryList = await fetchVendorCategories()
        setCategories(categoryList)
        setShowCreateForm(true)
        setForm({
          name: user?.name ?? '',
          category_id: '',
          contact_email: user?.email ?? '',
          contact_phone: '',
          address: '',
          contacts: [],
        })
      } else {
        setError(getErrorMessage(err, 'Failed to load vendor profile'))
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const addContact = () => {
    setForm((current) => ({
      ...current,
      contacts: [...current.contacts, { ...EMPTY_CONTACT }],
    }))
  }

  const updateContact = (index, field, value) => {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }))
  }

  const removeContact = (index) => {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.filter((_, contactIndex) => contactIndex !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const payload = {
      name: form.name,
      category_id: Number(form.category_id),
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      address: form.address,
      contacts: form.contacts.filter((contact) => contact.contact_name && contact.email && contact.phone),
    }

    try {
      if (showCreateForm) {
        await createVendor(payload)
        setShowCreateForm(false)
        setSuccess('Vendor profile created. It is now Pending review.')
      } else {
        await updateVendor(vendor.id, payload)
        setSuccess('Vendor profile updated successfully.')
      }
      setEditing(false)
      await loadProfile()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save vendor profile'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (vendor) {
      setForm({
        name: vendor.name,
        category_id: String(vendor.category.id),
        contact_email: vendor.contact_email,
        contact_phone: vendor.contact_phone,
        address: vendor.address,
        contacts: vendor.contacts?.length
          ? vendor.contacts.map(({ contact_name, designation, email, phone }) => ({
              contact_name,
              designation: designation ?? '',
              email,
              phone,
            }))
          : [],
      })
    }
    setEditing(false)
    setError('')
  }

  if (loading) {
    return (
      <section className="dashboard-admin-main page-enter">
        <p className="loading-state">Loading your vendor profile…</p>
      </section>
    )
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>My Vendor Profile</h1>
          <p>Manage your supplier business details. Account settings remain under Profile.</p>
        </div>
        {!showCreateForm && vendor && !editing && (
          <div className="dashboard-admin-header__actions">
            <button
              type="button"
              className="dashboard-admin-btn dashboard-admin-btn--primary"
              onClick={() => setEditing(true)}
            >
              Edit profile
            </button>
          </div>
        )}
      </header>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      {showCreateForm ? (
        <section className="table-card">
          <div className="table-card__header">
            <h3>Complete your vendor profile</h3>
          </div>
          <form className="vendor-form" onSubmit={handleSubmit}>
            <div className="vendor-form__grid">
              <label>
                Vendor name
                <input type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
              </label>
              <label>
                Category
                <select value={form.category_id} onChange={(event) => updateField('category_id', event.target.value)} required>
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Primary email
                <input type="email" value={form.contact_email} onChange={(event) => updateField('contact_email', event.target.value)} required />
              </label>
              <label>
                Primary phone
                <input type="tel" value={form.contact_phone} onChange={(event) => updateField('contact_phone', event.target.value)} required />
              </label>
            </div>
            <label>
              Address
              <textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} required />
            </label>
            <p className="table-empty" style={{ padding: '0.5rem 0' }}>
              After submitting your profile you can upload registration documents from this page
              for the vendor approval pipeline. Ongoing ISO/insurance certifications belong under
              Contracts & Compliance / My Documents.
            </p>
            <div className="modal-panel__footer" style={{ borderTop: 0, paddingLeft: 0, paddingRight: 0 }}>
              <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </form>
        </section>
      ) : editing && form ? (
        <section className="table-card">
          <form className="vendor-form" onSubmit={handleSubmit}>
            <div className="vendor-form__grid">
              <label>
                Vendor name
                <input type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
              </label>
              <label>
                Category
                <select value={form.category_id} onChange={(event) => updateField('category_id', event.target.value)} required>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Primary email
                <input type="email" value={form.contact_email} onChange={(event) => updateField('contact_email', event.target.value)} required />
              </label>
              <label>
                Primary phone
                <input type="tel" value={form.contact_phone} onChange={(event) => updateField('contact_phone', event.target.value)} required />
              </label>
            </div>
            <label>
              Address
              <textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} required />
            </label>

            <section className="vendor-section">
              <h3>Additional contacts</h3>
              <div className="contacts-editor">
                {form.contacts.map((contact, index) => (
                  <div key={index} className="contact-editor-row">
                    <label>
                      Name
                      <input type="text" value={contact.contact_name} onChange={(event) => updateContact(index, 'contact_name', event.target.value)} />
                    </label>
                    <label>
                      Designation
                      <input type="text" value={contact.designation} onChange={(event) => updateContact(index, 'designation', event.target.value)} />
                    </label>
                    <label>
                      Email
                      <input type="email" value={contact.email} onChange={(event) => updateContact(index, 'email', event.target.value)} />
                    </label>
                    <label>
                      Phone
                      <input type="tel" value={contact.phone} onChange={(event) => updateContact(index, 'phone', event.target.value)} />
                    </label>
                    <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={() => removeContact(index)}>
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={addContact}>
                  Add contact
                </button>
              </div>
            </section>

            {vendor?.id && (
              <section className="vendor-section">
                <h3>Upload documentation</h3>
                <DocumentUploadPanel vendorId={vendor.id} onUploaded={loadProfile} />
              </section>
            )}

            <div className="modal-panel__footer" style={{ borderTop: 0, paddingLeft: 0, paddingRight: 0 }}>
              <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        vendor && (
          <>
            <div className="approval-status-banner">
              <div>
                <strong>Approval status</strong>
                <ApprovalPipeline status={vendor.status} />
              </div>
              <StatusBadge status={vendor.status} />
            </div>

            <section className="table-card">
              <div className="table-card__header">
                <h3>{vendor.name}</h3>
                <StatusBadge status={vendor.status} />
              </div>
              <dl className="detail-grid">
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
                <div>
                  <dt>Registered</dt>
                  <dd>{formatDateTime(vendor.created_at)}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>Address</dt>
                  <dd>{vendor.address}</dd>
                </div>
                {vendor.rejection_reason && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <dt>Rejection reason</dt>
                    <dd>{vendor.rejection_reason}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="table-card" style={{ marginTop: '1rem' }}>
              <div className="table-card__header">
                <h3>Contacts</h3>
              </div>
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

            <section className="table-card" style={{ marginTop: '1rem' }}>
              <div className="table-card__header">
                <h3>Registration Documents</h3>
              </div>
              <p className="table-empty" style={{ padding: '0 1rem' }}>
                Used only for vendor approval (Pending → Under Review → Approved/Rejected).
              </p>
              {vendor.documents?.length ? (
                <div className="doc-list">
                  {vendor.documents.map((doc) => (
                    <div key={doc.id} className="doc-card">
                      <strong>{doc.doc_type}</strong>
                      <span>Uploaded {formatDateTime(doc.uploaded_at)}</span>
                      <span>
                        <DocumentViewLink href={doc.file_url} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="table-empty">No registration documents uploaded yet.</p>
              )}
              <section className="vendor-section" style={{ marginTop: '1rem' }}>
                <h3>Upload registration document</h3>
                <DocumentUploadPanel vendorId={vendor.id} onUploaded={loadProfile} />
              </section>
            </section>

            <section className="table-card" style={{ marginTop: '1rem' }}>
              <div className="table-card__header">
                <h3>Status history</h3>
              </div>
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
          </>
        )
      )}
    </section>
  )
}
