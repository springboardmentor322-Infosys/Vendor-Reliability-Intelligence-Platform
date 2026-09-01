import { Injectable } from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  tap
} from 'rxjs';

import {
  Router
} from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class Auth {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient,
    private router: Router
  ) {}


  // ==========================================
  // LOGIN
  // ==========================================

  login(
    data: {
      email: string;
      password: string;
    }
  ): Observable<any> {

    return this.http
      .post<any>(
        `${this.apiUrl}/login`,
        data
      )
      .pipe(

        tap(
          (response: any) => {

            if (
              response.access_token
            ) {

              localStorage.setItem(
                'token',
                response.access_token
              );

            }


            if (response.user) {

              localStorage.setItem(
                'currentUser',
                JSON.stringify(response.user)
              );

            }

          }
        )

      );

  }


  // ==========================================
  // GET PROFILE
  // ==========================================

  getProfile(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/profile`
    );

  }


  // ==========================================
  // UPDATE PROFILE
  // ==========================================

  updateProfile(
    data: {
      full_name: string;
    }
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/profile`,
      data
    );

  }


  // ==========================================
  // CHANGE PASSWORD
  // ==========================================

  changePassword(
    data: {
      current_password: string;
      new_password: string;
    }
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/change-password`,
      data
    );

  }


  // ==========================================
  // LOGOUT
  // ==========================================

  logout(): void {

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'currentUser'
    );

    this.router.navigate([
      '/login'
    ]);

  }


  // ==========================================
  // GET CURRENT USER
  // ==========================================

  getCurrentUser(): any | null {

    const storedUser =
      localStorage.getItem(
        'currentUser'
      );

    if (storedUser) {

      try {
        return JSON.parse(storedUser);
      }
      catch {
        localStorage.removeItem('currentUser');
      }

    }

    return null;

  }


  // ==========================================
  // GET CURRENT ROLE
  // ==========================================

  getRole(): string | null {

    const user = this.getCurrentUser();

    if (user?.role) {
      return user.role;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.role || null;
    }
    catch {
      return null;
    }

  }


  // ==========================================
  // CHECK ANY ROLE
  // ==========================================

  hasAnyRole(allowedRoles: string[]): boolean {

    const role = this.getRole();

    return !!role && allowedRoles.includes(role);

  }


  // ==========================================
  // CHECK SINGLE ROLE
  // ==========================================

  hasRole(role: string): boolean {
    return this.getRole() === role;
  }


    // ==========================================
    // FORGOT PASSWORD
    // ==========================================

    forgotPassword(
      email: string
    ): Observable<any> {

      return this.http.post<any>(
        `${this.apiUrl}/forgot-password`,
        {
          email
        }
      );

    }


    // ==========================================
    // RESET PASSWORD
    // ==========================================

    resetPassword(
      data: {
        token: string;
        new_password: string;
      }
    ): Observable<any> {

      return this.http.post<any>(
        `${this.apiUrl}/reset-password`,
        data
      );

    }

  // ==========================================
  // REGISTER
  // ==========================================

  register(
    data: {
      full_name: string;
      email: string;
      password: string;
      role: string;
    }
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/register`,
      data
    );

  }

}