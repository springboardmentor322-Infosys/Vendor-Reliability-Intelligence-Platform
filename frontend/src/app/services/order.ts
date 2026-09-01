import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Order {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ================================
  // GET ALL ORDERS
  // ================================

  getOrders(status: string = 'All', search: string = '', limit: number = 100, offset: number = 0): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/orders/`,
      {
        params: {
          status,
          search,
          limit: String(limit),
          offset: String(offset)
        }
      }
    );

  }


  // ================================
  // GET TOTAL ORDER COUNT
  // ================================

  getOrderCount(status: string = 'All', search: string = ''): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/orders/count`,
      {
        params: { status, search }
      }
    );

  }


  // ================================
  // GET PENDING ORDER COUNT
  // ================================

  getPendingOrderCount(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/orders/pending/count`
    );

  }


  // ================================
  // CREATE ORDER
  // ================================

  createOrder(
    data: any
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/orders/`,
      data
    );

  }


  // ================================
  // UPDATE ORDER
  // ================================

  updateOrder(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/orders/${id}`,
      data
    );

  }


  // ================================
  // DELETE ORDER
  // ================================

  deleteOrder(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/orders/${id}`
    );

  }


  // ================================
  // GET TOTAL REVENUE
  // ================================

  getTotalRevenue(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/orders/revenue`
    );

  }


  // ================================
  // GET ORDER STATUS SUMMARY
  // ================================

  getOrderStatusSummary(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/orders/status-summary`
    );

  }

}