import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
    selector: 'app-finance-spend-analysis',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Spend Analysis</h2>
      <p class="text-sm text-gray-500 mb-6">Breakdown of realized procurement spend by category, vendor, and month.</p>
      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading spend analysis...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>
      <div *ngIf="!loading && data">
        <div class="mb-4 bg-white rounded-xl border shadow-sm p-5">
          <div class="text-xs font-semibold text-gray-500 mb-1">Total Realized Spend</div>
          <div class="text-3xl font-extrabold text-blue-700">₹{{formatMillions(data.total_spend)}}</div>
        </div>
        <!-- By Category -->
        <div class="grid lg:grid-cols-2 gap-6 mb-6">
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <h3 class="font-bold text-gray-800 mb-3">By Category</h3>
            <apx-chart *ngIf="catChart"
              [series]="catChart.series" [chart]="catChart.chart"
              [xaxis]="catChart.xaxis" [colors]="catChart.colors"
              [plotOptions]="catChart.plotOptions" [dataLabels]="{enabled:false}">
            </apx-chart>
          </div>
          <!-- Monthly Trend -->
          <div class="bg-white rounded-xl border shadow-sm p-5">
            <h3 class="font-bold text-gray-800 mb-3">Monthly Trend</h3>
            <apx-chart *ngIf="monthlyChart"
              [series]="monthlyChart.series" [chart]="monthlyChart.chart"
              [xaxis]="monthlyChart.xaxis" [colors]="monthlyChart.colors"
              [stroke]="monthlyChart.stroke" [dataLabels]="{enabled:false}">
            </apx-chart>
          </div>
        </div>
        <!-- Top Vendors -->
        <div class="bg-white rounded-xl border shadow-sm p-5">
          <h3 class="font-bold text-gray-800 mb-3">Top 10 Vendors by Spend</h3>
          <div *ngFor="let v of data.by_vendor" class="flex items-center gap-3 py-2 border-b last:border-b-0">
            <div class="w-32 text-xs font-medium text-gray-700 truncate">{{v.vendor}}</div>
            <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-2 bg-indigo-400 rounded-full" [style.width]="v.percentage + '%'"></div>
            </div>
            <div class="text-xs font-semibold text-indigo-700 w-24 text-right">₹{{formatMillions(v.amount)}}</div>
            <div class="text-xs text-gray-400 w-10 text-right">{{v.percentage}}%</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinanceSpendAnalysisComponent implements OnInit {
    data: any;
    loading = true;
    error = '';
    catChart: any;
    monthlyChart: any;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any>('http://localhost:8000/finance/spend-analysis').subscribe({
            next: d => {
                this.data = d;
                const cats = d.by_category || [];
                this.catChart = {
                    series: [{ name: 'Spend', data: cats.map((c: any) => c.amount) }],
                    chart: { type: 'bar', height: 250, toolbar: { show: false } },
                    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
                    colors: ['#6366f1'],
                    xaxis: { categories: cats.map((c: any) => c.category) },
                    dataLabels: { enabled: false },
                };
                const monthly = d.monthly || [];
                this.monthlyChart = {
                    series: [{ name: 'Spend', data: monthly.map((m: any) => m.amount) }],
                    chart: { type: 'area', height: 250, toolbar: { show: false } },
                    stroke: { curve: 'smooth', width: 2 },
                    colors: ['#10b981'],
                    xaxis: { categories: monthly.map((m: any) => m.month) },
                    dataLabels: { enabled: false },
                };
                this.loading = false;
            },
            error: e => { this.error = e.error?.detail || 'Failed to load spend analysis.'; this.loading = false; }
        });
    }

    formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }
}
