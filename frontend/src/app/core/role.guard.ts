import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';


export const roleGuard = (roles: string[]): CanActivateFn => {

  return () => {

    const auth = inject(AuthService);

    const router = inject(Router);


    const user = auth.currentUser();



    if(!user){

      return router.createUrlTree(['/login']);

    }



    if(roles.includes(user.role)){

      return true;

    }



    return router.createUrlTree(['/vendor-dashboard']);

  };

};