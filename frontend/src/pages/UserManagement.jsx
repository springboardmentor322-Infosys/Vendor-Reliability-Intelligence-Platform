import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAdminUsers, updateAdminUser } from '../api/admin'
import { getErrorMessage } from '../utils/auth'
import { formatDateTime } from '../utils/vendorStatus'
import '../dashboard-admin.css'
import '../vendor-management.css'

const ALL_ROLES = [
  'Administrator',
  'Procurement Manager',
  'Supply Chain Manager',
  'Vendor',
  'Finance Officer',
  'Auditor',
]

const INTERNAL_ROLES = [
  'Procurement Manager',
  'Supply Chain Manager',
  'Finance Officer',
  'Auditor',
]

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (roleFilter) params.role = roleFilter
      if (statusFilter === 'active') params.is_active = true
      if (statusFilter === 'inactive') params.is_active = false
      setUsers(await fetchAdminUsers(params))
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) =>
      [user.name, user.email, user.role].some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [users, search])

  const patchUser = async (user, payload) => {
    setSavingId(user.id)
    setError('')
    setNotice('')
    try {
      const updated = await updateAdminUser(user.id, payload)
      setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)))
      setNotice(`Updated ${updated.name}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update user'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>User Management</h1>
          <p>
            Internal staff roles can be reassigned among Procurement Manager, Finance Officer,
            Auditor, and Supply Chain Manager. Administrator is seeded only. Vendor accounts are
            external and cannot be converted to or from staff roles.
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
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All roles</option>
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <input
          type="text"
          className="filter-search"
          placeholder="Search name or email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="table-card">
        <div className="table-card__header">
          <h3>Users</h3>
          <span className="table-card__meta">
            {loading ? 'Loading…' : `${filtered.length} account${filtered.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {loading ? (
          <p className="loading-state" style={{ padding: '1rem' }}>Loading users…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isAdmin = user.role === 'Administrator'
                  const isVendor = user.role === 'Vendor'
                  const canChangeRole = INTERNAL_ROLES.includes(user.role)
                  return (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        {canChangeRole ? (
                          <select
                            value={user.role}
                            disabled={savingId === user.id}
                            onChange={(event) => patchUser(user, { role: event.target.value })}
                          >
                            {INTERNAL_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span title={isVendor ? 'Vendor accounts cannot be reassigned to staff roles' : 'Administrator is seeded only'}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${user.is_active ? 'status-pill--good' : 'status-pill--danger'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDateTime(user.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="dashboard-admin-btn dashboard-admin-btn--ghost"
                          disabled={savingId === user.id || (isAdmin && user.is_active)}
                          title={isAdmin ? 'Cannot deactivate the seeded Administrator' : undefined}
                          onClick={() => patchUser(user, { is_active: !user.is_active })}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
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
