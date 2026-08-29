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
    
    <div class="grid-2 mt-4">
      <div class="card">
        <div class="card-head">
          <h3>Recent Vendor Registrations</h3>
        </div>
        <div class="card-body">
          <table class="data-table w-full text-left">
            <thead><tr><th>Vendor Name</th><th>Category</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let v of data?.recent_vendors">
                <td>{{ v.name }}</td><td>{{ v.category }}</td>
                <td>
                  <span class="badge" [ngClass]="{'green': v.status === 'Approved' || v.status === 'Active', 'amber': v.status === 'Pending', 'red': v.status === 'Rejected'}">{{ v.status }}</span>
                </td>
              </tr>
              <tr *ngIf="!data?.recent_vendors?.length"><td colspan="3" class="text-center py-4 text-[var(--slate)]">No recent vendors</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <div class="card-head">
          <h3>Recent Procurement Requests</h3>
        </div>
        <div class="card-body">
          <table class="data-table w-full text-left">
            <thead><tr><th>PR ID</th><th>Department</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let pr of data?.recent_prs">
                <td>PR-{{ pr.id }}</td><td>{{ pr.department }}</td><td>{{ pr.total_cost | currency }}</td>
                <td><span class="badge" [ngClass]="{'green': pr.status === 'Approved', 'amber': pr.status === 'Pending', 'red': pr.status === 'Rejected'}">{{ pr.status }}</span></td>
              </tr>
              <tr *ngIf="!data?.recent_prs?.length"><td colspan="4" class="text-center py-4 text-[var(--slate)]">No recent PRs</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="grid-2 mt-4">
      <div class="card">
        <div class="card-head">
          <h3>Active Purchase Orders</h3>
        </div>
        <div class="card-body">
          <table class="data-table w-full text-left">
            <thead><tr><th>PO Number</th><th>Vendor</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let po of data?.active_pos">
                <td>{{ po.po_number }}</td><td>{{ po.vendor }}</td><td>{{ po.amount | currency }}</td>
                <td><span class="badge" [ngClass]="{'green': po.status === 'Completed' || po.status === 'Delivered', 'blue': po.status === 'Shipped', 'amber': po.status === 'Pending'}">{{ po.status }}</span></td>
              </tr>
              <tr *ngIf="!data?.active_pos?.length"><td colspan="4" class="text-center py-4 text-[var(--slate)]">No active POs</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>Recent Communications</h3>
        </div>
        <div class="card-body">
          <table class="data-table w-full text-left">
            <thead><tr><th>Thread</th><th>Sender</th><th>Message</th></tr></thead>
            <tbody>
              <tr *ngFor="let msg of data?.recent_communications">
                <td>{{ msg.thread_type }} {{ msg.thread_id }}</td><td>{{ msg.sender }}</td>
                <td>{{ msg.message }}</td>
              </tr>
              <tr *ngIf="!data?.recent_communications?.length"><td colspan="3" class="text-center py-4 text-[var(--slate)]">No recent messages</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {
  @Input() data: any;
}
