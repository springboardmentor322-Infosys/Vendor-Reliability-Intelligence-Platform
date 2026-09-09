import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuditPlanService {

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL AUDIT PLANS
  // ==========================================

  getAuditPlans(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/audit-plans/`
    );

  }


  // ==========================================
  // GET SINGLE AUDIT PLAN
  // ==========================================

  getAuditPlan(id: number): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/audit-plans/${id}`
    );

  }


  // ==========================================
  // CREATE AUDIT PLAN
  // ==========================================

  createAuditPlan(data: any): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/audit-plans/`,
      data
    );

  }


  // ==========================================
  // UPDATE AUDIT PLAN
  // ==========================================

  updateAuditPlan(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/audit-plans/${id}`,
      data
    );

  }


  // ==========================================
  // DELETE AUDIT PLAN
  // ==========================================

  deleteAuditPlan(id: number): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/audit-plans/${id}`
    );

  }

}