import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Dashboard {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // DASHBOARD SUMMARY
  // ==========================================

  getDashboardSummary(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/dashboard/summary`
    );

  }


  // ==========================================
  // ORDER STATUS ANALYTICS
  // ==========================================

  getOrderStatus(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/dashboard/order-status`
    );

  }


  // ==========================================
  // VENDOR RELIABILITY
  // ==========================================

  getVendorReliability(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/dashboard/vendor-reliability`
    );

  }


  // ==========================================
  // REVENUE ANALYTICS
  // ==========================================

  getRevenueAnalytics(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/dashboard/revenue`
    );

  }


  // ==========================================
  // CONTRACT EXPIRY ALERTS
  // ==========================================

  getContractExpiryAlerts(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/contracts/alerts/expiry`
    );

  }

}