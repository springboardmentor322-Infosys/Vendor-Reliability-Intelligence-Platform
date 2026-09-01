import {
  HttpInterceptorFn
} from '@angular/common/http';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  catchError,
  throwError
} from 'rxjs';


export const authInterceptor: HttpInterceptorFn = (
  req,
  next
) => {

  const router =
    inject(Router);


  // ==========================================
  // GET TOKEN
  // ==========================================

  const token =
    localStorage.getItem('token');


  // ==========================================
  // ADD AUTHORIZATION HEADER
  // ==========================================

  let authReq = req;


  if (token) {

    authReq =
      req.clone({

        setHeaders: {

          Authorization:
            `Bearer ${token}`

        }

      });

  }


  // ==========================================
  // SEND REQUEST
  // ==========================================

  return next(authReq).pipe(

    catchError(
      (error: HttpErrorResponse) => {


        // ==========================================
        // TOKEN EXPIRED / INVALID
        // ==========================================

        if (
          error.status === 401
        ) {

          console.warn(
            'Authentication failed. Redirecting to login.'
          );


          localStorage.removeItem(
            'token'
          );


          router.navigate([
            '/login'
          ]);

        }


        return throwError(
          () => error
        );

      }
    )

  );

};