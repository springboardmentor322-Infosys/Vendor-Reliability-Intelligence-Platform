import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchContracts } from '../api/contracts'
import { fetchMessageHistory } from '../api/messages'
import { fetchPurchaseOrders } from '../api/purchaseOrders'
import { fetchVendors } from '../api/vendors'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

export default function CommunicationHistory() {
  const { user } = useAuth()
  const isVendor = user?.role === 'Vendor'
  const [messages, setMessages] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [contracts, setContracts] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [poFilter, setPoFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [history, pos, contractRows, vendorRows] = await Promise.all([
        fetchMessageHistory(),
        fetchPurchaseOrders(),
        fetchContracts(),
        isVendor ? Promise.resolve([]) : fetchVendors(),
      ])
      setMessages(history)
      setPurchaseOrders(pos)
      setContracts(contractRows)
      setVendors(vendorRows)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load communication history'))
    } finally {
      setLoading(false)
    }
  }, [isVendor])

  useEffect(() => {
    load()
  }, [load])

  const visiblePos = useMemo(
    () => purchaseOrders.filter((po) => !vendorFilter || String(po.vendor_id) === vendorFilter),
    [purchaseOrders, vendorFilter],
  )
  const visibleContracts = useMemo(
    () => contracts.filter((contract) => !vendorFilter || String(contract.vendor_id) === vendorFilter),
    [contracts, vendorFilter],
  )

  const filtered = useMemo(() => {
    return messages.filter((message) => {
      if (vendorFilter && String(message.vendor_id) !== vendorFilter) return false
      if (poFilter) {
        if (message.thread_type !== 'purchase_order' || String(message.reference_id) !== poFilter) return false
      }
      if (contractFilter) {
        if (message.thread_type !== 'contract' || String(message.reference_id) !== contractFilter) return false
      }
      return true
    })
  }, [messages, vendorFilter, poFilter, contractFilter])

  const threadLabel = (type) => (type === 'purchase_order' ? 'Purchase order' : 'Contract')

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Communication History</h1>
          <p>
            {isVendor
              ? 'All messages on your purchase orders and contracts. Open a PO or contract to continue that thread.'
              : 'All discussion messages across accessible purchase orders and contracts. Per-PO and per-contract threads are unchanged.'}
          </p>
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
          <select
            value={poFilter}
            onChange={(event) => {
              setPoFilter(event.target.value)
              if (event.target.value) setContractFilter('')
            }}
          >
            <option value="">All purchase orders</option>
            {visiblePos.map((po) => (
              <option key={po.id} value={po.id}>
                {po.po_number}
              </option>
            ))}
          </select>
          <select
            value={contractFilter}
            onChange={(event) => {
              setContractFilter(event.target.value)
              if (event.target.value) setPoFilter('')
            }}
          >
            <option value="">All contracts</option>
            {visibleContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.contract_number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Messages</h3>
          <span className="table-card__meta">
            {loading ? 'Loading…' : `${filtered.length} message${filtered.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading messages…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sender</th>
                <th>Timestamp</th>
                <th>Message</th>
                <th>Vendor</th>
                <th>PO / Contract</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No messages found for the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((message) => (
                  <tr key={message.id}>
                    <td style={{ fontWeight: 600 }}>{message.sender_name || `User #${message.sender_id}`}</td>
                    <td>{formatDateTime(message.created_at)}</td>
                    <td>{message.content}</td>
                    <td>{message.vendor_name || '—'}</td>
                    <td>
                      {threadLabel(message.thread_type)} · {message.reference_label}
                    </td>
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
