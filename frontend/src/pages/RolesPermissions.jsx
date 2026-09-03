import { ROLE_ALLOWED_ROUTES, ROLE_HOME_ROUTES, ROLE_NAV_CONFIG, ROLE_SIDEBAR_CONFIG } from '../utils/roleRoutes'
import '../dashboard-admin.css'
import '../vendor-management.css'

const ROLE_SUMMARIES = {
  Administrator: 'Full platform control: users, vendors, procurement, finance views, audit, and system configuration.',
  'Procurement Manager': 'Vendor onboarding, purchase orders, contracts, invoices, communication, and vendor performance.',
  'Supply Chain Manager': 'Deliveries, quality inspections, procurement overview, and supply-chain analytics.',
  Vendor: 'Own profile, assigned POs, deliveries, invoices, contracts, documents, and communication.',
  'Finance Officer': 'Invoices and payments, contracts, spend analytics, and related reports.',
  Auditor: 'Read-only operational records, audit logs, compliance overview, and purchase-order approval trails.',
}

const ROLES = Object.keys(ROLE_HOME_ROUTES)

export default function RolesPermissions() {
  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Roles & Permissions</h1>
          <p>Read-only map of the six platform roles and the routes each role can access.</p>
        </div>
      </header>

      <div className="dashboard-admin-grid dashboard-admin-grid--cards-4" style={{ marginBottom: '1rem' }}>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Roles</div>
          <div className="dashboard-card__value">{ROLES.length}</div>
        </article>
      </div>

      {ROLES.map((role) => {
        const routes = ROLE_ALLOWED_ROUTES[role] || []
        const nav = ROLE_NAV_CONFIG[role] || []
        const sidebar = (ROLE_SIDEBAR_CONFIG[role] || []).flatMap((section) =>
          section.items.map((item) => item.label),
        )
        return (
          <section key={role} className="table-card" style={{ marginBottom: '1rem' }}>
            <div className="table-card__header">
              <h3>{role}</h3>
              <span className="table-card__meta">Home: {ROLE_HOME_ROUTES[role]}</span>
            </div>
            <p className="table-empty" style={{ padding: '0 1rem 0.75rem' }}>
              {ROLE_SUMMARIES[role]}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Allowed routes</th>
                  <th>Primary navigation</th>
                  <th>Sidebar modules</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {routes.map((route) => (
                        <li key={route}>
                          <code>{route}</code>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {nav.map((item) => (
                        <li key={`${item.to}-${item.label}`}>{item.label}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {sidebar.map((label, index) => (
                        <li key={`${role}-sidebar-${index}`}>{label}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )
      })}
    </section>
  )
}
