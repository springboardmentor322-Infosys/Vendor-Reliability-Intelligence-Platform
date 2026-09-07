import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Purchase Orders</h1>
        <p>Track PO fulfillment and delivery status.</p>
      </div>
    </div>
    
    <div class="card mt-4">
      <div class="card-head">
        <h3>All Purchase Orders</h3>
      </div>
      <div class="card-body" *ngIf="!loading">
        <table class="data-table w-full text-left">
          <thead>
            <tr>
              <th>PO Number</th>
              <th *ngIf="!isVendor">Vendor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let po of pos">
              <td>{{ po.po_number }}</td>
              <td *ngIf="!isVendor">{{ po.vendor ? po.vendor.name : 'Unknown' }}</td>
              <td>{{ po.amount | currency }}</td>
              <td>
                <span class="badge" [ngClass]="{'green': po.status === 'Completed' || po.status === 'Delivered', 'blue': po.status === 'Shipped', 'amber': po.status === 'Pending' || po.status === 'In Progress'}">{{ po.status }}</span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline mr-2" (click)="viewDetails(po.id)">View</button>
                <ng-container *ngIf="!isVendor && !isFinance">
                  <button class="btn btn-sm btn-outline text-emerald-600 border-emerald-300" *ngIf="po.status !== 'Completed'" (click)="updateStatus(po.id, 'Completed')">Mark Completed</button>
                </ng-container>
                <ng-container *ngIf="isVendor">
                  <button class="btn btn-sm btn-outline text-indigo-600 border-indigo-300" *ngIf="po.status === 'Pending' || po.status === 'In Progress'" (click)="updateStatus(po.id, 'Shipped')">Mark Shipped</button>
                </ng-container>
              </td>
            </tr>
            <tr *ngIf="!pos.length">
              <td colspan="5" class="text-center py-4 text-[var(--slate)]">No purchase orders found.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-body" *ngIf="loading">
        <p class="text-[var(--slate)]">Loading purchase orders...</p>
      </div>
    </div>
  `
})
export class PurchaseOrdersComponent implements OnInit {
  pos: any[] = [];
  loading = true;
  isVendor = false;
  isFinance = false;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const u = JSON.parse(userStr);
            if ((u.role?.name || u.role_name) === 'Vendor' || (u.role?.name || u.role_name) === 'vendor') {
        this.isVendor = true;
      }
      if ((u.role?.name || u.role_name) === 'Finance Officer' || (u.role?.name || u.role_name) === 'finance') {
        this.isFinance = true;
      }
    }

    this.http.get<any[]>(`${environment.apiBaseUrl}/procurement/purchase-orders`).subscribe({
      next: (data) => {
        this.pos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  updateStatus(id: number, status: string) {
    this.http.patch(`${environment.apiBaseUrl}/procurement/purchase-orders/${id}/status`, { status }).subscribe(() => {
      this.ngOnInit();
    });
  }

  viewDetails(poId: number) {
    this.router.navigate(['/pos', poId]);
  }
}
