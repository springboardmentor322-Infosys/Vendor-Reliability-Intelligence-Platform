import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchInvoices, updateInvoiceStatus } from '../api/invoices'
import { formatMoney, statusPillClass } from '../components/DashboardWidgets'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'
import '../vendor-management.css'

const STATUSES = ['Paid', 'Pending', 'Overdue']

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Invoices() {
  const { user } = useAuth()
  const isFinance = user?.role === 'Finance Officer'
  const isVendor = user?.role === 'Vendor'
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      setInvoices(await fetchInvoices(params))
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load invoices'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return invoices
    return invoices.filter((invoice) =>
      [invoice.invoice_number, invoice.po_number, invoice.vendor_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [invoices, search])

  const handleStatusChange = async (invoiceId, status) => {
    setSavingId(invoiceId)
    setError('')
    setNotice('')
    try {
      const updated = await updateInvoiceStatus(invoiceId, status)
      setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, ...updated } : item)))
      setNotice(`Invoice ${updated.invoice_number} marked ${updated.status}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update invoice status'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>{isVendor ? 'My Invoices & Payments' : 'Invoices & Payments'}</h1>
          <p>
            {isVendor
              ? 'View invoices generated from your delivered and completed purchase orders.'
              : 'Track invoiced amounts, due dates, and payment status from live purchase orders.'}
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

      <div className="page-toolbar">
        <div className="page-toolbar__filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          className="filter-search"
          placeholder="Search invoice, PO, or vendor…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Invoices</h3>
          <span className="table-card__meta">{loading ? 'Loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>PO ref</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Due date</th>
              <th>Status</th>
              {isFinance ? <th>Update</th> : null}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={isFinance ? 7 : 6} className="table-empty">
                  No invoices found.
                </td>
              </tr>
            ) : null}
            {filtered.map((invoice) => (
              <tr key={invoice.id}>
                <td style={{ fontWeight: 600 }}>{invoice.invoice_number}</td>
                <td>{invoice.po_number || `PO #${invoice.purchase_order_id}`}</td>
                <td>{invoice.vendor_name || '—'}</td>
                <td style={{ fontWeight: 600 }}>{formatMoney(invoice.amount)}</td>
                <td>{formatDate(invoice.due_date)}</td>
                <td>
                  <span className={`status-pill ${statusPillClass(invoice.status)}`}>{invoice.status}</span>
                </td>
                {isFinance ? (
                  <td>
                    <select
                      value={invoice.status}
                      disabled={savingId === invoice.id}
                      onChange={(event) => handleStatusChange(invoice.id, event.target.value)}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}
