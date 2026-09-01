import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Contract {

  private apiUrl = 'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL CONTRACTS
  // ==========================================

  getContracts(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/contracts/`
    );

  }


  // ==========================================
  // GET SINGLE CONTRACT
  // ==========================================

  getContract(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/contracts/${id}/`
    );

  }


  // ==========================================
  // CREATE CONTRACT
  // ==========================================

  createContract(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/contracts/`,
      data
    );

  }


  // ==========================================
  // UPDATE CONTRACT
  // ==========================================

  updateContract(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/contracts/${id}/`,
      data
    );

  }


  // ==========================================
  // DELETE CONTRACT
  // ==========================================

  deleteContract(
    id: number
  ): Observable<any> {

    console.log(
      'Deleting contract ID:',
      id
    );

    return this.http.delete<any>(
      `${this.apiUrl}/contracts/${id}/`
    );

  }


  // ==========================================
  // EXPIRY ALERTS
  // ==========================================

  getExpiryAlerts(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/contracts/alerts/expiry`
    );

  }


  // ==========================================
  // CONTRACT SUMMARY
  // ==========================================

  getContractSummary(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/contracts/summary`
    );

  }


  // ==========================================
  // GET CONTRACT DOCUMENTS
  // ==========================================

  getContractDocuments(
    contractId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/contract-documents/contract/${contractId}`
    );

  }


  // ==========================================
  // CREATE CONTRACT DOCUMENT / CERTIFICATION
  // ==========================================

  createContractDocument(
    data: any
  ): Observable<any> {

    let params = new HttpParams()

      .set(
        'contract_id',
        data.contract_id
      )

      .set(
        'certification_name',
        data.certification_name
      )

      .set(
        'status',
        data.status || 'Active'
      );


    if (data.certification_number) {

      params = params.set(
        'certification_number',
        data.certification_number
      );

    }


    if (data.issue_date) {

      params = params.set(
        'issue_date',
        data.issue_date
      );

    }


    if (data.expiry_date) {

      params = params.set(
        'expiry_date',
        data.expiry_date
      );

    }


    return this.http.post<any>(
      `${this.apiUrl}/contract-documents/`,
      {},
      {
        params
      }
    );

  }


  // ==========================================
  // UPLOAD DOCUMENT
  // ==========================================

  uploadContractDocument(
    documentId: number,
    file: File
  ): Observable<any> {

    const formData =
      new FormData();


    formData.append(
      'file',
      file
    );


    return this.http.post<any>(
      `${this.apiUrl}/contract-documents/${documentId}/upload`,
      formData
    );

  }


  // ==========================================
  // DELETE CONTRACT DOCUMENT
  // ==========================================

  deleteContractDocument(
    documentId: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/contract-documents/${documentId}`
    );

  }

}