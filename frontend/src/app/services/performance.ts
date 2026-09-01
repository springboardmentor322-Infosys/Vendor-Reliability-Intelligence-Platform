import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Performance {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL PERFORMANCE RECORDS
  // ==========================================

  getPerformance(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/performance/`
    );

  }


  // ==========================================
  // GET PERFORMANCE BY VENDOR
  // ==========================================

  getVendorPerformance(
    vendorId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/performance/vendor/${vendorId}`
    );

  }


  // ==========================================
  // GET SINGLE PERFORMANCE RECORD
  // ==========================================

  getPerformanceById(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/performance/${id}`
    );

  }


  // ==========================================
  // CREATE PERFORMANCE
  // ==========================================

  createPerformance(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/performance/`,
      data
    );

  }


  // ==========================================
  // UPDATE PERFORMANCE
  // ==========================================

  updatePerformance(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/performance/${id}`,
      data
    );

  }


  // ==========================================
  // DELETE PERFORMANCE
  // ==========================================

  deletePerformance(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/performance/${id}`
    );

  }


  // ==========================================
  // GET VENDOR RELIABILITY
  // ==========================================

  getVendorReliability(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/performance/reliability`
    );

  }

  // ==========================================
  // GET PERFORMANCE TREND
  // ==========================================

  getPerformanceTrend(
    vendorId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/performance/trend/${vendorId}`
    );

  }


  // ==========================================
  // COMPARE TWO VENDORS
  // ==========================================

  compareVendors(
    vendorAId: number,
    vendorBId: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/performance/compare/${vendorAId}/${vendorBId}`
    );

  }

}

