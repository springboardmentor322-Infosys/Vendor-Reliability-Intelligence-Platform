import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private apiUrl = 'http://localhost:8000/procurement/requests';

  constructor(private http: HttpClient) {}

  getProcurementRequests(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getProcurementRequest(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createProcurementRequest(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateProcurementRequestStatus(id: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status });
  }
}
