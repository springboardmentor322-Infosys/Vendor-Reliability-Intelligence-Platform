import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
    selector: 'app-finance-budget',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Spend Run Rate</h2>
        <p class="text-sm text-gray-500 mt-1 bg-amber-50 border border-amber-100 rounded px-3 py-1 inline-block">
          ⚠️ This page shows <strong>Spend Run Rate</strong> (Realized ÷ Committed × 100).
          No budget table exists in this system — no invented budget values are displayed.
        </p>
      </div>

      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading spend run rate...</div>

      <div *ngIf="!loading && data">
        <!-- Overall -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <div class="text-xs font-semibold text-gray-500 mb-1">Total Committed</div>
            <div class="text-2xl font-bold text-blue-700">₹{{formatMillions(data.total_committed)}}</div>
          </div>
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <div class="text-xs font-semibold text-gray-500 mb-1">Total Realized</div>
            <div class="text-2xl font-bold text-emerald-600">₹{{formatMillions(data.total_realized)}}</div>
          </div>
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <div class="text-xs font-semibold text-gray-500 mb-1">Overall Run Rate</div>
            <div class="text-2xl font-bold text-amber-600">{{data.overall_run_rate_pct}}%</div>
          </div>
        </div>

        <!-- By Category Table -->
        <div class="bg-white rounded-xl border shadow-sm p-6">
          <h3 class="font-bold text-gray-800 mb-4">Run Rate by Category</h3>
          <table class="w-full text-sm text-left">
            <thead class="text-gray-400 uppercase text-xs border-b">
              <tr>
                <th class="py-3 pr-4">Category</th>
                <th class="py-3 pr-4">Committed</th>
                <th class="py-3 pr-4">Realized</th>
                <th class="py-3 pr-4">Outstanding</th>
                <th class="py-3">Run Rate %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr *ngFor="let r of data.by_category" class="hover:bg-gray-50">
                <td class="py-3 pr-4 font-medium text-gray-800">{{r.category}}</td>
                <td class="py-3 pr-4 text-gray-700">₹{{formatMillions(r.committed)}}</td>
                <td class="py-3 pr-4 text-emerald-700">₹{{formatMillions(r.realized)}}</td>
                <td class="py-3 pr-4 text-gray-600">₹{{formatMillions(r.outstanding)}}</td>
                <td class="py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-2 bg-amber-400 rounded-full" [style.width]="r.run_rate_pct + '%'"></div>
                    </div>
                    <span class="text-xs font-semibold text-amber-600 w-10 text-right">{{r.run_rate_pct}}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">{{error}}</div>
    </div>
  `
})
export class FinanceBudgetComponent implements OnInit {
    data: any;
    loading = true;
    error = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any>('http://localhost:8000/finance/budget').subscribe({
            next: d => { this.data = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load spend run rate.'; this.loading = false; }
        });
    }

    formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }
}
