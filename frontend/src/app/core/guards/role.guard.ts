import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // In a real app, you would decode the JWT to check the role, 
    // or fetch the profile. Since this is Milestone 1, we assume
    // AuthService might have a currentUser object or we check localStorage.
    
    // For M1 gap analysis: we need to ensure users can't route to the wrong dashboard.
    // We will just do a basic check here. If the authService doesn't have roles implemented on frontend yet, 
    // we just return true. But this lays the architectural foundation!
    
    const userRole = localStorage.getItem('role'); // Simulate fetching role

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    router.navigate(['/dashboard']); // Redirect to their default dashboard
    return false;
  };
};
