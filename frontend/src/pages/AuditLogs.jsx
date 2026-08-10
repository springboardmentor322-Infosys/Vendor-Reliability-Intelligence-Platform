import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAuditLogs } from '../api/auditLogs'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

const ENTITY_TYPES = [
  { value: '', label: 'All entity types' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'contract', label: 'Contract' },
]

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [search, setSearch] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (entityType) params.entity_type = entityType
      if (entityId.trim()) params.entity_id = parseInt(entityId, 10)
      if (search.trim()) params.search = search.trim()
      const data = await fetchAuditLogs(params)
      setLogs(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load audit logs'))
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, search])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const summary = useMemo(() => ({
    total: logs.length,
    vendors: logs.filter((l) => l.entity_type === 'vendor').length,
    pos: logs.filter((l) => l.entity_type === 'purchase_order').length,
    contracts: logs.filter((l) => l.entity_type === 'contract').length,
  }), [logs])

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Review system activity and status changes across vendors, POs, and contracts.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost" onClick={loadLogs}>
            Refresh
          </button>
        </div>
      </header>

      <div className="dashboard-admin-grid dashboard-admin-grid--cards-4">
        <article className="dashboard-card">
          <div className="dashboard-card__label">Showing</div>
          <div className="dashboard-card__value">{summary.total}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Vendor Events</div>
          <div className="dashboard-card__value">{summary.vendors}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">PO Events</div>
          <div className="dashboard-card__value">{summary.pos}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Contract Events</div>
          <div className="dashboard-card__value">{summary.contracts}</div>
        </article>
      </div>

      <div className="page-toolbar" style={{ marginTop: '1rem' }}>
        <div className="filter-group">
          <select
            className="filter-search"
            style={{ width: 'auto', minWidth: '180px' }}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {ENTITY_TYPES.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="number"
            className="filter-search"
            style={{ width: '140px' }}
            placeholder="Entity ID"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            min="1"
          />
          <input
            type="search"
            className="filter-search"
            placeholder="Search description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="loading-state">Loading audit logs…</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : logs.length === 0 ? (
        <section className="table-card">
          <p style={{ color: '#64748b' }}>No audit log entries match your filters.</p>
        </section>
      ) : (
        <section className="table-card">
          <div className="table-card__header">
            <h3>Activity Log</h3>
            <span className="table-card__meta">{logs.length} entr{logs.length === 1 ? 'y' : 'ies'}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.timestamp)}</td>
                  <td>{log.action_description}</td>
                  <td>
                    <span className="col-mono">{log.entity_type}</span> #{log.entity_id}
                  </td>
                  <td>{log.performer_name || `User #${log.performed_by}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  )
}
