import { useCallback, useEffect, useState } from 'react'
import { fetchSystemSettings, updateSystemSettings } from '../api/admin'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

export default function SystemSettings() {
  const [form, setForm] = useState({
    contract_expiry_alert_days: 30,
    invoice_due_days: 30,
  })
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchSystemSettings()
      setForm({
        contract_expiry_alert_days: data.contract_expiry_alert_days,
        invoice_due_days: data.invoice_due_days,
      })
      setUpdatedAt(data.updated_at)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load system settings'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const data = await updateSystemSettings({
        contract_expiry_alert_days: Number(form.contract_expiry_alert_days),
        invoice_due_days: Number(form.invoice_due_days),
      })
      setForm({
        contract_expiry_alert_days: data.contract_expiry_alert_days,
        invoice_due_days: data.invoice_due_days,
      })
      setUpdatedAt(data.updated_at)
      setNotice('System settings saved')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save system settings'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>System Settings</h1>
          <p>Application-wide defaults. These do not change individual user account preferences.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}
      {notice ? <div className="page-alert page-alert--success">{notice}</div> : null}

      <section className="table-card" style={{ padding: '1rem' }}>
        <form className="auth-form settings-form" onSubmit={handleSubmit}>
          <label>
            Contract expiry alert window (days)
            <input
              type="number"
              min={1}
              max={365}
              required
              value={form.contract_expiry_alert_days}
              onChange={(event) =>
                setForm((current) => ({ ...current, contract_expiry_alert_days: event.target.value }))
              }
            />
          </label>
          <p className="table-empty" style={{ padding: 0 }}>
            Contracts entering this window are treated as expiring soon for monitoring.
          </p>
          <label>
            Invoice due days
            <input
              type="number"
              min={1}
              max={365}
              required
              value={form.invoice_due_days}
              onChange={(event) => setForm((current) => ({ ...current, invoice_due_days: event.target.value }))}
            />
          </label>
          <p className="table-empty" style={{ padding: 0 }}>
            Default number of days from invoice creation until payment is due.
          </p>
          {updatedAt ? <p className="table-empty">Last updated {formatDateTime(updatedAt)}</p> : null}
          <button type="submit" className="dashboard-admin-btn dashboard-admin-btn--primary" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </section>
    </section>
  )
}
