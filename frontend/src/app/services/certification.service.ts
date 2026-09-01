import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CertificationService {

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(
    private http: HttpClient
  ) {}

  // ==========================================
  // GET ALL CERTIFICATIONS
  // ==========================================

  getCertifications(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/certifications/`
    );

  }

  // ==========================================
  // GET SINGLE CERTIFICATION
  // ==========================================

  getCertification(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/certifications/${id}`
    );

  }

  // ==========================================
  // GET VENDOR CERTIFICATIONS
  // ==========================================

  getVendorCertifications(
    vendorId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/certifications/vendor/${vendorId}`
    );

  }

  // ==========================================
  // CREATE CERTIFICATION
  // ==========================================

  createCertification(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/certifications/`,
      data
    );

  }

  // ==========================================
  // UPDATE CERTIFICATION
  // ==========================================

  updateCertification(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/certifications/${id}`,
      data
    );

  }

  // ==========================================
  // DELETE CERTIFICATION
  // ==========================================

  deleteCertification(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/certifications/${id}`
    );

  }

  // ==========================================
  // EXPIRING CERTIFICATIONS
  // ==========================================

  getExpiringCertifications(
    days: number = 30
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/certifications/alerts/expiring?days=${days}`
    );

  }

  // ==========================================
  // EXPIRED CERTIFICATIONS
  // ==========================================

  getExpiredCertifications(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/certifications/alerts/expired`
    );

  }

}