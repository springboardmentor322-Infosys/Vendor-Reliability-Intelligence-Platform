import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: 'vendors',
    loadComponent: () =>
      import('./vendor-management/vendor-management.component')
        .then(m => m.VendorManagementComponent)
  },

  {
    path: 'purchase-orders',
    loadComponent: () =>
      import('./purchase-orders/purchase-orders')
        .then(m => m.PurchaseOrders)
  },

  {
    path: 'contracts',
    loadComponent: () =>
      import('./contracts/contracts')
        .then(m => m.Contracts)
  },

  {
    path: 'communications',
    loadComponent: () =>
      import('./communications/communications')
        .then(m => m.Communications)
  },

  {
    path: 'vendor-performance',
    loadComponent: () =>
      import('./vendor-performance/vendor-performance')
        .then(m => m.VendorPerformance)
  },

  {
    path: 'risk-analysis',
    loadComponent: () =>
      import('./risk-analysis/risk-analysis')
        .then(m => m.RiskAnalysis)
  },

  {
    path: 'procurement-analytics',
    loadComponent: () =>
      import('./procurement-analytics/procurement-analytics')
        .then(m => m.ProcurementAnalytics)
  },

  {
  path: 'notifications',
  loadComponent: () =>
    import('./notifications/notifications')
      .then(m => m.Notifications)
}

];