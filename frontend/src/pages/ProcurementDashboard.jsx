import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const metrics = [
  { label: 'Pending Orders', value: '46' },
  { label: 'Approved Spend', value: '$1.2M' },
  { label: 'Open RFQs', value: '18' },
  { label: 'Average PO Cycle', value: '7.4 days' },
]

const pipeline = [
  {
    title: 'Pending',
    items: ['PO-1101', 'PO-1102', 'PO-1105'],
  },
  {
    title: 'Approved',
    items: ['PO-1089', 'PO-1092'],
  },
  {
    title: 'Ordered',
    items: ['PO-1075', 'PO-1081', 'PO-1098'],
  },
  {
    title: 'Delivered',
    items: ['PO-1063', 'PO-1079'],
  },
  {
    title: 'Completed',
    items: ['PO-1048', 'PO-1056', 'PO-1062'],
  },
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

export default function ProcurementDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Procurement Dashboard</h1>
            <p>Track purchase order flow and procurement health in one view.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Refresh Data</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Create Purchase Order</button>
          </div>
        </header>

        <div className="dashboard-admin-grid dashboard-admin-grid--cards-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="dashboard-card">
              <div className="dashboard-card__label">{metric.label}</div>
              <div className="dashboard-card__value">{metric.value}</div>
            </article>
          ))}
        </div>

        <section className="table-card" style={{ marginTop: '1rem' }}>
          <div className="table-card__header">
            <h3>Purchase Order Pipeline</h3>
            <span className="table-card__meta">From pending through completion</span>
          </div>
          <div className="kanban-board">
            {pipeline.map((column) => (
              <div key={column.title} className="kanban-column">
                <div className="kanban-column__title">{column.title}</div>
                {column.items.map((item) => (
                  <div key={item} className="kanban-card">
                    <strong>{item}</strong>
                    <p>Estimated value</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </section>
  )
}
