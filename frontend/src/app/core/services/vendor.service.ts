import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private apiUrl = 'http://localhost:8000/vendors';

  constructor(private http: HttpClient) {}

  getVendors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/`);
  }

  getVendor(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createVendor(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, data);
  }

  updateVendorStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories/`);
  }
}
