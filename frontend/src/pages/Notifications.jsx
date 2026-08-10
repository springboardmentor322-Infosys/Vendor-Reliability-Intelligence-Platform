import { useCallback, useEffect, useState } from 'react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

const TYPE_ICONS = {
  contract_expiry: '⚠️',
  po_issued: '📦',
  vendor_status: '🏢',
  procurement_approved: '✅',
  procurement_rejected: '❌',
}

function getNotificationIcon(type) {
  return TYPE_ICONS[type] ?? 'ℹ️'
}

function formatRelativeTime(value) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadNotifications = useCallback(async () => {
    setError('')
    try {
      const data = await fetchNotifications()
      setItems(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load notifications'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadNotifications()
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, is_read: true })))
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to mark notifications as read'))
    }
  }

  const handleNotificationClick = async (notification) => {
    if (notification.is_read) return

    try {
      const updated = await markNotificationRead(notification.id)
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update notification'))
    }
  }

  const unreadCount = items.filter((item) => !item.is_read).length

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay on top of alerts, approvals, and vendor updates.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button
            type="button"
            className="dashboard-admin-btn dashboard-admin-btn--ghost"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
          <button
            type="button"
            className="dashboard-admin-btn dashboard-admin-btn--primary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="list-card">
        <div className="list-card__header">
          <h3>Notification Feed</h3>
          <span className="list-card__meta">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {loading ? (
          <p className="list-card__meta">Loading notifications…</p>
        ) : items.length === 0 ? (
          <p className="list-card__meta">No notifications yet.</p>
        ) : (
          <div className="notification-list">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-item notification-item--clickable ${item.is_read ? '' : 'notification-item--unread'}`}
                onClick={() => handleNotificationClick(item)}
              >
                <div className="notification-icon">{getNotificationIcon(item.notification_type)}</div>
                <div className="notification-body">
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </div>
                <div className="notification-meta">
                  <span>{formatRelativeTime(item.created_at)}</span>
                  {!item.is_read && <span className="notification-unread-dot" aria-label="Unread" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
