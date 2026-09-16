import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);

  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('role');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const requiredRole = route.data['role'];

  if (role === requiredRole) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};