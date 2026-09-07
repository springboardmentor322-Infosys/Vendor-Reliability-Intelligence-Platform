import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-finance-overview',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  providers: [CurrencyPipe],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Financial Overview</h2>
        <p class="text-sm text-gray-500">Comprehensive view of financial performance from purchase orders and invoices.</p>
      </div>

      <div *ngIf="loading" class="flex justify-center items-center h-48 text-gray-400">Loading financial overview...</div>

      <div *ngIf="!loading && data">
        <!-- Summary KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div *ngFor="let k of kpis" class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div class="text-xs font-semibold text-gray-500 mb-1">{{k.label}}</div>
            <div class="text-2xl font-extrabold" [ngClass]="k.color">{{k.value}}</div>
            <div class="text-xs text-gray-400 mt-1">{{k.sub}}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- Spend by Category -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 class="font-bold text-gray-800 mb-4">Spend by Category (YTD)</h3>
              <apx-chart *ngIf="catChart"
                [series]="catChart.series"
                [chart]="catChart.chart"
                [labels]="catChart.labels"
                [colors]="catChart.colors"
                [plotOptions]="catChart.plotOptions"
                [dataLabels]="{enabled:false}"
                [legend]="catChart.legend">
              </apx-chart>
              <p *ngIf="!data.spend_by_category?.length" class="text-sm text-gray-500 text-center py-4">No spend data available.</p>
            </div>
            
            <!-- Monthly Spend Trend -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 class="font-bold text-gray-800 mb-4">Monthly Spend Trend</h3>
              <apx-chart *ngIf="monthlyChart"
                [series]="monthlyChart.series"
                [chart]="monthlyChart.chart"
                [xaxis]="monthlyChart.xaxis"
                [colors]="monthlyChart.colors"
                [stroke]="monthlyChart.stroke"
                [dataLabels]="{enabled:false}">
              </apx-chart>
            </div>
        </div>
      </div>

        <!-- Additional Deep Dive Tables -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Invoice Health -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="p-5 border-b flex justify-between items-center">
                    <h3 class="font-bold text-gray-800">Invoice Health (Recent)</h3>
                    <a routerLink="/finance-invoices" class="text-xs text-blue-600 hover:underline cursor-pointer">View All</a>
                </div>
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr><th class="px-4 py-2">Invoice</th><th class="px-4 py-2 text-right">Amount</th><th class="px-4 py-2 text-center">Status</th></tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr *ngFor="let inv of recentInvoices" class="hover:bg-gray-50">
                            <td class="px-4 py-3 text-gray-800 font-medium">{{inv.invoice_number}}</td>
                            <td class="px-4 py-3 text-right font-semibold">₹{{formatMillions(inv.amount)}}</td>
                            <td class="px-4 py-3 text-center">
                                <span class="px-2 py-1 text-[10px] font-bold rounded-full" [ngClass]="statusClass(inv.effective_status)">{{inv.effective_status}}</span>
                            </td>
                        </tr>
                        <tr *ngIf="!recentInvoices?.length"><td colspan="3" class="text-center py-4 text-gray-400">No invoices.</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Payment Performance -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
                <h3 class="font-bold text-gray-800 mb-6">Payment Performance</h3>
                
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-500">Overdue Invoices Amount</span>
                        <span class="font-bold text-red-600">₹{{formatMillions(data.kpis?.overdue_amount)}}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-500">Pending Approvals Amount</span>
                        <span class="font-bold text-amber-600">₹{{formatMillions(data.kpis?.pending_payments)}}</span>
                    </div>
                    <div class="flex justify-between items-center pt-4 border-t">
                        <span class="text-gray-500 font-medium">Payment Completion Rate</span>
                        <span class="font-bold text-emerald-600 text-xl">{{ data.kpis?.invoiced_ytd ? ((data.kpis.total_payments_ytd / data.kpis.invoiced_ytd) * 100).toFixed(1) : 0 }}%</span>
                    </div>
                    <div class="w-full bg-gray-100 h-2 rounded-full mt-2">
                        <div class="bg-emerald-500 h-2 rounded-full" [style.width]="(data.kpis?.invoiced_ytd ? (data.kpis.total_payments_ytd / data.kpis.invoiced_ytd) * 100 : 0) + '%'"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vendor Financial Summary -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <div class="p-5 border-b flex justify-between items-center">
                <h3 class="font-bold text-gray-800">Vendor Financial Summary</h3>
                <a routerLink="/finance-vendors" class="text-xs text-blue-600 hover:underline cursor-pointer">View Vendors Deep Dive</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th class="px-4 py-3">Vendor</th>
                            <th class="px-4 py-3 text-center">POs</th>
                            <th class="px-4 py-3 text-right">PO Value</th>
                            <th class="px-4 py-3 text-center">Invoices</th>
                            <th class="px-4 py-3 text-right">Invoiced</th>
                            <th class="px-4 py-3 text-right">Paid</th>
                            <th class="px-4 py-3 text-right">Outstanding</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr *ngFor="let v of vendors" class="hover:bg-gray-50">
                            <td class="px-4 py-3 font-semibold text-gray-800">{{v.vendor}}</td>
                            <td class="px-4 py-3 text-center">{{v.po_count}}</td>
                            <td class="px-4 py-3 text-right">₹{{formatMillions(v.po_value)}}</td>
                            <td class="px-4 py-3 text-center">{{v.invoice_count}}</td>
                            <td class="px-4 py-3 text-right text-gray-600">₹{{formatMillions(v.invoiced_amount)}}</td>
                            <td class="px-4 py-3 text-right font-medium text-emerald-600">₹{{formatMillions(v.paid_amount)}}</td>
                            <td class="px-4 py-3 text-right font-semibold text-red-600">₹{{formatMillions(v.outstanding)}}</td>
                        </tr>
                        <tr *ngIf="!vendors.length"><td colspan="7" class="text-center py-6 text-gray-400">Loading vendor summary...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{{error}}</div>
    </div>
  `
})
export class FinanceOverviewComponent implements OnInit {
  data: any = null;
  loading = true;
  error = '';
  kpis: any[] = [];
  catChart: any = null;
  monthlyChart: any = null;
  vendors: any[] = [];
  recentInvoices: any[] = [];

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.http.get<any>('http://localhost:8000/analytics/dashboard/finance').subscribe({
      next: (resp) => {
        this.data = resp;
        this.recentInvoices = resp.recent_invoices || [];
        this.buildKpis();
        this.buildCharts();
        this.loading = false;

        // Parallel call to get vendor summary natively
        this.http.get<any[]>('http://localhost:8000/finance/vendors').subscribe(v => this.vendors = v.slice(0, 5));
      },
      error: (e) => {
        this.error = e.error?.detail || 'Failed to load financial overview.';
        this.loading = false;
      }
    });
  }

  buildKpis() {
    const k = this.data.kpis || {};
    this.kpis = [
      { label: 'Total Spend (YTD)', value: '₹' + this.formatMillions(k.total_spend_ytd), color: 'text-blue-700', sub: 'Realized procurement spend' },
      { label: 'Invoiced (YTD)', value: '₹' + this.formatMillions(k.invoiced_ytd), color: 'text-indigo-700', sub: 'Total invoiced this year' },
      { label: 'Payments (YTD)', value: '₹' + this.formatMillions(k.total_payments_ytd), color: 'text-emerald-700', sub: 'Payments recorded' },
      { label: 'Pending Payments', value: '₹' + this.formatMillions(k.pending_payments), color: 'text-red-600', sub: (k.pending_payments_count || 0) + ' invoice(s) pending' },
    ];
  }

  buildCharts() {
    const cats = this.data.spend_by_category || [];
    const catSeries = cats.map((c: any) => c.amount);
    const catLabels = cats.map((c: any) => c.category);
    const catTotal = catSeries.reduce((a: number, b: number) => a + b, 0);

    this.catChart = {
      series: catSeries,
      labels: catLabels,
      chart: { type: 'donut', height: 320, sparkline: { enabled: true } },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Spend',
                formatter: () => '₹' + this.formatMillions(catTotal)
              }
            }
          }
        }
      },
      legend: {
        show: true, position: 'right', fontSize: '12px',
        formatter: (val: any, opts: any) => {
          const pct = cats[opts.seriesIndex]?.percentage ?? 0;
          return val + " (" + pct + "%)";
        }
      }
    };

    const monthly = this.data.monthly_spend || [];
    this.monthlyChart = {
      series: [{ name: 'Spend', data: monthly.map((m: any) => m.amount) }],
      chart: { type: 'area', height: 320, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#6366f1'],
      xaxis: { categories: monthly.map((m: any) => m.month) }
    };
  }

  formatMillions(n: number): string {
    if (!n) return '0';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return n.toFixed(0);
  }

  statusClass(s: string): any {
    return {
      'bg-emerald-100 text-emerald-700': s === 'Paid' || s === 'Completed',
      'bg-amber-100 text-amber-700': s === 'Pending' || s === 'Under Review' || s === 'Approved',
      'bg-red-100 text-red-700': s === 'Overdue' || s === 'Rejected',
      'bg-blue-100 text-blue-700': s === 'Partially Paid',
    };
  }
}
