import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuditFindingService {

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  getFindings(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/audit-findings/`
    );
  }

  getFinding(id: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/audit-findings/${id}`
    );
  }

  createFinding(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/audit-findings/`,
      data
    );
  }

  updateFinding(
    id: number,
    data: any
  ): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/audit-findings/${id}`,
      data
    );
  }

  deleteFinding(id: number): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/audit-findings/${id}`
    );
  }
}