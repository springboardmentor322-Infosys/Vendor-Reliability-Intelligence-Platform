import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-finance-invoices',
    standalone: true,
    imports: [CommonModule, FormsModule],
    providers: [DatePipe],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Invoices & Payments</h2>
          <p class="text-sm text-gray-500">View, approve, reject, and process payments for invoices.</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-3 mb-5 flex-wrap">
        <select [(ngModel)]="statusFilter" (change)="load()" class="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-200">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Paid">Paid</option>
          <option value="Rejected">Rejected</option>
        </select>
        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" [(ngModel)]="overdueOnly" (change)="load()" class="rounded">
          Overdue Only
        </label>
      </div>

      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading invoices...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>

      <!-- Invoice detail panel (if invoice_id in URL) -->
      <div *ngIf="selectedId && detail" class="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-gray-900 text-lg">{{detail.invoice_number}}</h3>
            <p class="text-sm text-gray-600">Vendor: <strong>{{detail.vendor || '-'}}</strong> · PO: {{detail.po_number || '-'}}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-sm font-semibold"
            [ngClass]="statusClass(detail.effective_status)">
            {{detail.effective_status}}
          </span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div><span class="text-gray-500">Invoice Amount</span><div class="font-bold text-gray-900">₹{{formatMillions(detail.amount)}}</div></div>
          <div><span class="text-gray-500">Tax Amount</span><div class="font-bold">₹{{formatMillions(detail.tax_amount)}}</div></div>
          <div><span class="text-gray-500">Total Paid</span><div class="font-bold text-emerald-600">₹{{formatMillions(detail.total_paid)}}</div></div>
          <div><span class="text-gray-500">Outstanding</span><div class="font-bold text-red-600">₹{{formatMillions(detail.outstanding_balance)}}</div></div>
        </div>
        <!-- Actions -->
        <div class="flex gap-3 flex-wrap" *ngIf="detail.effective_status !== 'Paid' && detail.effective_status !== 'Rejected'">
          <button *ngIf="detail.status === 'Pending' || detail.status === 'Under Review'"
            (click)="approve(detail.id)"
            class="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-semibold">
            ✅ Approve
          </button>
          <button *ngIf="detail.status !== 'Rejected'"
            (click)="showReject=true"
            class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-semibold">
            ❌ Reject
          </button>
          <button *ngIf="detail.status === 'Approved' || detail.status === 'Partially Paid'"
            (click)="showPay=true"
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold">
            💳 Process Payment
          </button>
        </div>
        <!-- Reject form -->
        <div *ngIf="showReject" class="mt-4 bg-white rounded-lg border p-4">
          <label class="text-sm font-semibold text-gray-700 block mb-2">Rejection Reason</label>
          <textarea [(ngModel)]="rejectReason" rows="2" class="w-full text-sm border rounded px-3 py-2" placeholder="Enter reason..."></textarea>
          <div class="flex gap-2 mt-2">
            <button (click)="reject(detail.id)" class="px-3 py-1 bg-red-600 text-white text-sm rounded">Confirm Reject</button>
            <button (click)="showReject=false" class="px-3 py-1 bg-gray-200 text-sm rounded">Cancel</button>
          </div>
        </div>
        <!-- Pay form -->
        <div *ngIf="showPay" class="mt-4 bg-white rounded-lg border p-4">
          <label class="text-sm font-semibold text-gray-700 block mb-2">Payment Amount (Outstanding: ₹{{formatMillions(detail.outstanding_balance)}})</label>
          <input [(ngModel)]="payAmount" type="number" [max]="detail.outstanding_balance" class="w-full text-sm border rounded px-3 py-2 mb-2" placeholder="Amount">
          <input [(ngModel)]="payMethod" class="w-full text-sm border rounded px-3 py-2 mb-2" placeholder="Payment Method (e.g. Bank Transfer, NEFT)">
          <input [(ngModel)]="payRef" class="w-full text-sm border rounded px-3 py-2 mb-2" placeholder="Reference / UTR Number">
          <div class="flex gap-2">
            <button (click)="pay(detail.id)" class="px-3 py-1 bg-blue-600 text-white text-sm rounded">Record Payment</button>
            <button (click)="showPay=false" class="px-3 py-1 bg-gray-200 text-sm rounded">Cancel</button>
          </div>
        </div>
        <!-- Rejection reason shown -->
        <div *ngIf="detail.rejection_reason" class="mt-2 text-sm text-red-600">
          <strong>Rejection Reason:</strong> {{detail.rejection_reason}}
        </div>
        <!-- Payment history -->
        <div *ngIf="detail.payments?.length" class="mt-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">Payment History</h4>
          <div *ngFor="let p of detail.payments" class="flex justify-between text-xs text-gray-600 py-1 border-b">
            <span>{{p.payment_date | date:'MMM d, yyyy'}}</span>
            <span>{{p.payment_method || '-'}}</span>
            <span class="font-semibold text-emerald-700">₹{{formatMillions(p.amount)}}</span>
            <span class="text-gray-400">{{p.payment_reference || '-'}}</span>
          </div>
        </div>
        <button (click)="selectedId=null; detail=null" class="mt-4 text-xs text-blue-600 hover:underline">← Back to list</button>
      </div>

      <!-- Invoice List -->
      <div *ngIf="!loading && !selectedId" class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table class="w-full text-sm text-left">
          <thead class="text-gray-400 uppercase text-xs border-b bg-gray-50">
            <tr>
              <th class="px-4 py-3">Invoice No.</th>
              <th class="px-4 py-3">Vendor</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Tax</th>
              <th class="px-4 py-3">Outstanding</th>
              <th class="px-4 py-3">Due Date</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let inv of invoices" class="hover:bg-gray-50 cursor-pointer">
              <td class="px-4 py-3 font-bold text-blue-700 hover:underline" (click)="openDetail(inv.id)">{{inv.invoice_number}}</td>
              <td class="px-4 py-3 text-gray-700 max-w-[120px] truncate">{{inv.vendor || '-'}}</td>
              <td class="px-4 py-3">₹{{formatMillions(inv.amount)}}</td>
              <td class="px-4 py-3 text-gray-500">₹{{formatMillions(inv.tax_amount)}}</td>
              <td class="px-4 py-3 font-semibold" [ngClass]="inv.outstanding_balance > 0 ? 'text-red-600' : 'text-emerald-600'">
                ₹{{formatMillions(inv.outstanding_balance)}}
              </td>
              <td class="px-4 py-3 text-gray-500">{{inv.due_date | date:'MMM d, y'}}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full" [ngClass]="statusClass(inv.effective_status)">
                  {{inv.effective_status}}
                </span>
              </td>
              <td class="px-4 py-3">
                <button (click)="openDetail(inv.id)" class="text-xs text-blue-600 hover:underline">View</button>
              </td>
            </tr>
            <tr *ngIf="!invoices?.length">
              <td colspan="8" class="px-4 py-8 text-center text-gray-500">No invoices found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Action feedback -->
      <div *ngIf="feedback" class="mt-4 bg-emerald-50 border border-emerald-200 p-3 rounded text-sm text-emerald-700">{{feedback}}</div>
    </div>
  `
})
export class FinanceInvoicesComponent implements OnInit {
    invoices: any[] = [];
    loading = true;
    error = '';
    feedback = '';
    statusFilter = '';
    overdueOnly = false;
    selectedId: number | null = null;
    detail: any = null;
    showReject = false;
    showPay = false;
    rejectReason = '';
    payAmount: number | null = null;
    payMethod = '';
    payRef = '';

    constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) { }

    ngOnInit() {
        this.route.paramMap.subscribe(p => {
            const id = p.get('id');
            if (id) { this.selectedId = +id; this.openDetail(+id); }
        });
        this.load();
    }

    load() {
        this.loading = true;
        const params: any = {};
        if (this.statusFilter) params['status_filter'] = this.statusFilter;
        if (this.overdueOnly) params['overdue_only'] = true;
        this.http.get<any[]>('http://localhost:8000/finance/invoices', { params }).subscribe({
            next: d => { this.invoices = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load invoices.'; this.loading = false; }
        });
    }

    openDetail(id: number) {
        this.selectedId = id;
        this.detail = null;
        this.http.get<any>(`http://localhost:8000/finance/invoices/${id}`).subscribe({
            next: d => { this.detail = d; },
            error: e => { this.error = e.error?.detail || 'Failed to load invoice detail.'; }
        });
    }

    approve(id: number) {
        this.http.patch<any>(`http://localhost:8000/finance/invoices/${id}/approve`, {}).subscribe({
            next: r => { this.feedback = r.message; this.openDetail(id); this.load(); },
            error: e => { this.error = e.error?.detail || 'Failed to approve.'; }
        });
    }

    reject(id: number) {
        if (!this.rejectReason.trim()) { this.error = 'Rejection reason is required.'; return; }
        this.http.patch<any>(`http://localhost:8000/finance/invoices/${id}/reject`, { reason: this.rejectReason }).subscribe({
            next: r => { this.feedback = r.message; this.showReject = false; this.openDetail(id); this.load(); },
            error: e => { this.error = e.error?.detail || 'Failed to reject.'; }
        });
    }

    pay(id: number) {
        if (!this.payAmount || this.payAmount <= 0) { this.error = 'Enter a valid payment amount.'; return; }
        const body = { amount: this.payAmount, payment_method: this.payMethod || null, payment_reference: this.payRef || null };
        this.http.post<any>(`http://localhost:8000/finance/invoices/${id}/pay`, body).subscribe({
            next: r => { this.feedback = r.message + ` Outstanding: ₹${this.formatMillions(r.outstanding_balance)}`; this.showPay = false; this.openDetail(id); this.load(); },
            error: e => { this.error = e.error?.detail || 'Failed to process payment.'; }
        });
    }

    statusClass(s: string): any {
        return {
            'bg-emerald-100 text-emerald-700': s === 'Paid',
            'bg-amber-100 text-amber-700': s === 'Pending' || s === 'Under Review' || s === 'Approved',
            'bg-red-100 text-red-700': s === 'Overdue' || s === 'Rejected',
            'bg-blue-100 text-blue-700': s === 'Partially Paid',
        };
    }

        formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }
}
