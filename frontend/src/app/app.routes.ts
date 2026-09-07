import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

import { LandingComponent } from './features/landing/landing.component';

import { AuthenticatedShellComponent } from './features/layout/authenticated-shell/authenticated-shell.component';
import { InvoicesComponent } from './features/invoices/invoices.component';
import { AuditComponent } from './features/admin/audit/audit.component';
import { UsersComponent } from './features/admin/users/users.component';
import { SettingsComponent } from './features/settings/settings.component';
import { SpendAnalysisComponent } from './features/analytics/spend-analysis.component';
import { DeliveryTrackingComponent } from './features/performance/delivery-tracking.component';
import { ExportsComponent } from './features/reports/exports.component';
import { PurchaseOrdersComponent } from './features/procurement/pos.component';
import { PoDetailComponent } from './features/procurement/po-detail.component';
import { ProcurementRequestsComponent } from './features/procurement/prs.component';
import { VendorsComponent } from './features/vendors/vendors.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { ReportsComponent } from './features/reports/reports.component';
import { PerformanceComponent } from './features/performance/performance.component';
import { ComplianceComponent } from './features/compliance/compliance.component';
import { RolesComponent } from './features/admin/roles/roles.component';
import { SystemLogsComponent } from './features/admin/system-logs/system-logs.component';
import { ProfileComponent } from './features/profile/profile.component';
import { DocumentsComponent } from './features/documents/documents.component';
import { PayHistoryComponent } from './features/invoices/payhistory.component';
import { SupportComponent } from './features/support/support.component';
import { AdvancedTelemetryComponent } from './features/performance/telemetry.component';
import { ProcurementOverviewComponent } from './features/procurement/procurement-overview.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: '',
    component: AuthenticatedShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'contracts', loadChildren: () => import('./features/contracts/contracts.module').then(m => m.ContractsModule) },
      { path: 'communications', loadChildren: () => import('./features/communications/communications.module').then(m => m.CommunicationsModule) },
      { path: 'invoices', component: InvoicesComponent },
      { path: 'audit', component: AuditComponent },
      { path: 'users', component: UsersComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'pos', component: PurchaseOrdersComponent },
      { path: 'pos/:id', component: PoDetailComponent },
      { path: 'prs', component: ProcurementRequestsComponent },
      { path: 'vendors', component: VendorsComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'performance', component: PerformanceComponent },
      { path: 'compliance', component: ComplianceComponent },
      { path: 'roles', component: RolesComponent },
      { path: 'system-logs', component: SystemLogsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'payhistory', component: PayHistoryComponent },
      { path: 'support', component: SupportComponent },
      { path: 'reliability', component: AdvancedTelemetryComponent },
      { path: 'delivery', component: DeliveryTrackingComponent },
      { path: 'risk', component: AdvancedTelemetryComponent },
      { path: 'procurement', component: ProcurementOverviewComponent },
      { path: 'spend-analysis', component: SpendAnalysisComponent },
      { path: 'exports', component: ExportsComponent },
      // ── Finance Officer routes ──
      { path: 'finance-overview', loadComponent: () => import('./features/finance/finance-overview.component').then(m => m.FinanceOverviewComponent) },
      { path: 'finance-budget', loadComponent: () => import('./features/finance/finance-budget.component').then(m => m.FinanceBudgetComponent) },
      { path: 'finance-invoices', loadComponent: () => import('./features/finance/finance-invoices.component').then(m => m.FinanceInvoicesComponent) },
      { path: 'finance-invoices/:id', loadComponent: () => import('./features/finance/finance-invoices.component').then(m => m.FinanceInvoicesComponent) },
      { path: 'finance-vendors', loadComponent: () => import('./features/finance/finance-vendors.component').then(m => m.FinanceVendorsComponent) },
      { path: 'finance-vendors/:id', loadComponent: () => import('./features/finance/finance-vendors.component').then(m => m.FinanceVendorsComponent) },
      { path: 'finance-cost-analysis', loadComponent: () => import('./features/finance/finance-cost-analysis.component').then(m => m.FinanceCostAnalysisComponent) },
      { path: 'finance-spend-analysis', loadComponent: () => import('./features/finance/finance-spend-analysis.component').then(m => m.FinanceSpendAnalysisComponent) },
      { path: 'finance-tax', loadComponent: () => import('./features/finance/finance-tax.component').then(m => m.FinanceTaxComponent) },
      { path: 'finance-reports', loadComponent: () => import('./features/finance/finance-reports.component').then(m => m.FinanceReportsComponent) },
      { path: 'finance-approvals', loadComponent: () => import('./features/finance/finance-approvals.component').then(m => m.FinanceApprovalsComponent) },
      { path: 'finance-payments', loadComponent: () => import('./features/finance/finance-payments.component').then(m => m.FinancePaymentsComponent) },
      { path: 'finance-audit', loadComponent: () => import('./features/finance/finance-audit.component').then(m => m.FinanceAuditComponent) },
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

    ]
  },
  { path: '**', redirectTo: '' }
];
