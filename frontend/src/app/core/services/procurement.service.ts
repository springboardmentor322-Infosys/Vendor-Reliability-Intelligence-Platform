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

  getEligibleVendors(category: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8000/procurement/eligible-vendors?category=${encodeURIComponent(category)}`);
  }

  createPurchaseOrder(prId: number, vendorId: number): Observable<any> {
    return this.http.post<any>(`http://localhost:8000/procurement/purchase-orders?pr_id=${prId}`, { vendor_id: vendorId });
  }

  getPurchaseOrders(): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8000/procurement/purchase-orders`);
  }

  updatePurchaseOrderStatus(poId: number, status: string): Observable<any> {
    return this.http.patch<any>(`http://localhost:8000/procurement/purchase-orders/${poId}/status`, { status });
  }

  uploadPoDocument(poId: number, file: File, docType: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    return this.http.post<any>(`http://localhost:8000/procurement/purchase-orders/${poId}/documents`, formData);
  }
}
