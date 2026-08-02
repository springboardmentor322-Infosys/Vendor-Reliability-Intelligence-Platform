import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const orderList = [
  { po: 'PO-1101', vendor: 'Northstar Supply', date: '2026-07-21', total: '$42,300', status: 'Pending' },
  { po: 'PO-1092', vendor: 'BluePeak Logistics', date: '2026-07-18', total: '$18,900', status: 'Approved' },
  { po: 'PO-1081', vendor: 'Apex Industrial', date: '2026-07-10', total: '$63,400', status: 'Ordered' },
  { po: 'PO-1079', vendor: 'Harbor Tech', date: '2026-07-05', total: '$11,220', status: 'Delivered' },
  { po: 'PO-1062', vendor: 'Summit Parts', date: '2026-06-29', total: '$9,640', status: 'Completed' },
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

const statusMap = {
  Pending: 'status-pill--warn',
  Approved: 'status-pill--good',
  Ordered: 'status-pill--good',
  Delivered: 'status-pill--good',
  Completed: 'status-pill--good',
}

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Purchase Orders</h1>
            <p>Browse and filter purchase orders across your vendor network.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Export</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">New Purchase Order</button>
          </div>
        </header>

        <div className="page-toolbar">
          <div className="filter-group">
            <div className="filter-pill">Vendor: All</div>
            <div className="filter-pill">Status: All</div>
            <div className="filter-pill">Date: Last 30 days</div>
          </div>
          <input type="text" className="filter-search" placeholder="Search by PO number or vendor" />
        </div>

        <section className="table-card">
          <div className="table-card__header">
            <h3>Order List</h3>
            <span className="table-card__meta">Full purchase order history</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>PO</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orderList.map((order) => (
                <tr key={order.po}>
                  <td>{order.po}</td>
                  <td>{order.vendor}</td>
                  <td>{order.date}</td>
                  <td>{order.total}</td>
                  <td><span className={`status-pill ${statusMap[order.status] || 'status-pill--good'}`}>{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
  )
}
