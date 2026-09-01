import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Notification {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL NOTIFICATIONS
  // ==========================================

  getNotifications(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/notifications/`
    );

  }


  // ==========================================
  // GET UNREAD NOTIFICATIONS
  // ==========================================

  getUnreadNotifications(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/notifications/unread`
    );

  }


  // ==========================================
  // GET UNREAD COUNT
  // ==========================================

  getUnreadCount(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/notifications/unread/count`
    );

  }


  // ==========================================
  // GET SINGLE NOTIFICATION
  // ==========================================

  getNotification(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/notifications/${id}`
    );

  }


  // ==========================================
  // CREATE NOTIFICATION
  // ==========================================

  createNotification(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/notifications/`,
      data
    );

  }


  // ==========================================
  // UPDATE NOTIFICATION
  // ==========================================

  updateNotification(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/notifications/${id}`,
      data
    );

  }


  // ==========================================
  // MARK AS READ
  // ==========================================

  markAsRead(
    id: number
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/notifications/${id}/read`,
      {}
    );

  }


  // ==========================================
  // MARK ALL AS READ
  // ==========================================

  markAllAsRead(): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/notifications/read-all`,
      {}
    );

  }


  // ==========================================
  // DELETE NOTIFICATION
  // ==========================================

  deleteNotification(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/notifications/${id}`
    );

  }

}