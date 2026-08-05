export const ROLE_HOME_ROUTES = {
  Administrator: '/dashboard',
  Vendor: '/vendor-dashboard',
  'Finance Officer': '/finance-dashboard',
  'Procurement Manager': '/procurement',
  'Supply Chain Manager': '/supply-chain',
  Auditor: '/auditor-dashboard',
}

export const ROLE_ALLOWED_ROUTES = {
  Administrator: [
    '/dashboard',
    '/vendor-management',
    '/procurement',
    '/purchase-orders',
    '/vendor-performance',
    '/analytics',
    '/reports',
    '/notifications',
    '/profile',
    '/reset-password',
  ],
  Vendor: [
    '/vendor-dashboard',
    '/my-vendor-profile',
    '/vendor-performance',
    '/purchase-orders',
    '/notifications',
    '/profile',
    '/reset-password',
  ],
  'Finance Officer': [
    '/finance-dashboard',
    '/procurement-requests',
    '/purchase-orders',
    '/analytics',
    '/reports',
    '/notifications',
    '/profile',
    '/reset-password',
  ],
  'Procurement Manager': [
    '/procurement',
    '/procurement-requests',
    '/vendor-management',
    '/purchase-orders',
    '/vendor-performance',
    '/reports',
    '/notifications',
    '/profile',
    '/reset-password',
  ],
  'Supply Chain Manager': [
    '/supply-chain',
    '/procurement-requests',
    '/procurement',
    '/purchase-orders',
    '/vendor-management',
    '/vendor-performance',
    '/analytics',
    '/reports',
    '/notifications',
    '/profile',
    '/reset-password',
  ],
  Auditor: [
    '/auditor-dashboard',
    '/purchase-orders',
    '/analytics',
    '/reports',
    '/notifications',
    '/profile',
    '/reset-password',
  ],
}

export const ROLE_NAV_CONFIG = {
  Administrator: [
    { to: '/dashboard', label: 'Admin Dashboard' },
    { to: '/vendor-management', label: 'User Management' },
    { to: '/vendor-management', label: 'Vendor Management' },
    { to: '/procurement', label: 'Procurement Overview' },
    { to: '/purchase-orders', label: 'Invoices & Payments' },
    { to: '/analytics', label: 'Performance Analytics' },
    { to: '/reports', label: 'Reports & Exports' },
    { to: '/notifications', label: 'Notifications' },
  ],
  Vendor: [
    { to: '/vendor-dashboard', label: 'Vendor Dashboard' },
    { to: '/my-vendor-profile', label: 'My Vendor Profile' },
    { to: '/profile', label: 'Account Profile' },
    { to: '/vendor-performance', label: 'My Performance' },
    { to: '/purchase-orders', label: 'My Purchase Orders' },
    { to: '/notifications', label: 'Notifications' },
  ],
  'Finance Officer': [
    { to: '/finance-dashboard', label: 'Finance Dashboard' },
    { to: '/procurement-requests', label: 'Procurement Requests' },
    { to: '/purchase-orders', label: 'Invoices & Payments' },
    { to: '/analytics', label: 'Procurement Cost Analysis' },
    { to: '/reports', label: 'Spend Reports' },
    { to: '/notifications', label: 'Notifications' },
  ],
  'Procurement Manager': [
    { to: '/procurement', label: 'Procurement Dashboard' },
    { to: '/procurement-requests', label: 'Procurement Requests' },
    { to: '/vendor-management', label: 'Vendor Management' },
    { to: '/purchase-orders', label: 'Purchase Orders' },
    { to: '/vendor-performance', label: 'Vendor Performance' },
    { to: '/reports', label: 'Reports' },
    { to: '/notifications', label: 'Notifications' },
  ],
  'Supply Chain Manager': [
    { to: '/supply-chain', label: 'Supply Chain Dashboard' },
    { to: '/procurement-requests', label: 'Procurement Requests' },
    { to: '/procurement', label: 'Procurement Overview' },
    { to: '/purchase-orders', label: 'Purchase Orders' },
    { to: '/vendor-management', label: 'Vendor Management' },
    { to: '/analytics', label: 'Supply Chain Analytics' },
    { to: '/reports', label: 'Reports' },
    { to: '/notifications', label: 'Notifications' },
  ],
  Auditor: [
    { to: '/auditor-dashboard', label: 'Auditor Dashboard' },
    { to: '/purchase-orders', label: 'Purchase Orders' },
    { to: '/analytics', label: 'Compliance Overview' },
    { to: '/reports', label: 'Reports' },
    { to: '/notifications', label: 'Notifications' },
  ],
}

export const ROLE_SIDEBAR_CONFIG = {
  Administrator: [
    {
      title: 'System',
      items: [
        { to: '/dashboard', label: 'Admin Dashboard' },
        { to: '/vendor-management', label: 'User Management' },
        { to: '/vendor-management', label: 'Vendor Management (all vendors)' },
        { to: '/procurement', label: 'Procurement Overview (all POs)' },
        { to: '#', label: 'Contracts & Compliance (all)' },
        { to: '#', label: 'Invoices & Payments (all)' },
        { to: '/analytics', label: 'Performance Analytics' },
        { to: '/reports', label: 'Reports & Exports' },
        { to: '#', label: 'Role & Permissions' },
        { to: '#', label: 'System Settings' },
        { to: '#', label: 'Audit Logs' },
        { to: '#', label: 'System Health' },
      ],
    },
  ],
  'Procurement Manager': [
    {
      title: 'Procurement',
      items: [
        { to: '/procurement', label: 'Procurement Dashboard' },
        { to: '/vendor-management', label: 'Vendor Management' },
        { to: '/procurement-requests', label: 'Procurement Requests' },
        { to: '/purchase-orders', label: 'Purchase Orders' },
        { to: '/vendor-performance', label: 'Vendor Performance' },
        { to: '#', label: 'Contracts & Compliance' },
        { to: '#', label: 'Communication' },
        { to: '/reports', label: 'Reports' },
      ],
    },
  ],
  'Supply Chain Manager': [
    {
      title: 'Supply Chain',
      items: [
        { to: '/supply-chain', label: 'Supply Chain Dashboard' },
        { to: '/procurement-requests', label: 'Procurement Requests' },
        { to: '/procurement', label: 'Procurement Overview' },
        { to: '/vendor-management', label: 'Vendor Management' },
        { to: '/purchase-orders', label: 'Purchase Orders' },
        { to: '/analytics', label: 'Supply Chain Analytics' },
        { to: '/reports', label: 'Reports' },
      ],
    },
  ],
  Vendor: [
    {
      title: 'Supplier',
      items: [
        { to: '/vendor-dashboard', label: 'Vendor Dashboard' },
        { to: '/my-vendor-profile', label: 'My Vendor Profile' },
        { to: '/profile', label: 'Account Profile' },
        { to: '/vendor-performance', label: 'My Performance' },
        { to: '/purchase-orders', label: 'My Purchase Orders' },
        { to: '#', label: 'My Contracts & Compliance' },
        { to: '#', label: 'My Invoices & Payments' },
        { to: '#', label: 'Communication' },
        { to: '#', label: 'My Documents' },
      ],
    },
  ],
  'Finance Officer': [
    {
      title: 'Finance',
      items: [
        { to: '/finance-dashboard', label: 'Finance Dashboard' },
        { to: '/procurement-requests', label: 'Procurement Requests' },
        { to: '/purchase-orders', label: 'Invoices & Payments' },
        { to: '/analytics', label: 'Procurement Cost Analysis' },
        { to: '/reports', label: 'Spend Reports' },
        { to: '#', label: 'Contracts & Compliance' },
      ],
    },
  ],
  Auditor: [
    {
      title: 'Audit',
      items: [
        { to: '/auditor-dashboard', label: 'Auditor Dashboard' },
        { to: '#', label: 'Audit Logs' },
        { to: '/purchase-orders', label: 'Purchase Orders' },
        { to: '/analytics', label: 'Compliance Overview' },
        { to: '#', label: 'Purchase Order Approval Trails' },
        { to: '#', label: 'Contracts & Compliance' },
        { to: '/reports', label: 'Reports' },
      ],
    },
  ],
}

export const COMMON_SIDEBAR_ITEMS = [
  { to: 'role-dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/notifications', label: 'Notifications' },
  { to: '#', label: 'Settings' },
  { to: '#', label: 'Help & Support' },
]

export const DASHBOARD_SUMMARY_CARDS = {
  Administrator: [
    { label: 'Total Users', value: '184' },
    { label: 'Total Vendors', value: '96' },
    { label: 'Total Spend', value: '$4.8M' },
    { label: 'Active Contracts', value: '73' },
    { label: 'Compliance Score', value: '92%' },
    { label: 'Total Purchase Orders', value: '1,248' },
  ],
  'Procurement Manager': [
    { label: 'My Active POs', value: '46' },
    { label: 'Pending Approvals', value: '12' },
    { label: 'Vendors Assigned', value: '18' },
    { label: 'Avg Order Completion', value: '7.4 days' },
  ],
  'Supply Chain Manager': [
    { label: 'On-Time Delivery', value: '92%' },
    { label: 'Inventory Coverage', value: '78%' },
    { label: 'Lead Time', value: '12 days' },
    { label: 'Shipment Variance', value: '-2%' },
  ],
  Vendor: [
    { label: 'My Reliability Score', value: '4.7 / 5' },
    { label: 'My Purchase Orders', value: '28' },
    { label: 'On-Time Delivery %', value: '96%' },
    { label: 'Pending Invoices', value: '6' },
  ],
  'Finance Officer': [
    { label: 'Total Invoiced', value: '$1.24M' },
    { label: 'Pending Payments', value: '$84K' },
    { label: 'Overdue Payments', value: '4' },
    { label: 'Spend This Month', value: '$482K' },
  ],
  Auditor: [
    { label: 'Compliance Score', value: '88%' },
    { label: 'Contracts Expiring', value: '9' },
    { label: 'Flagged Vendors', value: '14' },
    { label: 'Recent Audit Events', value: '7' },
  ],
}

const ROLE_DASHBOARD_LABEL = {
  Administrator: 'Admin Dashboard',
  Vendor: 'Vendor Dashboard',
  'Finance Officer': 'Finance Dashboard',
  'Procurement Manager': 'Procurement Dashboard',
  'Supply Chain Manager': 'Supply Chain Dashboard',
  Auditor: 'Auditor Dashboard',
}

export function getDashboardRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] || '/dashboard'
}

export function getRoleDashboardLabel(role) {
  return ROLE_DASHBOARD_LABEL[role] || 'Dashboard'
}

export function getAllowedRoutesForRole(role) {
  return ROLE_ALLOWED_ROUTES[role] || ['/dashboard']
}

export function getNavItemsForRole(role) {
  return ROLE_NAV_CONFIG[role] || []
}

export function getSidebarItemsForRole(role) {
  const sidebarItems = [...ROLE_SIDEBAR_CONFIG[role] || []]
  const dashboardLabel = ROLE_HOME_ROUTES[role] ? 'Dashboard' : 'Dashboard'
  const dashboardRoute = ROLE_HOME_ROUTES[role] || '/dashboard'
  return [
    {
      title: 'Common',
      items: [
        { to: dashboardRoute, label: dashboardLabel },
        { to: '/profile', label: 'Profile' },
        { to: '/notifications', label: 'Notifications' },
        { to: '#', label: 'Settings' },
        { to: '#', label: 'Help & Support' },
      ],
    },
    ...sidebarItems,
  ]
}
