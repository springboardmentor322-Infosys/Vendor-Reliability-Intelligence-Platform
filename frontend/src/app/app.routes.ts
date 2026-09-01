import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Vendors } from './pages/vendors/vendors';
import { Orders } from './pages/orders/orders';
import { AddVendor } from './pages/add-vendor/add-vendor';
import { AddOrder } from './pages/add-order/add-order';
import { Reports } from './pages/reports/reports';
import { VendorPerformance } from './pages/vendor-performance/vendor-performance';
import { Settings } from './pages/settings/settings';
import { Layout } from './layout/layout';
import { CommunicationPage } from './pages/communication/communication';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { ContractManagement } from './pages/contract-management/contract-management';
import { Notifications } from './pages/notifications/notifications';
import { Invoices } from './pages/invoices/invoices';
import { Register } from './pages/register/register';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { UserManagement } from './pages/user-management/user-management';
import { Landing } from './pages/landing/landing';
import { Deliveries } from './pages/deliveries/deliveries';
import { QualityInspection } from './pages/quality-inspection/quality-inspection';
import { Certification } from './pages/certification/certification';
import { ContractDocuments } from './pages/contract-documents/contract-documents';
import { ProfileCompany } from './pages/profile-company/profile-company';
import { AuditPlan } from './pages/audit-plan/audit-plan';
import { AuditFindings } from './pages/audit-findings/audit-findings';
import { AuditTrails } from './pages/audit-trails/audit-trails';
import { ControlAssessment } from './pages/control-assessment/control-assessment';
import { ChecklistManagement } from './pages/checklist-management/checklist-management';
import { BudgetSpendAnalysis } from './pages/budget-spend-analysis/budget-spend-analysis';
import { InventoryOverview } from './pages/inventory-overview/inventory-overview';
import { DemandPlanning } from './pages/demand-planning/demand-planning';
import { SupplierPerformance } from './pages/supplier-performance/supplier-performance';
import { RiskReliability } from './pages/risk-reliability/risk-reliability';
import { RiskAssessment } from './pages/risk-assessment/risk-assessment';


// Procurement
import { ProcurementPage } from './pages/procurement/procurement';


export const routes: Routes = [

  // ==========================================
  // LOGIN
  // ==========================================

  {
    path: 'login',
    component: Login
  },


  // ==========================================
  // REGISTER
  // ==========================================

  {
    path: 'register',
    component: Register
  },


  // ==========================================
  // FORGOT PASSWORD
  // ==========================================

  {
    path: 'forgot-password',
    component: ForgotPassword
  },


  // ==========================================
  // RESET PASSWORD
  // ==========================================

  {
    path: 'reset-password',
    component: ResetPassword
  },


  // ==========================================
  // LANDING PAGE
  // ==========================================

  {
    path: '',
    component: Landing
  },


  // ==========================================
  // PROTECTED APPLICATION
  // ==========================================

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],

    children: [

      // ==========================================
      // DASHBOARD
      // ==========================================

      {
        path: 'dashboard',
        component: Dashboard
      },


      // ==========================================
      // VENDORS
      // ==========================================

      {
        path: 'vendors',
        component: Vendors
      },


      // ==========================================
      // ADD VENDOR
      // ==========================================

      {
        path: 'add-vendor',
        component: AddVendor,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Administrator',
            'Procurement Manager'
          ]
        }
      },


      // ==========================================
      // ORDERS
      // ==========================================

      {
        path: 'orders',
        component: Orders
      },


      // ==========================================
      // DELIVERIES
      // ==========================================

      {
        path: 'deliveries',
        component: Deliveries
      },


      // ==========================================
      // ADD ORDER
      // ==========================================

      {
        path: 'add-order',
        component: AddOrder,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Administrator',
            'Procurement Manager'
          ]
        }
      },


      // ==========================================
      // PROCUREMENT
      // ==========================================

      {
        path: 'procurement',
        component: ProcurementPage
      },


      // ==========================================
      // CONTRACTS
      // ==========================================

      {
        path: 'contracts',
        component: ContractManagement
      },


      // ==========================================
      // AUDIT PLAN
      // ==========================================

      {
        path: 'audit-plan',
        component: AuditPlan,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Auditor'
          ]
        }
      },


      // ==========================================
      // AUDIT FINDINGS
      // ==========================================

      {
        path: 'audit-findings',
        component: AuditFindings,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Auditor'
          ]
        }
      },

      // ==========================================
      // AUDIT TRAILS
      // ==========================================

      {
        path: 'audit-trails',
        component: AuditTrails,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Auditor'
          ]
        }
      },


      // ==========================================
      // CONTRACT DOCUMENTS
      // ==========================================

      {
        path: 'contract-documents',
        component: ContractDocuments
      },


      // ==========================================
      // CERTIFICATION
      // ==========================================

      {
        path: 'certification',
        component: Certification
      },


      // ==========================================
      // REPORTS
      // ==========================================

      {
        path: 'reports',
        component: Reports
      },


      // ==========================================
      // VENDOR PERFORMANCE
      // ==========================================

      {
        path: 'vendor-performance',
        component: VendorPerformance
      },


      // ==========================================
      // COMMUNICATIONS
      // ==========================================

      {
        path: 'communication',
        component: CommunicationPage
      },


      // ==========================================
      // NOTIFICATIONS
      // ==========================================

      {
        path: 'notifications',
        component: Notifications
      },


      // ==========================================
      // SETTINGS
      // ==========================================

      {
        path: 'settings',
        component: Settings
      },


      // ==========================================
      // INVOICES
      // ==========================================

      {
        path: 'invoices',
        component: Invoices
      },


      // ==========================================
      // USER MANAGEMENT
      // ==========================================

      {
        path: 'user-management',
        component: UserManagement,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Administrator'
          ]
        }
      },


      // ==========================================
      // QUALITY EVALUATION
      // ==========================================

      {
        path: 'quality-inspection',
        component: QualityInspection
      },


      // ==========================================
      // PROFILE COMPANY
      // ==========================================

      {
        path: 'profile-company',
        component: ProfileCompany,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Vendor'
          ]
        }
      },


      // ==========================================
      // DEFAULT
      // ==========================================

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // ==========================================
      // AUDITOR
      // ==========================================

      {
        path: 'control-assessment',
        component: ControlAssessment
      },

      // ==========================================
      // CHECKLIST MANAGEMENT
      // ==========================================

      {
        path: 'checklist-management',
        component: ChecklistManagement
      },

      // ==========================================
      // BUDGET SPEND ANALYSIS
      // ==========================================
      
      {
        path: 'budget-spend-analysis',
        component: BudgetSpendAnalysis,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Procurement Manager'
          ]
        }
      },

      // ==========================================
      // INVENTORY OVERVIEW
      // ==========================================

      {
        path: 'inventory-overview',
        component: InventoryOverview,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Supply Chain Manager'
          ]
        }
      },

      // ==========================================
      // DEMAND PLANNING
      // ==========================================

      {
        path: 'demand-planning',
        component: DemandPlanning,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Supply Chain Manager'
          ]
        }
      },

      // ==========================================
      // SUPPLIER PERFORMANCE
      // ==========================================

      {
        path: 'supplier-performance',
        component: SupplierPerformance
      },

      // ==========================================
      // RISK & RELIABILITY
      // ==========================================
      
      {
        path: 'risk-reliability',
        component: RiskReliability
      },

      // ==========================================
      // RISK ASSESSMENT
      // ==========================================
      
      {
        path: 'risk-assessment',
        component: RiskAssessment,
        canActivate: [roleGuard],
        data: {
          roles: [
            'Auditor'
          ]
        }
      },


    ]
  },


  // ==========================================
  // INVALID URL
  // ==========================================

  {
    path: '**',
    redirectTo: 'dashboard'
  }

];