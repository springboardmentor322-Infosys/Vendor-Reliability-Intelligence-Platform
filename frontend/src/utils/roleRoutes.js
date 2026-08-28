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
    '/invoices',
    '/contracts',
    '/vendor-performance',
    '/analytics',
    '/reports',
    '/audit-logs',
    '/notifications',
    '/profile',
    '/settings',
    '/help-support',
  ],
  Vendor: [
    '/vendor-dashboard',
    '/my-vendor-profile',
    '/vendor-performance',
    '/purchase-orders',
    '/invoices',
    '/contracts',
    '/notifications',
    '/profile',
    '/settings',
    '/help-support',
  ],
  'Finance Officer': [
    '/finance-dashboard',
    '/procurement-requests',
    '/purchase-orders',
    '/invoices',
    '/contracts',
    '/analytics',
    '/reports',
    '/notifications',
    '/profile',
    '/settings',
    '/help-support',
  ],
  'Procurement Manager': [
    '/procurement',
    '/procurement-requests',
    '/vendor-management',
    '/purchase-orders',
    '/invoices',
    '/contracts',
    '/vendor-performance',
    '/reports',
    '/notifications',
    '/profile',
    '/settings',
    '/help-support',
  ],
  'Supply Chain Manager': [
    '/supply-chain',
    '/procurement-requests',
    '/procurement',
    '/purchase-orders',
    '/contracts',
    '/vendor-management',
    '/vendor-performance',
    '/analytics',
    '/reports',
    '/notifications',
    '/profile',
    '/settings',
    '/help-support',
  ],
  Auditor: [
    '/auditor-dashboard',
    '/purchase-orders',
    '/contracts',
    '/analytics',
    '/reports',
    '/audit-logs',
    '/notifications',
    '/profile',
    '/settings',
    '/help-support',
  ],
}

export const ROLE_NAV_CONFIG = {
  Administrator: [
    { to: '/dashboard', label: 'Admin Dashboard' },
    { to: '/vendor-management', label: 'User Management' },
    { to: '/vendor-management', label: 'Vendor Management' },
    { to: '/procurement', label: 'Procurement Overview' },
    { to: '/invoices', label: 'Invoices & Payments' },
    { to: '/contracts', label: 'Contracts & Compliance' },
    { to: '/vendor-performance', label: 'Vendor Performance' },
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
    { to: '/invoices', label: 'My Invoices & Payments' },
    { to: '/contracts', label: 'My Contracts' },
    { to: '/notifications', label: 'Notifications' },
  ],
  'Finance Officer': [
    { to: '/finance-dashboard', label: 'Finance Dashboard' },
    { to: '/procurement-requests', label: 'Procurement Requests' },
    { to: '/invoices', label: 'Invoices & Payments' },
    { to: '/contracts', label: 'Contracts & Compliance' },
    { to: '/analytics', label: 'Procurement Cost Analysis' },
    { to: '/reports', label: 'Spend Reports' },
    { to: '/notifications', label: 'Notifications' },
  ],
  'Procurement Manager': [
    { to: '/procurement', label: 'Procurement Dashboard' },
    { to: '/procurement-requests', label: 'Procurement Requests' },
    { to: '/vendor-management', label: 'Vendor Management' },
    { to: '/purchase-orders', label: 'Purchase Orders' },
    { to: '/invoices', label: 'Invoices & Payments' },
    { to: '/contracts', label: 'Contracts & Compliance' },
    { to: '/vendor-performance', label: 'Vendor Performance' },
    { to: '/reports', label: 'Reports' },
    { to: '/notifications', label: 'Notifications' },
  ],
  'Supply Chain Manager': [
    { to: '/supply-chain', label: 'Supply Chain Dashboard' },
    { to: '/procurement-requests', label: 'Procurement Requests' },
    { to: '/procurement', label: 'Procurement Overview' },
    { to: '/purchase-orders', label: 'Purchase Orders' },
    { to: '/contracts', label: 'Contracts & Compliance' },
    { to: '/vendor-management', label: 'Vendor Management' },
    { to: '/vendor-performance', label: 'Vendor Performance' },
    { to: '/analytics', label: 'Supply Chain Analytics' },
    { to: '/reports', label: 'Reports' },
    { to: '/notifications', label: 'Notifications' },
  ],
  Auditor: [
    { to: '/auditor-dashboard', label: 'Auditor Dashboard' },
    { to: '/purchase-orders', label: 'Purchase Orders' },
    { to: '/contracts', label: 'Contracts & Compliance' },
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
        { to: '/contracts', label: 'Contracts & Compliance (all)' },
        { to: '/invoices', label: 'Invoices & Payments (all)' },
        { to: '/vendor-performance', label: 'Vendor Performance' },
        { to: '/analytics', label: 'Performance Analytics' },
        { to: '/reports', label: 'Reports & Exports' },
        { to: '#', label: 'Role & Permissions' },
        { to: '#', label: 'System Settings' },
        { to: '/audit-logs', label: 'Audit Logs' },
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
        { to: '/invoices', label: 'Invoices & Payments' },
        { to: '/contracts', label: 'Contracts & Compliance' },
        { to: '/vendor-performance', label: 'Vendor Performance' },
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
        { to: '/contracts', label: 'Contracts & Compliance' },
        { to: '/vendor-performance', label: 'Vendor Performance' },
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
        { to: '/contracts', label: 'My Contracts & Compliance' },
        { to: '/invoices', label: 'My Invoices & Payments' },
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
        { to: '/invoices', label: 'Invoices & Payments' },
        { to: '/contracts', label: 'Contracts & Compliance' },
        { to: '/analytics', label: 'Procurement Cost Analysis' },
        { to: '/reports', label: 'Spend Reports' },
      ],
    },
  ],
  Auditor: [
    {
      title: 'Audit',
      items: [
        { to: '/auditor-dashboard', label: 'Auditor Dashboard' },
        { to: '/audit-logs', label: 'Audit Logs' },
        { to: '/purchase-orders', label: 'Purchase Orders' },
        { to: '/contracts', label: 'Contracts & Compliance' },
        { to: '/analytics', label: 'Compliance Overview' },
        { to: '#', label: 'Purchase Order Approval Trails' },
        { to: '/reports', label: 'Reports' },
      ],
    },
  ],
}

export const COMMON_SIDEBAR_ITEMS = [
  { to: 'role-dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/settings', label: 'Settings' },
  { to: '/help-support', label: 'Help & Support' },
]

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
  const commonItems = COMMON_SIDEBAR_ITEMS.map((item) => {
    if (item.to === 'role-dashboard') {
      return {
        to: ROLE_HOME_ROUTES[role] || '/dashboard',
        label: getRoleDashboardLabel(role),
      }
    }
    return item
  })

  return [
    {
      title: 'Common',
      items: commonItems,
    },
    ...sidebarItems,
  ]
}
