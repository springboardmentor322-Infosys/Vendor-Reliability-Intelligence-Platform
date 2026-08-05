import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auditor-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Auditor Dashboard</h1>
        <p>Monitor compliance, access audit logs and generate reports.</p>
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
          <h3>Recent Audit Logs</h3>
        </div>
        <div class="card-body">
          <div class="text-center py-8 text-[var(--slate)]">Audit Log module coming in Phase 5</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>Compliance Alerts</h3>
        </div>
        <div class="card-body">
          <div class="text-center py-8 text-[var(--slate)]">Compliance reporting coming in Phase 5</div>
        </div>
      </div>
    </div>
  `
})
export class AuditorDashboardComponent {
  @Input() data: any;
}
