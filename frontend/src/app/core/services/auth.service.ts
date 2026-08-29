import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('token');
    if (token) {
      this.fetchCurrentUser().subscribe({
        error: () => this.logout()
      });
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          this.decodeAndStoreRole(response.access_token);
          this.fetchCurrentUser().subscribe();
        }
      })
    );
  }

  private decodeAndStoreRole(token: string) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      if (decoded.role) {
        localStorage.setItem('role', decoded.role);
      }
    } catch (e) {
      console.error('Failed to parse JWT token');
    }
  }

  fetchCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`).pipe(
      tap((user: any) => {
        this.currentUserSubject.next(user);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
