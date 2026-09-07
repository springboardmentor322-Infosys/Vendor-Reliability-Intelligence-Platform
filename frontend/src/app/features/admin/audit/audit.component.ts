import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-audit',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head">
      <div>
        <h1>Audit Logs</h1>
        <p>System activity and tracking.</p>
      </div>
    </div>
    <div class="card mt-6">
      <div class="card-head">
        <h3>Recent Activity</h3>
      </div>
      <div class="card-body overflow-x-auto">
        <table class="w-full text-left" *ngIf="logs.length > 0; else noData">
          <thead>
            <tr>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">Timestamp</th>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">User</th>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">Action</th>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">Resource</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs" class="border-b last:border-0 hover:bg-slate-50">
              <td class="p-3 text-sm text-[var(--slate-2)]">{{ log.created_at | date:'medium' }}</td>
              <td class="p-3 font-medium">{{ log.user_email }}</td>
              <td class="p-3">{{ log.action }}</td>
              <td class="p-3">{{ log.entity_type || 'System' }} <span *ngIf="log.entity_id">#{{ log.entity_id }}</span></td>
            </tr>
          </tbody>
        </table>
        <ng-template #noData>
          <div class="p-6 text-center text-slate-500">No records available</div>
        </ng-template>
      </div>
    </div>
  `
})
export class AuditComponent implements OnInit {
    logs: any[] = [];

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any[]>(`${environment.apiBaseUrl}/audit/`).subscribe(
            res => this.logs = res,
            err => console.error('Error fetching audit logs', err)
        );
    }
}
