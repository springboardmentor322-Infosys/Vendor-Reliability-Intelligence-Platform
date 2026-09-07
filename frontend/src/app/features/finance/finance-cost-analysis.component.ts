import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
    selector: 'app-finance-cost-analysis',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Cost Analysis</h2>
      <p class="text-sm text-gray-500 mb-6">Total cost, average order value, and spend concentration by category (Delivered/Completed POs only).</p>
      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading cost analysis...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>
      <div *ngIf="!loading && data">
        <div class="grid grid-cols-1 gap-4 mb-6">
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <div class="text-xs font-semibold text-gray-500 mb-1">Total Realized Cost</div>
            <div class="text-3xl font-extrabold text-blue-700">₹{{formatMillions(data.total_cost)}}</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border shadow-sm overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-gray-400 uppercase text-xs border-b bg-gray-50">
              <tr>
                <th class="px-4 py-3">Category</th>
                <th class="px-4 py-3">Total Cost</th>
                <th class="px-4 py-3">PO Count</th>
                <th class="px-4 py-3">Avg Order Value</th>
                <th class="px-4 py-3">% of Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let row of data.by_category" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-800">{{row.category}}</td>
                <td class="px-4 py-3 text-blue-700 font-semibold">₹{{formatMillions(row.total_cost)}}</td>
                <td class="px-4 py-3 text-gray-600">{{row.order_count}}</td>
                <td class="px-4 py-3 text-gray-700">₹{{formatMillions(row.avg_order_value)}}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-2 bg-blue-400 rounded-full" [style.width]="row.pct_of_total + '%'"></div>
                    </div>
                    <span class="text-xs font-semibold text-blue-700 w-10 text-right">{{row.pct_of_total}}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class FinanceCostAnalysisComponent implements OnInit {
    data: any;
    loading = true;
    error = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any>('http://localhost:8000/finance/cost-analysis').subscribe({
            next: d => { this.data = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load cost analysis.'; this.loading = false; }
        });
    }

    formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }
}
