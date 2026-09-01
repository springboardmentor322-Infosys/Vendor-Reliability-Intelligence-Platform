import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Invoice {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL INVOICES
  // ==========================================

  getInvoices(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/invoices/`
    );

  }


  // ==========================================
  // GET SINGLE INVOICE
  // ==========================================

  getInvoice(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/invoices/${id}`
    );

  }


  // ==========================================
  // CREATE INVOICE
  // ==========================================

  createInvoice(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/invoices/`,
      data
    );

  }


  // ==========================================
  // UPDATE INVOICE STATUS
  // ==========================================

  updateInvoiceStatus(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/invoices/${id}/status`,
      data
    );

  }


  // ==========================================
  // DELETE INVOICE
  // ==========================================

  deleteInvoice(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/invoices/${id}`
    );

  }

}