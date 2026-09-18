import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditLog {
  id: number;
  user: string;
  action: string;
  module: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/auditlogs';

  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(this.apiUrl);
  }
}

