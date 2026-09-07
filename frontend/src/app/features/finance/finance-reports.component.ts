import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-finance-reports',
    standalone: true,
    imports: [CommonModule],
    providers: [DatePipe],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Financial Reports</h2>
        <p class="text-sm text-gray-500">Finance-scoped reports: spend, invoices, payments, vendors, and outstanding balances.</p>
      </div>

      <!-- Report type selection -->
      <div class="flex gap-3 mb-6 flex-wrap">
        <button *ngFor="let r of reportTypes"
          (click)="selectedReport = r.key; loadReport()"
          class="px-4 py-2 text-sm font-semibold rounded-lg border transition"
          [ngClass]="selectedReport === r.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'">
          {{r.label}}
        </button>
      </div>

      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading report...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>

      <!-- Invoices Report -->
      <div *ngIf="selectedReport === 'invoices' && !loading">
        <div class="bg-white rounded-xl border shadow-sm overflow-x-auto">
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
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let inv of reportData">
                <td class="px-4 py-3 font-bold text-gray-800">{{inv.invoice_number}}</td>
                <td class="px-4 py-3 text-gray-600">{{inv.vendor || '-'}}</td>
                <td class="px-4 py-3">₹{{formatMillions(inv.amount)}}</td>
                <td class="px-4 py-3 text-gray-500">₹{{formatMillions(inv.tax_amount)}}</td>
                <td class="px-4 py-3 font-semibold" [ngClass]="inv.outstanding_balance > 0 ? 'text-red-600' : 'text-emerald-600'">
                  ₹{{formatMillions(inv.outstanding_balance)}}
                </td>
                <td class="px-4 py-3 text-gray-500">{{inv.due_date | date:'MMM d, y'}}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 text-xs rounded-full font-semibold"
                    [ngClass]="statusClass(inv.effective_status)">{{inv.effective_status}}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payments Report -->
      <div *ngIf="selectedReport === 'payments' && !loading">
        <div class="bg-white rounded-xl border shadow-sm overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-gray-400 uppercase text-xs border-b bg-gray-50">
              <tr>
                <th class="px-4 py-3">Invoice No.</th>
                <th class="px-4 py-3">Vendor</th>
                <th class="px-4 py-3">Amount Paid</th>
                <th class="px-4 py-3">Date</th>
                <th class="px-4 py-3">Method</th>
                <th class="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let p of reportData">
                <td class="px-4 py-3 font-bold text-gray-800">{{p.invoice_number}}</td>
                <td class="px-4 py-3 text-gray-600">{{p.vendor || '-'}}</td>
                <td class="px-4 py-3 text-emerald-700 font-semibold">₹{{formatMillions(p.amount)}}</td>
                <td class="px-4 py-3 text-gray-500">{{p.payment_date | date:'MMM d, y'}}</td>
                <td class="px-4 py-3 text-gray-600">{{p.payment_method || '-'}}</td>
                <td class="px-4 py-3 text-gray-500">{{p.payment_reference || '-'}}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Vendors Report -->
      <div *ngIf="selectedReport === 'vendors' && !loading">
        <div class="bg-white rounded-xl border shadow-sm overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-gray-400 uppercase text-xs border-b bg-gray-50">
              <tr>
                <th class="px-4 py-3">Vendor</th>
                <th class="px-4 py-3">Category</th>
                <th class="px-4 py-3">Committed</th>
                <th class="px-4 py-3">Realized</th>
                <th class="px-4 py-3">Invoiced</th>
                <th class="px-4 py-3">Paid</th>
                <th class="px-4 py-3">Overdue</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let v of reportData">
                <td class="px-4 py-3 font-semibold text-gray-800">{{v.name}}</td>
                <td class="px-4 py-3 text-gray-500">{{v.category || '-'}}</td>
                <td class="px-4 py-3 text-blue-700">₹{{formatMillions(v.committed_spend)}}</td>
                <td class="px-4 py-3 text-gray-700">₹{{formatMillions(v.realized_spend)}}</td>
                <td class="px-4 py-3 text-indigo-700">₹{{formatMillions(v.invoiced_amount)}}</td>
                <td class="px-4 py-3 text-emerald-700">₹{{formatMillions(v.paid_amount)}}</td>
                <td class="px-4 py-3 text-red-600">₹{{formatMillions(v.overdue_amount)}}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="!reportData?.length && !loading && !error" class="text-center text-gray-500 py-16">No data available for this report.</div>
    </div>
  `
})
export class FinanceReportsComponent implements OnInit {
    selectedReport = 'invoices';
    reportData: any[] = [];
    loading = true;
    error = '';

    reportTypes = [
        { key: 'invoices', label: 'Invoice Report' },
        { key: 'payments', label: 'Payment Report' },
        { key: 'vendors', label: 'Vendor Financial Report' },
    ];

    constructor(private http: HttpClient) { }

    ngOnInit() { this.loadReport(); }

    loadReport() {
        this.loading = true;
        this.error = '';
        this.reportData = [];
        const urlMap: Record<string, string> = {
            'invoices': 'http://localhost:8000/finance/invoices?limit=200',
            'payments': 'http://localhost:8000/finance/payments?limit=200',
            'vendors': 'http://localhost:8000/finance/vendors',
        };
        this.http.get<any[]>(urlMap[this.selectedReport]).subscribe({
            next: d => { this.reportData = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load report.'; this.loading = false; }
        });
    }

    statusClass(s: string) {
        return {
            'bg-emerald-100 text-emerald-700': s === 'Paid',
            'bg-amber-100 text-amber-700': ['Pending', 'Under Review', 'Approved'].includes(s),
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
