import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Report {

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(
    private http: HttpClient
  ) {}

  // ==========================================
  // REPORT SUMMARY
  // ==========================================

  getSummary(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/reports/summary`
    );

  }


  // ==========================================
  // VENDOR PERFORMANCE
  // ==========================================

  getVendorPerformance(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/reports/vendor-performance`
    );

  }


  // ==========================================
  // PROCUREMENT
  // ==========================================

  getProcurement(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/reports/procurement`
    );

  }


  // ==========================================
  // PURCHASE ORDER STATUS SUMMARY
  // ==========================================

  getOrderStatusSummary(): Observable<Record<string, number>> {

    return this.http.get<Record<string, number>>(
      `${this.apiUrl}/reports/orders/status-summary`
    );

  }


  // ==========================================
  // PURCHASE ORDERS
  // ==========================================

  getOrders(limit: number = 100, offset: number = 0): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/reports/orders`,
      {
        params: {
          limit: String(limit),
          offset: String(offset)
        }
      }
    );

  }


  // ==========================================
  // CONTRACTS
  // ==========================================

  getContracts(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/reports/contracts`
    );

  }


  // ==========================================
  // COMPLIANCE
  // ==========================================

  getCompliance(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/reports/compliance`
    );

  }


  // ==========================================
  // INVOICES
  // ==========================================

  getInvoices(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/reports/invoices`
    );

  }


  // ==========================================
  // EXPORT EXCEL
  // ==========================================

  downloadExcel(
    reportType: string
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/reports/export/excel`,
      {
        params: {
          report_type: reportType
        },
        responseType: 'blob'
      }
    );

  }


  // ==========================================
  // EXPORT PDF
  // ==========================================

  downloadPdf(
    reportType: string
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/reports/export/pdf`,
      {
        params: {
          report_type: reportType
        },
        responseType: 'blob'
      }
    );

  }

}