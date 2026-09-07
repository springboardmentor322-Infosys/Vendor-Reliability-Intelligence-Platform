import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:8000/analytics/dashboard-summary';

  constructor(private http: HttpClient) { }

  getDashboardSummary(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getRoleDashboard(roleKey: string): Observable<any> {
    if (['scm', 'pm', 'vendor', 'finance', 'auditor'].includes(roleKey)) {
      return this.http.get<any>(`http://localhost:8000/analytics/dashboard/${roleKey}`);
    }
    return this.getDashboardSummary();
  }
}
