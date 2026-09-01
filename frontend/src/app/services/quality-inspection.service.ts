import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class QualityInspectionService {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL INSPECTIONS
  // ==========================================

  getInspections(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/quality-inspections/`
    );

  }


  // ==========================================
  // GET SINGLE INSPECTION
  // ==========================================

  getInspection(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/quality-inspections/${id}`
    );

  }


  // ==========================================
  // GET INSPECTIONS BY VENDOR
  // ==========================================

  getVendorInspections(
    vendorId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/quality-inspections/vendor/${vendorId}`
    );

  }


  // ==========================================
  // CREATE INSPECTION
  // ==========================================

  createInspection(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/quality-inspections/`,
      data
    );

  }


  // ==========================================
  // UPDATE INSPECTION
  // ==========================================

  updateInspection(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/quality-inspections/${id}`,
      data
    );

  }


  // ==========================================
  // DELETE INSPECTION
  // ==========================================

  deleteInspection(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/quality-inspections/${id}`
    );

  }

}