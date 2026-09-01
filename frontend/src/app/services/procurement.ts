import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Procurement {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ================================
  // GET ALL PROCUREMENT REQUESTS
  // ================================

  getProcurementRequests(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/procurement/`
    );

  }


  // ================================
  // GET SINGLE PROCUREMENT REQUEST
  // ================================

  getProcurementRequest(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/procurement/${id}`
    );

  }


  // ================================
  // CREATE PROCUREMENT REQUEST
  // ================================

  createProcurementRequest(
    data: any
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/procurement/`,
      data
    );

  }


  // ================================
  // UPDATE PROCUREMENT REQUEST
  // ================================

  updateProcurementRequest(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/procurement/${id}`,
      data
    );

  }


  // ================================
  // DELETE PROCUREMENT REQUEST
  // ================================

  deleteProcurementRequest(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/procurement/${id}`
    );

  }


  // ================================
  // APPROVE PROCUREMENT REQUEST
  // ================================

  approveProcurementRequest(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/procurement/${id}/approve`,
      {}
    );

  }


  // ================================
  // REJECT PROCUREMENT REQUEST
  // ================================

  rejectProcurementRequest(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/procurement/${id}/reject`,
      {}
    );

  }


  // ================================
  // CREATE ORDER FROM PROCUREMENT
  // ================================

  createOrderFromProcurement(
    id: number
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/orders/from-procurement/${id}`,
      {}
    );

  }

}