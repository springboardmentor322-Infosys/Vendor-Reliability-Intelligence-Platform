import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Finance Dashboard</h1>
        <p>Monitor procurement spend and approve requests.</p>
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
          <h3>Pending PR Approvals</h3>
        </div>
        <div class="card-body">
          <table class="data-table w-full text-left">
            <thead>
              <tr>
                <th>PR ID</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pr of data?.recent_prs">
                <ng-container *ngIf="pr.status === 'Pending'">
                  <td>PR-{{ pr.id }}</td>
                  <td>\${{ pr.total_estimated_cost | number:'1.2-2' }}</td>
                  <td><span class="badge amber">{{ pr.status }}</span></td>
                </ng-container>
              </tr>
              <tr *ngIf="!data?.recent_prs?.length">
                <td colspan="3" class="text-center py-4 text-[var(--slate)]">No pending PRs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>Invoice Summary</h3>
        </div>
        <div class="card-body">
          <div class="text-center py-8 text-[var(--slate)]">Invoicing module coming in Phase 4</div>
        </div>
      </div>
    </div>
  `
})
export class FinanceDashboardComponent {
  @Input() data: any;
}
