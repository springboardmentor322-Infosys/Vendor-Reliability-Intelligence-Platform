import re

file_path = r'D:\Vendor Reliability Intelligence Platform\frontend\src\app\app.routes.ts'
text = open(file_path, 'r', encoding='utf-8').read()


routes_to_add = '''
      { path: 'dashboard/auditor', loadComponent: () => import('./features/audit/auditor-dashboard.component').then(m => m.AuditorDashboardComponent) },
      { path: 'audit-overview', loadComponent: () => import('./features/audit/audit-overview.component').then(m => m.AuditOverviewComponent) },
      { path: 'audit-logs', loadComponent: () => import('./features/audit/audit-logs.component').then(m => m.AuditLogsComponent) },
      { path: 'procurement-audit', loadComponent: () => import('./features/audit/procurement-audit.component').then(m => m.ProcurementAuditComponent) },
      { path: 'vendor-audit', loadComponent: () => import('./features/audit/vendor-audit.component').then(m => m.VendorAuditComponent) },
      { path: 'audit-contracts', loadComponent: () => import('./features/audit/audit-contracts.component').then(m => m.AuditContractsComponent) },
      { path: 'audit-invoices', loadComponent: () => import('./features/audit/audit-invoices.component').then(m => m.AuditInvoicesComponent) },
      { path: 'risk-controls', loadComponent: () => import('./features/audit/risk-controls.component').then(m => m.RiskControlsComponent) },
      { path: 'order-delivery-audit', loadComponent: () => import('./features/audit/order-delivery-audit.component').then(m => m.OrderDeliveryAuditComponent) },
      { path: 'audit-communications', loadComponent: () => import('./features/audit/audit-communications.component').then(m => m.AuditCommunicationsComponent) },
      { path: 'audit-reports', loadComponent: () => import('./features/audit/audit-reports.component').then(m => m.AuditReportsComponent) },
      { path: 'compliance-reports', loadComponent: () => import('./features/audit/compliance-reports.component').then(m => m.ComplianceReportsComponent) },
      { path: 'exception-reports', loadComponent: () => import('./features/audit/exception-reports.component').then(m => m.ExceptionReportsComponent) },
      { path: 'audit-exports', loadComponent: () => import('./features/audit/audit-exports.component').then(m => m.AuditExportsComponent) },
'''

text = re.sub(r'(      \{ path: \'finance-audit\'.*?\},)', r'\1' + routes_to_add, text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated app.routes.ts")
