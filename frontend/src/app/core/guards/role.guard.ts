import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = localStorage.getItem('role');

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    alert('403 Forbidden: You do not have permission to access this dashboard.');
    router.navigate(['/login']);
    return false;
  };
};
