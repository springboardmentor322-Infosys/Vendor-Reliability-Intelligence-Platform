import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  inject
} from '@angular/core';


export const authGuard: CanActivateFn = () => {

  const router = inject(Router);

  const token =
    localStorage.getItem('token');


  // ==========================================
  // NO TOKEN
  // ==========================================

  if (!token) {

    return router.createUrlTree([
      '/login'
    ]);

  }


  // ==========================================
  // CHECK JWT EXPIRATION
  // ==========================================

  try {

    const payload =
      JSON.parse(
        atob(
          token.split('.')[1]
        )
      );


    const currentTime =
      Math.floor(
        Date.now() / 1000
      );


    // Token has expired
    if (
      !payload.exp ||
      payload.exp <= currentTime
    ) {

      localStorage.removeItem(
        'token'
      );


      return router.createUrlTree([
        '/login'
      ]);

    }


    // Token is valid
    return true;

  }

  catch (error) {

    console.error(
      'Invalid authentication token:',
      error
    );


    localStorage.removeItem(
      'token'
    );


    return router.createUrlTree([
      '/login'
    ]);

  }

};