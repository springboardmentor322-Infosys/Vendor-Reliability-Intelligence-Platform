import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Admin Dashboard</h1>
        <p>Organization-wide snapshot across vendors, procurement and compliance.</p>
      </div>
    </div>
    
    <div class="kpi-row" *ngIf="data?.kpis">
      <div class="kpi" *ngFor="let kpi of data.kpis">
        <div class="lbl"><span>{{ kpi.label }}</span></div>
        <div class="val">{{ kpi.value }}</div>
        <div class="delta" [ngClass]="kpi.is_up ? 'up' : 'down'">{{ kpi.trend }}</div>
      </div>
    </div>
    
    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <h3>Recent Vendor Registrations</h3>
        </div>
        <div class="card-body">
          <table class="data-table w-full text-left">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of data?.recent_vendors">
                <td>{{ v.name }}</td>
                <td>{{ v.category }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'green': v.status === 'Approved' || v.status === 'Active',
                    'amber': v.status === 'Pending',
                    'red': v.status === 'Rejected'
                  }">{{ v.status }}</span>
                </td>
              </tr>
              <tr *ngIf="!data?.recent_vendors?.length">
                <td colspan="3" class="text-center py-4 text-[var(--slate)]">No recent vendors</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <div class="card-head">
          <h3>Overall Compliance Status</h3>
        </div>
        <div class="card-body">
          <div class="gauge-wrap">
            <svg width="170" height="105" viewBox="0 0 170 105">
              <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="#EEF1F2" stroke-width="12"/>
              <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="#2F8F5B" stroke-width="12" stroke-linecap="round" stroke-dasharray="220 220"/>
              <text x="85" y="76" text-anchor="middle" font-family="IBM Plex Mono" font-size="26" font-weight="600" fill="#132436">100</text>
              <text x="85" y="94" text-anchor="middle" font-family="IBM Plex Sans" font-size="10" fill="#5B6B75">/ 100</text>
            </svg>
            <div class="gauge-label">Overall System Compliance</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {
  @Input() data: any;
}
