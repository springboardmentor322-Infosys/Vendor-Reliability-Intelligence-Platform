import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../dashboard-admin.css'

const reports = [
  { title: 'Vendor Performance', description: 'Review supplier delivery, quality, and risk metrics.' },
  { title: 'Procurement', description: 'Analyze spend, PO pipeline, and approval velocity.' },
  { title: 'Compliance', description: 'Track audit, contract, and regulatory status.' },
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

export default function ReportsDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
            <h1>Reports Dashboard</h1>
            <p>Prepare recurring and ad hoc reports for procurement, risk, and vendor performance.</p>
          </div>
          <div className="dashboard-admin-header__actions">
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Recent Reports</button>
            <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Schedule Report</button>
          </div>
        </header>

        <section className="dashboard-admin-grid dashboard-admin-grid--cards-3">
          {reports.map((report) => (
            <article key={report.title} className="dashboard-card report-card">
              <div className="dashboard-card__label">{report.title}</div>
              <p className="report-card__desc">{report.description}</p>
              <div className="report-card__actions">
                <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Generate</button>
                <button type="button" className="dashboard-admin-btn dashboard-admin-btn--primary">Export PDF</button>
                <button type="button" className="dashboard-admin-btn dashboard-admin-btn--ghost">Export Excel</button>
              </div>
            </article>
          ))}
        </section>
      </section>
  )
}
