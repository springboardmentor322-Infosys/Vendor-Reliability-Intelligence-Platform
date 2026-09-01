import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContractDocumentService {

  private apiUrl = 'http://127.0.0.1:8000/contract-documents';

  constructor(
    private http: HttpClient
  ) {}

  // ==========================================
  // GET DOCUMENTS FOR CONTRACT
  // ==========================================

  getContractDocuments(
    contractId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/contract/${contractId}`
    );

  }


  // ==========================================
  // GET SINGLE DOCUMENT
  // ==========================================

  getContractDocument(
    documentId: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/${documentId}`
    );

  }


  // ==========================================
  // CREATE DOCUMENT RECORD
  // ==========================================

  createContractDocument(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/`,
      null,
      {
        params: {
          contract_id: data.contract_id,
          certification_name:
            data.certification_name,
          certification_number:
            data.certification_number || '',
          issue_date:
            data.issue_date || '',
          expiry_date:
            data.expiry_date || '',
          status:
            data.status || 'Active'
        }
      }
    );

  }


  // ==========================================
  // UPLOAD FILE
  // ==========================================

  uploadDocument(
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
      `${this.apiUrl}/${documentId}/upload`,
      formData
    );

  }


  // ==========================================
  // UPDATE DOCUMENT
  // ==========================================

  updateContractDocument(
    documentId: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/${documentId}`,
      null,
      {
        params: {
          certification_name:
            data.certification_name,
          certification_number:
            data.certification_number || '',
          issue_date:
            data.issue_date || '',
          expiry_date:
            data.expiry_date || '',
          status:
            data.status || 'Active'
        }
      }
    );

  }


  // ==========================================
  // DELETE DOCUMENT
  // ==========================================

  deleteContractDocument(
    documentId: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/${documentId}`
    );

  }


  // ==========================================
  // DOWNLOAD DOCUMENT
  // ==========================================

  downloadDocument(
    documentId: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/${documentId}/download`,
      {
        responseType: 'blob'
      }
    );

  }

}