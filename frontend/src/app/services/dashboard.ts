import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000';

  getDashboard() {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }
}
