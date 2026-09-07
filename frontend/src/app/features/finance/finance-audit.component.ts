import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-finance-audit',
    standalone: true,
    imports: [CommonModule],
    providers: [DatePipe],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Audit & Controls</h2>
      <p class="text-sm text-gray-500 mb-6">Finance-scoped audit trail: only APPROVE_INVOICE, REJECT_INVOICE, and PAY_INVOICE events. Read-only — records cannot be modified or deleted.</p>

      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading audit log...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>

      <div *ngIf="!loading && logs?.length === 0" class="text-center text-gray-500 py-16">
        <div class="text-4xl mb-3">🔍</div>
        <p>No finance audit events recorded yet. Approve, reject, or pay invoices to generate audit records.</p>
      </div>

      <div *ngIf="!loading && logs?.length" class="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-gray-400 uppercase text-xs border-b bg-gray-50">
            <tr>
              <th class="px-4 py-3">#</th>
              <th class="px-4 py-3">Action</th>
              <th class="px-4 py-3">Entity Type</th>
              <th class="px-4 py-3">Entity ID</th>
              <th class="px-4 py-3">User ID</th>
              <th class="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let log of logs" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-400 text-xs">{{log.id}}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full"
                  [ngClass]="{
                    'bg-emerald-100 text-emerald-700': log.action === 'APPROVE_INVOICE',
                    'bg-red-100 text-red-700': log.action === 'REJECT_INVOICE',
                    'bg-blue-100 text-blue-700': log.action === 'PAY_INVOICE'
                  }">
                  {{log.action}}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600">{{log.entity_type}}</td>
              <td class="px-4 py-3 text-gray-700 font-mono">#{{log.entity_id}}</td>
              <td class="px-4 py-3 text-gray-500">{{log.user_id}}</td>
              <td class="px-4 py-3 text-gray-500">{{log.created_at | date:'MMM d, y · HH:mm'}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-xs text-gray-400 mt-4 text-center">🔒 Read-only view. Audit records cannot be modified or deleted.</p>
    </div>
  `
})
export class FinanceAuditComponent implements OnInit {
    logs: any[] = [];
    loading = true;
    error = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any[]>('http://localhost:8000/finance/audit-controls?limit=200').subscribe({
            next: d => { this.logs = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load audit log.'; this.loading = false; }
        });
    }
}
