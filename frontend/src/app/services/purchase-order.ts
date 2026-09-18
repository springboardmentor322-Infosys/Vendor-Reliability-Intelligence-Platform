import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/purchaseorders';

  getPurchaseOrders() {
    return this.http.get<any[]>(this.apiUrl);
  }

  addPurchaseOrder(purchaseOrder: any) {
    return this.http.post<any>(this.apiUrl, purchaseOrder);
  }
}
