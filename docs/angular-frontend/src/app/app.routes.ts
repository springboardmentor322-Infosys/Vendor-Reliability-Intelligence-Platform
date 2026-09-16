import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { Orders } from './pages/orders/orders';
import { Login } from './pages/login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },

  {
    path: 'orders',
    component: Orders,
    canActivate: [authGuard]
  },

  {
    path: '',
    redirectTo: 'orders',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'orders'
  }
];