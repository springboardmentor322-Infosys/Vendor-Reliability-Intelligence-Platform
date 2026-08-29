import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../../../../core/services/procurement.service';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <table class="data-table w-full text-left">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let po of data?.active_pos">
                <td class="font-medium text-[var(--ink)]">{{ po.po_number }}</td>
                <td class="font-mono text-sm">\${{ po.amount | number:'1.2-2' }}</td>
                <td>
                  <select class="input-field py-1 text-sm bg-transparent" [(ngModel)]="po.status" (change)="updateStatus(po.id, po.status)">
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Partial Delivery">Partial Delivery</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed" disabled>Completed</option>
                  </select>
                </td>
                <td>
                  <button class="btn-ghost text-xs py-1" (click)="openUploadModal(po.id)">Upload Doc</button>
                </td>
              </tr>
              <tr *ngIf="!data?.active_pos?.length">
                <td colspan="4" class="text-center py-8 text-[var(--slate)]">No active Purchase Orders</td>
              </tr>
            </tbody>
          </table>
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

    <!-- Upload Modal -->
    <div class="modal-overlay" *ngIf="showUploadModal" (click)="closeUploadModal()">
      <div class="modal-content max-w-md bg-white rounded-xl shadow-xl p-6" (click)="$event.stopPropagation()">
        <h3 class="font-bold text-lg mb-4">Upload Document</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Document Type</label>
          <select class="input-field w-full" [(ngModel)]="uploadDocType">
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
          </select>
        </div>
        <div class="mb-6">
          <label class="block text-sm font-medium mb-1">File (PDF/PNG/JPG)</label>
          <input type="file" class="input-field w-full" (change)="onFileSelected($event)" accept="application/pdf,image/png,image/jpeg">
        </div>
        <div class="flex gap-3 justify-end">
          <button class="btn-ghost" (click)="closeUploadModal()">Cancel</button>
          <button class="btn-primary" [disabled]="!selectedFile" (click)="uploadFile()">Upload</button>
        </div>
      </div>
    </div>
  `
})
export class VendorDashboardComponent {
  @Input() data: any;
  
  showUploadModal = false;
  uploadPoId: number | null = null;
  uploadDocType = 'invoice';
  selectedFile: File | null = null;
  
  constructor(private procurementService: ProcurementService) {}
  
  updateStatus(poId: number, status: string) {
    this.procurementService.updatePurchaseOrderStatus(poId, status).subscribe({
      next: (res) => alert(`Status updated to ${res.status}`),
      error: (err) => {
        alert(err.error?.detail || 'Failed to update status');
        // Ideally revert the select value here, but this is a simple demo
      }
    });
  }
  
  openUploadModal(poId: number) {
    this.uploadPoId = poId;
    this.showUploadModal = true;
    this.selectedFile = null;
  }
  
  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadPoId = null;
    this.selectedFile = null;
  }
  
  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }
  
  uploadFile() {
    if (!this.selectedFile || !this.uploadPoId) return;
    this.procurementService.uploadPoDocument(this.uploadPoId, this.selectedFile, this.uploadDocType)
      .subscribe({
        next: (res) => {
          alert(res.message);
          this.closeUploadModal();
        },
        error: (err) => alert(err.error?.detail || 'Upload failed')
      });
  }
}
