import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const notifications = [
  { id: 1, type: 'alert', title: 'Contract review required', detail: 'Northstar Supply contract expires in 7 days.', time: '2m ago', unread: true },
  { id: 2, type: 'success', title: 'PO approved', detail: 'Purchase order PO-1092 has been approved.', time: '18m ago', unread: true },
  { id: 3, type: 'info', title: 'New vendor added', detail: 'BluePeak Logistics was added to the approved supplier list.', time: '1h ago', unread: false },
  { id: 4, type: 'alert', title: 'Quality alert', detail: 'Apex Industrial delivery was flagged for inspection.', time: 'Yesterday', unread: false },
]

const routes = [
  { to: '/dashboard', label: 'Admin Dashboard' },
  { to: '/vendor-management', label: 'Vendor Management' },
  { to: '/procurement', label: 'Procurement Dashboard' },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/vendor-performance', label: 'Vendor Performance' },
  { to: '/analytics', label: 'Analytics Dashboard' },
  { to: '/reports', label: 'Reports' },
  { to: '/notifications', label: 'Notifications' },
]

const iconMap = {
  alert: '⚠️',
  info: 'ℹ️',
  success: '✅',
}

export default function Notifications() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Notifications</h1>
            <p>Stay on top of alerts, approvals, and vendor updates.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Mark all read</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Refresh</button>
          </div>
        </header>

        <section className="list-card">
          <div className="list-card__header">
            <h3>Notification Feed</h3>
            <span className="list-card__meta">Recent activity</span>
          </div>
          <div className="notification-list">
            {notifications.map((item) => (
              <div key={item.id} className={`notification-item ${item.unread ? 'notification-item--unread' : ''}`}>
                <div className="notification-icon">{iconMap[item.type]}</div>
                <div className="notification-body">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <div className="notification-meta">
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
  )
}
