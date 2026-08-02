import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const vendors = [
  { name: 'Northstar Supply', category: 'Electronics', status: 'Active', score: '94%' },
  { name: 'BluePeak Logistics', category: 'Logistics', status: 'Active', score: '89%' },
  { name: 'Apex Industrial', category: 'Manufacturing', status: 'Onboarding', score: '81%' },
  { name: 'Harbor Tech', category: 'Technology', status: 'Watch', score: '72%' },
  { name: 'Summit Parts', category: 'Components', status: 'Inactive', score: '65%' },
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

export default function VendorManagement() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Vendor Management</h1>
            <p>Review supplier health, status, and reliability at a glance.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Import Vendors</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Add Vendor</button>
          </div>
        </header>

        <div className="page-toolbar">
          <div className="filter-group">
            <div className="filter-pill">All Categories</div>
            <div className="filter-pill">Active</div>
            <div className="filter-pill">Reliability &gt; 80%</div>
          </div>
          <input type="text" className="filter-search" placeholder="Search vendors" />
        </div>

        <section className="table-card">
          <div className="table-card__header">
            <h3>Vendors</h3>
            <span className="table-card__meta">Showing {vendors.length} suppliers</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Reliability Score</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.name}>
                  <td>{vendor.name}</td>
                  <td>{vendor.category}</td>
                  <td>
                    <span className={`status-pill ${vendor.status === 'Active' ? 'status-pill--good' : vendor.status === 'Watch' ? 'status-pill--warn' : 'status-pill--danger'}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td>{vendor.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
  )
}
