import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pm-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Procurement Overview</h1>
        <p>Organization-wide procurement requests, POs, and spend analytics.</p>
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
          <h3>Recent Procurement Requests</h3>
        </div>
        <div class="card-body">
          <table class="data-table w-full text-left">
            <thead>
              <tr>
                <th>PR ID</th>
                <th>Department</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pr of data?.recent_prs">
                <td>PR-{{ pr.id }}</td>
                <td>{{ pr.department }}</td>
                <td>\${{ pr.total_estimated_cost | number:'1.2-2' }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'green': pr.status === 'Approved' || pr.status === 'Delivered',
                    'teal': pr.status === 'Ordered',
                    'amber': pr.status === 'Pending',
                    'red': pr.status === 'Rejected'
                  }">{{ pr.status }}</span>
                </td>
              </tr>
              <tr *ngIf="!data?.recent_prs?.length">
                <td colspan="4" class="text-center py-4 text-[var(--slate)]">No recent PRs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <div class="card-head">
          <h3>Active Purchase Orders</h3>
        </div>
        <div class="card-body">
          <div class="text-center py-8 text-[var(--slate)]">PO module coming in Phase 3</div>
        </div>
      </div>
    </div>
  `
})
export class PmDashboardComponent {
  @Input() data: any;
}
