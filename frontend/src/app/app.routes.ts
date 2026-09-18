
import { Routes } from '@angular/router';

import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Layout } from './components/layout/layout';

import { Dashboard } from './components/dashboard/dashboard';
import { Vendors } from './components/vendors/vendors';
import { Procurement } from './components/procurement/procurement';
import { PurchaseOrders } from './components/purchase-orders/purchase-orders';
import { Reports } from './components/reports/reports';
import { Analytics } from './components/analytics/analytics';
import { Notifications } from './components/notifications/notifications';

import { authGuard } from './services/auth.guard';

export const routes: Routes = [

  // Default
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Login
  {
    path: 'login',
    component: Login
  },

  // Register
  {
    path: 'register',
    component: Register
  },

  // Authenticated application
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],

    children: [

      {
        path: 'dashboard',
        component: Dashboard
      },

      {
        path: 'vendors',
        component: Vendors
      },

      {
        path: 'procurement',
        component: Procurement
      },

      {
        path: 'purchase-orders',
        component: PurchaseOrders
      },

      {
        path: 'reports',
        component: Reports
      },

      {
        path: 'analytics',
        component: Analytics
      },

      {
        path: 'notifications',
        component: Notifications
      },

      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./components/audit-logs/audit-logs')
            .then(m => m.AuditLogs)
      }

    ]
  }

];