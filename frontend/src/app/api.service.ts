import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  getDashboardSummary() {
    return this.http.get(`${this.apiUrl}/dashboard/summary`);
  }

  getRiskSummary() {
    return this.http.get(`${this.apiUrl}/dashboard/risk-summary`);
  }

  getProcurementAnalytics() {
    return this.http.get(`${this.apiUrl}/analytics/procurement`);
  }

  getVendors() {
    return this.http.get(`${this.apiUrl}/vendors`);
  }
getPurchaseOrders() {
  return this.http.get<any>(`${this.apiUrl}/purchase-orders`);
}

getContracts() {
  return this.http.get(`${this.apiUrl}/contracts`);
}

getCommunications() {
  return this.http.get(`${this.apiUrl}/communications`);
}

getVendorPerformance(vendorId: number) {
  return this.http.get(`${this.apiUrl}/vendors/${vendorId}/performance`);
}

  getNotifications() {
    return this.http.get(`${this.apiUrl}/notifications`);
  }
}