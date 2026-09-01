import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class UserManagement {

  private apiUrl =
    'http://127.0.0.1:8000/user-management';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL USERS
  // ==========================================

  getUsers(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/`
    );

  }


  // ==========================================
  // GET SINGLE USER
  // ==========================================

  getUser(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/${id}`
    );

  }


  // ==========================================
  // CREATE USER
  // ==========================================

  createUser(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/`,
      data
    );

  }


  // ==========================================
  // UPDATE USER
  // ==========================================

  updateUser(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/${id}`,
      data
    );

  }


  // ==========================================
  // UPDATE USER ROLE
  // ==========================================

  updateUserRole(
    id: number,
    role: string
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/${id}/role`,
      {
        role
      }
    );

  }


  // ==========================================
  // DELETE USER
  // ==========================================

  deleteUser(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/${id}`
    );

  }

}