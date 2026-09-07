import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-po-detail',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-head flex justify-between items-center pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center space-x-3 mb-2">
            <button class="text-gray-500 hover:text-blue-600 transition" (click)="goBack()">← Back</button>
            <h1 class="text-2xl font-bold text-gray-900">Purchase Order Details</h1>
        </div>
        <p class="text-sm text-gray-500">View and manage information for PO #{{po?.po_number}}</p>
      </div>
      <div>
        <span class="px-3 py-1 rounded-full text-sm font-semibold"
              [ngClass]="{
                  'bg-emerald-100 text-emerald-700': po?.status === 'Completed' || po?.status === 'Delivered',
                  'bg-blue-100 text-blue-700': po?.status === 'Ordered',
                  'bg-amber-100 text-amber-700': po?.status === 'Pending' || po?.status === 'Approved',
                  'bg-red-100 text-red-700': po?.status === 'Cancelled'
              }">
            {{po?.status || 'Loading...'}}
        </span>
      </div>
    </div>

    <div *ngIf="loading" class="mt-8 text-center text-gray-500">Loading purchase order data...</div>
    
    <div *ngIf="!loading && po" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      
      <!-- General Info -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
            <h3 class="font-bold text-gray-800 mb-4 pb-2 border-b">Order Information</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div class="text-gray-500 mb-1">Total Amount</div>
                    <div class="font-semibold text-lg">{{po.amount | currency}}</div>
                </div>
                <div>
                    <div class="text-gray-500 mb-1">Creation Date</div>
                    <div class="font-medium text-gray-800">{{(po.created_at | date:'medium') || 'N/A'}}</div>
                </div>
                <div>
                    <div class="text-gray-500 mb-1">External Ref / Source</div>
                    <div class="font-medium text-gray-800">{{po.external_order_id || 'Internal System'}}</div>
                </div>
            </div>
            
            <div class="mt-6 pt-4 border-t border-gray-100">
                <h4 class="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Line Items</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-50 text-gray-500 font-semibold text-xs tracking-wider">
                            <tr>
                                <th class="px-4 py-2">Item</th>
                                <th class="px-4 py-2 text-center">Quantity</th>
                                <th class="px-4 py-2 text-right">Unit Price</th>
                                <th class="px-4 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr *ngFor="let item of po.items">
                                <td class="px-4 py-3 font-medium text-gray-800">{{item.item_name}}</td>
                                <td class="px-4 py-3 text-center text-gray-600">{{item.quantity}}</td>
                                <td class="px-4 py-3 text-right text-gray-600">{{item.unit_price | currency}}</td>
                                <td class="px-4 py-3 text-right font-semibold text-gray-800">{{(item.quantity * item.unit_price) | currency}}</td>
                            </tr>
                            <tr *ngIf="!po.items?.length">
                                <td colspan="4" class="px-4 py-6 text-center text-gray-400">No items tied to this PO.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>

      <!-- Sidebar Info -->
      <div class="space-y-6">
        <!-- Vendor Card -->
        <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
            <h3 class="font-bold text-gray-800 mb-4 pb-2 border-b">Vendor Details</h3>
            <div class="text-sm">
                <div class="font-semibold text-lg text-blue-700 mb-1">{{po.vendor?.name || 'Unknown Vendor'}}</div>
                <div class="text-gray-500 mb-3">Vendor ID: #{{po.vendor?.id}}</div>
                <button class="w-full py-2 bg-slate-50 hover:bg-slate-100 border text-gray-700 rounded-lg text-sm font-medium transition">
                    View Full Profile
                </button>
            </div>
        </div>
        
        <!-- Workflow Actions -->
        <div *ngIf="!isFinance">
        <div *ngIf="!isFinance" class="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
            <h3 class="font-bold text-gray-800 mb-4 pb-2 border-b">Workflow Actions</h3>
            <div class="space-y-3">
                <select [(ngModel)]="selectedStatus" class="w-full bg-slate-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Ordered">Ordered</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
                <button [disabled]="saving" (click)="updateStatus()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-50">
                    {{saving ? 'Updating...' : 'Update Status'}}
                </button>
            </div>
            
            <div *ngIf="errorMsg" class="mt-3 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                {{errorMsg}}
            </div>
            <div *ngIf="successMsg" class="mt-3 p-3 bg-emerald-50 text-emerald-600 text-xs rounded border border-emerald-100">
                {{successMsg}}
            </div>
        </div>
      </div>
      
    </div>
      
    </div>
  `
})
export class PoDetailComponent implements OnInit {
    poId: number | null = null;
    po: any = null;
    loading = true;
    saving = false;
    isFinance = false;
    selectedStatus = '';
    errorMsg = '';
    successMsg = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.poId = parseInt(id, 10);
                this.loadPo();
            }
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                const u = JSON.parse(userStr);
                if ((u.role?.name || u.role_name) === 'Finance Officer' || (u.role?.name || u.role_name) === 'finance') {
                    this.isFinance = true;
                }
            }
        });
    }

    loadPo() {
        this.loading = true;
        this.http.get<any>(`${environment.apiBaseUrl}/procurement/purchase-orders/${this.poId}`).subscribe({
            next: (data) => {
                this.po = data;
                this.selectedStatus = data.status || 'Pending';
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.errorMsg = "Failed to load Purchase Order details.";
                this.loading = false;
            }
        });
    }

    updateStatus() {
        this.saving = true;
        this.errorMsg = '';
        this.successMsg = '';

        this.http.patch(`${environment.apiBaseUrl}/procurement/purchase-orders/${this.poId}/status`, { status: this.selectedStatus }).subscribe({
            next: () => {
                this.saving = false;
                this.successMsg = 'Status successfully updated.';
                this.loadPo(); // reload to get any audit trails/status sync
            },
            error: (err) => {
                this.saving = false;
                this.errorMsg = err.error?.detail || 'Invalid transition or unauthorized.';
            }
        });
    }

    goBack() {
        this.router.navigate(['/pos']);
    }
}
