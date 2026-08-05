import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Vendor Dashboard</h1>
        <p>Manage your purchase orders, contracts and deliveries.</p>
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
          <h3>Assigned Purchase Orders</h3>
        </div>
        <div class="card-body">
          <div class="text-center py-8 text-[var(--slate)]">PO module coming in Phase 3</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>Active Contracts</h3>
        </div>
        <div class="card-body">
          <div class="text-center py-8 text-[var(--slate)]">Contracts module coming in Phase 4</div>
        </div>
      </div>
    </div>
  `
})
export class VendorDashboardComponent {
  @Input() data: any;
}
