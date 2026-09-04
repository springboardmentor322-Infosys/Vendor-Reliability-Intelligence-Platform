import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';


export const routes: Routes = [

{
  path: '',

  loadComponent: () =>
    import('./pages/landing/landing').then(
      (m) => m.LandingComponent
    ),

},



{
  path: 'login',

  loadComponent: () =>
    import('./pages/login/login').then(
      (m) => m.LoginComponent
    ),

},



{
  path: 'register',

  loadComponent: () =>
    import('./pages/register/register').then(
      (m) => m.RegisterComponent
    ),

},

{
  path: 'password-reset',
  loadComponent: () => import('./pages/password-reset/password-reset').then(m=>m.PasswordResetComponent),
},





{
  path: '',

  loadComponent: () =>
    import('./shared/layout/layout').then(
      (m) => m.LayoutComponent
    ),

  canActivate:[authGuard],



children:[



{
  path:'dashboard',

  canActivate:[roleGuard(['Administrator','Admin','Procurement Manager','Supply Chain Manager','Finance Officer','Auditor'])],

  loadComponent:() =>
    import('./pages/dashboard/dashboard').then(
      (m)=>m.DashboardComponent
    ),

},

{
  path:'procurement-dashboard',
  canActivate:[roleGuard(['Procurement Manager'])],
  data:{dashboardRole:'procurement'},
  loadComponent:() => import('./shared/role-dashboard/role-dashboard').then(m=>m.RoleDashboardComponent),
},

{
  path:'supply-chain-dashboard',
  canActivate:[roleGuard(['Supply Chain Manager'])],
  data:{dashboardRole:'supply'},
  loadComponent:() => import('./shared/role-dashboard/role-dashboard').then(m=>m.RoleDashboardComponent),
},

{
  path:'finance-dashboard',
  canActivate:[roleGuard(['Finance Officer'])],
  data:{dashboardRole:'finance'},
  loadComponent:() => import('./shared/role-dashboard/role-dashboard').then(m=>m.RoleDashboardComponent),
},

{
  path:'audit-dashboard',
  canActivate:[roleGuard(['Auditor'])],
  data:{dashboardRole:'auditor'},
  loadComponent:() => import('./shared/role-dashboard/role-dashboard').then(m=>m.RoleDashboardComponent),
},






// ==========================
// VENDOR MODULE
// ==========================


{
  path:'vendors',
  canActivate:[roleGuard(['Administrator','Admin','Procurement Manager','Supply Chain Manager','Finance Officer','Auditor'])],
  loadComponent:() => import('./pages/vendors/vendor-list/vendor-list').then(m=>m.VendorListComponent),
},

{
  path:'add-vendor',
  canActivate:[roleGuard(['Administrator','Admin'])],
  loadComponent:() => import('./pages/vendors/add-vendor/add-vendor').then(m=>m.AddVendorComponent),
},

{
  path:'edit-vendor/:id',
  canActivate:[roleGuard(['Administrator','Admin'])],
  loadComponent:() => import('./pages/vendors/edit-vendor/edit-vendor').then(m=>m.EditVendorComponent),
},

{
  path:'vendor-details/:id',
  canActivate:[roleGuard(['Administrator','Admin','Procurement Manager','Supply Chain Manager','Finance Officer','Auditor'])],
  loadComponent:() => import('./pages/vendors/vendor-details/vendor-details').then(m=>m.VendorDetailsComponent),
},

{
  path:'vendor-dashboard',

  canActivate:[
    roleGuard(['Vendor'])
  ],

  loadComponent:() =>
    import('./pages/vendor-dashboard/vendor-dashboard').then(
      (m)=>m.VendorDashboardComponent
    ),

},



{
  path:'vendor-profile',

  canActivate:[
    roleGuard(['Vendor'])
  ],

  loadComponent:() =>
    import('./pages/vendor-profile/vendor-profile').then(
      (m)=>m.VendorProfileComponent
    ),

},



{
  path:'vendor-orders',

  canActivate:[
    roleGuard(['Vendor'])
  ],

  loadComponent:() =>
    import('./pages/vendor-orders/vendor-orders').then(
      (m)=>m.VendorOrdersComponent
    ),

},



{
  path:'vendor-contracts',

  canActivate:[
    roleGuard(['Vendor'])
  ],

  loadComponent:() =>
    import('./pages/vendor-contracts/vendor-contracts').then(
      (m)=>m.VendorContractsComponent
    ),

},



{
  path:'vendor-performance',

  canActivate:[
    roleGuard(['Vendor'])
  ],

  loadComponent:() =>
    import('./pages/vendor-performance/vendor-performance').then(
      (m)=>m.VendorPerformanceComponent
    ),

},







// ==========================
// PROCUREMENT
// ==========================


{
  path:'procurement',

  loadComponent:() =>
    import('./pages/procurement/procurement-list/procurement-list').then(
      (m)=>m.ProcurementListComponent
    ),

},



{
  path:'add-procurement',

  loadComponent:() =>
    import('./pages/procurement/add-procurement/add-procurement').then(
      (m)=>m.AddProcurementComponent
    ),

},



{
  path:'edit-procurement/:id',

  loadComponent:() =>
    import('./pages/procurement/edit-procurement/edit-procurement').then(
      (m)=>m.EditProcurementComponent
    ),

},







// ==========================
// PURCHASE ORDERS
// ==========================


{
  path:'purchase-orders',

  loadComponent:() =>
    import('./pages/purchase-orders/purchase-orders').then(
      (m)=>m.PurchaseOrdersComponent
    ),

},



{
  path:'add-purchase-order',

  loadComponent:() =>
    import('./pages/purchase-orders/add-purchase-order/add-purchase-order').then(
      (m)=>m.AddPurchaseOrderComponent
    ),

},



{
  path:'edit-purchase-order/:id',

  loadComponent:() =>
    import('./pages/purchase-orders/edit-purchase-order/edit-purchase-order').then(
      (m)=>m.EditPurchaseOrderComponent
    ),

},







// ==========================
// CONTRACTS
// ==========================


{
  path:'contracts',

  loadComponent:() =>
    import('./contracts/contracts').then(
      (m)=>m.ContractsComponent
    ),

},



{
  path:'add-contract',

  loadComponent:() =>
    import('./contracts/add-contract/add-contract').then(
      (m)=>m.AddContractComponent
    ),

},



{
  path:'edit-contract/:id',

  loadComponent:() =>
    import('./contracts/edit-contract/edit-contract').then(
      (m)=>m.EditContractComponent
    ),

},







// ==========================
// PERFORMANCE
// ==========================


{
  path:'performance',

  loadComponent:() =>
    import('./pages/performance/performance').then(
      (m)=>m.PerformanceComponent
    ),

},

{
  path:'reliability',
  loadComponent:() => import('./pages/reliability/reliability').then(m=>m.ReliabilityComponent),
},



{
  path:'add-performance',

  loadComponent:() =>
    import('./pages/performance/add-performance/add-performance').then(
      (m)=>m.AddPerformanceComponent
    ),

},



{
  path:'edit-performance/:id',

  loadComponent:() =>
    import('./pages/performance/edit-performance/edit-performance').then(
      (m)=>m.EditPerformanceComponent
    ),

},







// ==========================
// OTHER MODULES
// ==========================


{
  path:'analytics',

  loadComponent:() =>
    import('./pages/analytics/analytics').then(
      (m)=>m.AnalyticsComponent
    ),

},



{
  path:'reports',

  loadComponent:() =>
    import('./pages/reports/reports').then(
      (m)=>m.ReportsComponent
    ),

},



{
  path:'notifications',

  loadComponent:() =>
    import('./pages/notifications/notifications').then(
      (m)=>m.NotificationsComponent
    ),

},

{
  path:'users',
  loadComponent:() => import('./pages/users/users').then(m=>m.UsersComponent),
},

{
  path:'communication',
  loadComponent:() => import('./pages/communication/communication').then(m=>m.CommunicationComponent),
},
{
  path:'compliance',
  loadComponent:() => import('./pages/compliance/compliance').then(m=>m.ComplianceComponent),
},
{
  path:'invoices',
  loadComponent:() => import('./pages/invoices/invoices').then(m=>m.InvoicesComponent),
},
{
  path:'profile',
  loadComponent:() => import('./pages/profile/profile').then(m=>m.ProfileComponent),
},



]

},






{
 path:'**',

 redirectTo:''

}

];