import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (roles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser() || auth.getStoredUser();

    if (!user) return router.createUrlTree(['/login']);
    if (roles.includes(user.role)) return true;

    const role = String(user.role || '').toLowerCase();
    const target = role === 'vendor' ? '/vendor-dashboard'
      : role === 'procurement manager' ? '/procurement-dashboard'
      : role === 'supply chain manager' ? '/supply-chain-dashboard'
      : role === 'finance officer' ? '/finance-dashboard'
      : role === 'auditor' ? '/audit-dashboard'
      : '/dashboard';
    return router.createUrlTree([target]);
  };
};
