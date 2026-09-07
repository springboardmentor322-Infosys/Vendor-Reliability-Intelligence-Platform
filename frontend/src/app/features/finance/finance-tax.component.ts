import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-finance-tax',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Tax & Compliance</h2>
      <div class="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
        ⚠️ {{data?.note || 'Tax amounts reflect actual invoice.tax_amount values. No GST IDs or fabricated compliance data.'}}
      </div>

      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading tax summary...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>

      <div *ngIf="!loading && data">
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <div class="text-xs font-semibold text-gray-500 mb-1">Total Tax Amount</div>
            <div class="text-2xl font-bold text-indigo-700">₹{{formatMillions(data.total_tax_amount)}}</div>
          </div>
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <div class="text-xs font-semibold text-gray-500 mb-1">Invoices with Tax Data</div>
            <div class="text-2xl font-bold text-gray-800">{{data.invoice_count_with_tax}}</div>
          </div>
        </div>

        <div *ngIf="!data.invoice_count_with_tax" class="bg-white rounded-xl border shadow-sm p-8 text-center text-gray-500">
          <div class="text-4xl mb-3">📋</div>
          <p class="text-sm">No invoices with non-zero tax amounts found.</p>
          <p class="text-xs text-gray-400 mt-1">Existing invoices were migrated with tax_amount = 0. Tax data will appear here once invoices with non-zero tax values are created.</p>
        </div>

        <div *ngIf="data.invoice_count_with_tax" class="grid lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <h3 class="font-bold text-gray-800 mb-3">By Vendor</h3>
            <div *ngFor="let v of data.by_vendor" class="flex justify-between py-2 border-b text-sm">
              <span class="text-gray-700">{{v.vendor}}</span>
              <span class="font-semibold text-indigo-700">₹{{formatMillions(v.tax)}}</span>
            </div>
          </div>
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <h3 class="font-bold text-gray-800 mb-3">By Category</h3>
            <div *ngFor="let c of data.by_category" class="flex justify-between py-2 border-b text-sm">
              <span class="text-gray-700">{{c.category}}</span>
              <span class="font-semibold text-indigo-700">₹{{formatMillions(c.tax)}}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinanceTaxComponent implements OnInit {
    data: any;
    loading = true;
    error = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any>('http://localhost:8000/finance/tax-summary').subscribe({
            next: d => { this.data = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load tax summary.'; this.loading = false; }
        });
    }

        formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }
}
