import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-finance-payments',
    standalone: true,
    imports: [CommonModule, FormsModule],
    providers: [DatePipe],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Payment Tracking</h2>
      <p class="text-sm text-gray-500 mb-6">Full history of all payment transactions recorded against invoices.</p>

      <!-- Filters -->
      <div class="flex gap-3 mb-5 flex-wrap items-center">
        <input [(ngModel)]="methodFilter" (input)="load()"
          class="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-200"
          placeholder="Filter by method...">
        <input [(ngModel)]="dateFrom" (change)="load()" type="date"
          class="text-sm border rounded-lg px-3 py-2 bg-white">
        <input [(ngModel)]="dateTo" (change)="load()" type="date"
          class="text-sm border rounded-lg px-3 py-2 bg-white">
        <button (click)="clearFilters()" class="text-xs text-gray-500 hover:text-blue-600 underline">Clear</button>
      </div>

      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading payment history...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>

      <div class="grid grid-cols-1 gap-4 mb-6" *ngIf="!loading && payments?.length">
        <div class="bg-emerald-50 rounded-xl border border-emerald-100 p-4 flex items-center gap-4">
          <div class="text-2xl">💳</div>
          <div>
            <div class="text-xs font-semibold text-gray-500">Total Payments Shown</div>
            <div class="text-xl font-bold text-emerald-700">₹{{formatMillions(totalShown)}}</div>
          </div>
          <div class="ml-8">
            <div class="text-xs font-semibold text-gray-500">Count</div>
            <div class="text-xl font-bold text-gray-800">{{payments?.length}}</div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && payments?.length" class="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-gray-400 uppercase text-xs border-b bg-gray-50">
            <tr>
              <th class="px-4 py-3">Invoice No.</th>
              <th class="px-4 py-3">Vendor</th>
              <th class="px-4 py-3">Amount Paid</th>
              <th class="px-4 py-3">Date</th>
              <th class="px-4 py-3">Method</th>
              <th class="px-4 py-3">Reference</th>
              <th class="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let p of payments" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-bold text-gray-800">{{p.invoice_number}}</td>
              <td class="px-4 py-3 text-gray-600">{{p.vendor || '-'}}</td>
              <td class="px-4 py-3 text-emerald-700 font-semibold">₹{{formatMillions(p.amount)}}</td>
              <td class="px-4 py-3 text-gray-500">{{p.payment_date | date:'MMM d, y'}}</td>
              <td class="px-4 py-3 text-gray-600">{{p.payment_method || '-'}}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{p.payment_reference || '-'}}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{p.notes || '-'}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="!payments?.length && !loading && !error" class="text-center text-gray-500 py-16">
        <div class="text-4xl mb-3">💳</div>
        <p>No payment records found. Payments will appear here once recorded via Invoice Approvals.</p>
      </div>
    </div>
  `
})
export class FinancePaymentsComponent implements OnInit {
    payments: any[] = [];
    loading = true;
    error = '';
    methodFilter = '';
    dateFrom = '';
    dateTo = '';
    totalShown = 0;

    constructor(private http: HttpClient) { }

    ngOnInit() { this.load(); }

    load() {
        this.loading = true;
        const params: any = { limit: 500 };
        if (this.methodFilter) params['payment_method'] = this.methodFilter;
        if (this.dateFrom) params['date_from'] = this.dateFrom;
        if (this.dateTo) params['date_to'] = this.dateTo;
        this.http.get<any[]>('http://localhost:8000/finance/payments', { params }).subscribe({
            next: d => {
                this.payments = d;
                this.totalShown = d.reduce((s, p) => s + (p.amount || 0), 0);
                this.loading = false;
            },
            error: e => { this.error = e.error?.detail || 'Failed to load payments.'; this.loading = false; }
        });
    }

    clearFilters() { this.methodFilter = ''; this.dateFrom = ''; this.dateTo = ''; this.load(); }

        formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }
}
