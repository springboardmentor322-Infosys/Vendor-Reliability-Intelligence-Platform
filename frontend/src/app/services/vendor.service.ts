import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class VendorService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/vendors';

  getVendors() {
    return this.http.get<any[]>(this.apiUrl);
  }

  addVendor(vendor: any) {
    return this.http.post<any>(this.apiUrl, vendor);
  }

  updateVendor(id: number, vendor: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, vendor);
  }

  deleteVendor(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
