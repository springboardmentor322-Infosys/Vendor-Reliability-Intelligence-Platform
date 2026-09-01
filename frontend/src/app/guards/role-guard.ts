import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const auth = inject(Auth);
  const allowedRoles = (route.data?.['roles'] as string[] | undefined) || [];
  if (allowedRoles.length === 0 || auth.hasAnyRole(allowedRoles)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};