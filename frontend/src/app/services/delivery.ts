import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Delivery {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET DELIVERIES - PAGINATED
  // ==========================================

  getDeliveries(
    page: number = 1,
    limit: number = 50
  ): Observable<any> {

    const params =
      new HttpParams()
        .set(
          'page',
          page
        )
        .set(
          'limit',
          limit
        );


    return this.http.get<any>(
      `${this.apiUrl}/deliveries/`,
      { params }
    );

  }


  // ==========================================
  // GET DELIVERY BY ID
  // ==========================================

  getDelivery(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/deliveries/${id}`
    );

  }


  // ==========================================
  // GET DELIVERIES BY ORDER
  // ==========================================

  getOrderDeliveries(
    orderId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/deliveries/order/${orderId}`
    );

  }


  // ==========================================
  // GET DELIVERIES BY VENDOR
  // ==========================================

  getVendorDeliveries(
    vendorId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/deliveries/vendor/${vendorId}`
    );

  }


  // ==========================================
  // GET DELAYED DELIVERIES
  // ==========================================

  getDelayedDeliveries(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/deliveries/delayed`
    );

  }


  // ==========================================
  // GET SUMMARY
  // ==========================================

  getDeliverySummary(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/deliveries/summary`
    );

  }


  // ==========================================
  // CREATE DELIVERY
  // ==========================================

  createDelivery(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/deliveries/`,
      data
    );

  }


  // ==========================================
  // UPDATE DELIVERY
  // ==========================================

  updateDelivery(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/deliveries/${id}`,
      data
    );

  }


  // ==========================================
  // DELETE DELIVERY
  // ==========================================

  deleteDelivery(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/deliveries/${id}`
    );

  }

}