import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Router } from '@angular/router';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  providers: [CurrencyPipe, DatePipe],
  template: `
    <!-- ── HEADER ── -->
    <div class="flex justify-between items-center pb-6 border-b border-gray-200">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Welcome back, Finance Officer! 👋</h1>
        <p class="text-sm text-gray-500 mt-1">Here's your financial summary and performance overview.</p>
      </div>
      <div class="text-right">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Finance Officer</span>
      </div>
    </div>

    <!-- ── 6 KPI CARDS ── -->
    <div *ngIf="d" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 my-6">
      <!-- 1. Total Spend YTD -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">₹</span>
          <span>Total Spend (YTD)</span>
        </div>
        <div class="text-xl font-extrabold text-gray-800">{{d.kpis?.total_spend_ytd | currency:'INR':'symbol':'1.0-0'}}</div>
        <div class="text-xs text-gray-400 mt-1">Realized procurement spend</div>
      </div>
      <!-- 2. Invoiced Amount YTD -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm">📄</span>
          <span>Invoiced (YTD)</span>
        </div>
        <div class="text-xl font-extrabold text-gray-800">{{d.kpis?.invoiced_ytd | currency:'INR':'symbol':'1.0-0'}}</div>
        <div class="text-xs text-gray-400 mt-1">Total invoiced this year</div>
      </div>
      <!-- 3. Total Payments YTD -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">✓</span>
          <span>Total Payments (YTD)</span>
        </div>
        <div class="text-xl font-extrabold text-gray-800">{{d.kpis?.total_payments_ytd | currency:'INR':'symbol':'1.0-0'}}</div>
        <div class="text-xs text-gray-400 mt-1">Payments recorded this year</div>
      </div>
      <!-- 4. Spend Run Rate -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">📊</span>
          <span>Spend Run Rate</span>
        </div>
        <div class="text-xl font-extrabold text-amber-600">{{d.kpis?.spend_run_rate_pct}}%</div>
        <div class="text-xs text-gray-400 mt-1">Realized / Committed spend</div>
      </div>
      <!-- 5. Pending Payments -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold text-red-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm">⏳</span>
          <span>Pending Payments</span>
        </div>
        <div class="text-xl font-extrabold text-red-600">{{d.kpis?.pending_payments | currency:'INR':'symbol':'1.0-0'}}</div>
        <div class="text-xs text-gray-400 mt-1">{{d.kpis?.pending_payments_count}} invoice(s) pending</div>
      </div>
      <!-- 6. Payments This Month -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold text-teal-600 mb-2">
          <span class="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-sm">💳</span>
          <span>Payments (This Month)</span>
        </div>
        <div class="text-xl font-extrabold text-teal-600">{{d.kpis?.payments_this_month | currency:'INR':'symbol':'1.0-0'}}</div>
        <div class="text-xs text-gray-400 mt-1">Payments made this month</div>
      </div>
    </div>

    <!-- ── ROW 1: Spend by Category | Monthly Spend | Spend Run Rate ── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6" *ngIf="d && spendCatChart && monthlySpendChart && runRateChart">
      <!-- Spend by Category -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Spend by Category (YTD)</h3>
        </div>
        <div class="flex-1 flex justify-center items-center h-48">
          <apx-chart
            [series]="spendCatChart.series"
            [chart]="spendCatChart.chart"
            [labels]="spendCatChart.labels"
            [colors]="spendCatChart.colors"
            [plotOptions]="spendCatChart.plotOptions"
            [dataLabels]="{enabled:false}"
            [legend]="spendCatChart.legend">
          </apx-chart>
        </div>
        <div class="mt-3 text-center border-t pt-3">
          <span class="text-xs font-semibold text-blue-600 hover:underline cursor-pointer" (click)="navTo('/finance-spend-analysis')">View Detailed Spend Analysis →</span>
        </div>
      </div>

      <!-- Monthly Spend Trend -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Monthly Spend Trend</h3>
          <span class="text-xs text-gray-400 border px-2 py-1 rounded">This Year</span>
        </div>
        <div class="flex-1 h-48">
          <apx-chart
            [series]="monthlySpendChart.series"
            [chart]="monthlySpendChart.chart"
            [xaxis]="monthlySpendChart.xaxis"
            [colors]="monthlySpendChart.colors"
            [stroke]="monthlySpendChart.stroke"
            [dataLabels]="{enabled:false}">
          </apx-chart>
        </div>
        <div class="mt-3 text-center border-t pt-3">
          <span class="text-xs font-semibold text-emerald-600 cursor-pointer" (click)="navTo('/finance-spend-analysis')">Track detailed spending →</span>
        </div>
      </div>

      <!-- Spend Run Rate (Budget vs Actual proxy) -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Spend Run Rate (by Category)</h3>
          <span class="text-xs text-gray-400 border px-2 py-1 rounded">Not Budget</span>
        </div>
        <div class="flex-1 h-48">
          <apx-chart
            [series]="runRateChart.series"
            [chart]="runRateChart.chart"
            [xaxis]="runRateChart.xaxis"
            [colors]="runRateChart.colors"
            [plotOptions]="runRateChart.plotOptions"
            [dataLabels]="{enabled:false}">
          </apx-chart>
        </div>
        <div class="mt-3 text-center border-t pt-3">
          <span class="text-xs font-semibold text-blue-600 cursor-pointer" (click)="navTo('/finance-budget')">View Run Rate Details →</span>
        </div>
      </div>
    </div>

    <!-- ── ROW 2: Recent Invoices | Payment Summary | Top Vendors ── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6" *ngIf="d && paymentSummaryChart">
      <!-- Recent Invoices -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Recent Invoices</h3>
          <span class="text-sm text-blue-600 cursor-pointer hover:underline" (click)="navTo('/finance-invoices')">View All</span>
        </div>
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead class="text-gray-400 uppercase font-semibold border-b">
              <tr>
                <th class="px-4 py-3">Invoice No.</th>
                <th class="px-4 py-3">Vendor</th>
                <th class="px-4 py-3">Amount</th>
                <th class="px-4 py-3">Due Date</th>
                <th class="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let inv of d?.recent_invoices"
                  class="hover:bg-gray-50 cursor-pointer"
                  (click)="navTo('/finance-invoices/'+inv.id)">
                <td class="px-4 py-3 font-bold text-gray-700">{{inv.invoice_number}}</td>
                <td class="px-4 py-3 text-gray-600 max-w-[80px] truncate">{{inv.vendor || '-'}}</td>
                <td class="px-4 py-3">{{inv.amount | currency:'INR':'symbol':'1.0-0'}}</td>
                <td class="px-4 py-3 text-gray-500">{{inv.due_date | date:'MMM d, yyyy'}}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 text-[10px] font-semibold rounded-lg"
                    [ngClass]="{
                      'bg-emerald-100 text-emerald-700': inv.effective_status==='Paid',
                      'bg-amber-100 text-amber-700': inv.effective_status==='Pending' || inv.effective_status==='Under Review' || inv.effective_status==='Approved',
                      'bg-red-100 text-red-700': inv.effective_status==='Overdue',
                      'bg-blue-100 text-blue-700': inv.effective_status==='Partially Paid',
                      'bg-gray-100 text-gray-600': inv.effective_status==='Rejected'
                    }">{{inv.effective_status}}</span>
                </td>
              </tr>
              <tr *ngIf="!d?.recent_invoices?.length">
                <td colspan="5" class="p-8 text-center text-gray-500">No invoices found.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="p-3 border-t text-center">
          <span class="text-xs font-semibold text-blue-600 cursor-pointer hover:underline" (click)="navTo('/finance-invoices')">View All Invoices →</span>
        </div>
      </div>

      <!-- Payment Summary -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Payment Summary</h3>
        </div>
        <div class="flex-1 flex justify-center items-center h-48">
          <apx-chart
            [series]="paymentSummaryChart.series"
            [chart]="paymentSummaryChart.chart"
            [labels]="paymentSummaryChart.labels"
            [colors]="paymentSummaryChart.colors"
            [plotOptions]="paymentSummaryChart.plotOptions"
            [dataLabels]="{enabled:false}"
            [legend]="paymentSummaryChart.legend">
          </apx-chart>
        </div>
        <div class="mt-3 space-y-1 text-xs border-t pt-3">
          <div class="flex justify-between text-gray-600">
            <span>Paid</span>
            <span class="font-semibold text-emerald-600">{{d?.payment_summary?.paid_amount | currency:'INR':'symbol':'1.0-0'}} ({{d?.payment_summary?.paid_count}})</span>
          </div>
          <div class="flex justify-between text-gray-600">
            <span>Pending</span>
            <span class="font-semibold text-amber-600">{{d?.payment_summary?.pending_amount | currency:'INR':'symbol':'1.0-0'}} ({{d?.payment_summary?.pending_count}})</span>
          </div>
          <div class="flex justify-between text-gray-600">
            <span>Overdue</span>
            <span class="font-semibold text-red-600">{{d?.payment_summary?.overdue_amount | currency:'INR':'symbol':'1.0-0'}} ({{d?.payment_summary?.overdue_count}})</span>
          </div>
        </div>
        <div class="mt-2 text-center">
          <span class="text-xs font-semibold text-blue-600 cursor-pointer hover:underline" (click)="navTo('/finance-payments')">View Payment Tracking →</span>
        </div>
      </div>

      <!-- Top Vendors by Spend -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Top Vendors by Spend (YTD)</h3>
          <span class="text-sm text-blue-600 cursor-pointer hover:underline" (click)="navTo('/finance-vendors')">View All</span>
        </div>
        <div class="space-y-3 flex-1">
          <div class="grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b">
            <div class="col-span-5">Vendor</div>
            <div class="col-span-4 text-center">Spend Amount</div>
            <div class="col-span-3 text-right">% of Total</div>
          </div>
          <div *ngFor="let v of d?.top_vendors" class="grid grid-cols-12 text-sm items-center py-1">
            <div class="col-span-5 font-medium text-gray-800 truncate pr-2">{{v.vendor}}</div>
            <div class="col-span-4 text-xs font-semibold text-gray-700">{{v.spend_amount | currency:'INR':'symbol':'1.0-0'}}</div>
            <div class="col-span-3 text-right text-xs text-gray-500">{{v.pct_of_total}}%</div>
          </div>
          <div *ngIf="!d?.top_vendors?.length" class="text-center text-sm text-gray-500 py-4">No vendor spend data.</div>
        </div>
        <div class="mt-2 text-center border-t pt-3">
          <span class="text-xs font-semibold text-blue-600 cursor-pointer hover:underline" (click)="navTo('/finance-vendors')">View Vendor Spend Report →</span>
        </div>
      </div>
    </div>

    <!-- ── ROW 3: Payment Flow | Financial Alerts | Quick Actions ── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6" *ngIf="d && payFlowChart">
      <!-- Payment Flow Overview -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Payment Flow Overview</h3>
          <span class="text-xs text-gray-400 border px-2 py-1 rounded">This Year</span>
        </div>
        <div class="flex-1 h-48">
          <apx-chart
            [series]="payFlowChart.series"
            [chart]="payFlowChart.chart"
            [xaxis]="payFlowChart.xaxis"
            [colors]="payFlowChart.colors"
            [stroke]="payFlowChart.stroke"
            [dataLabels]="{enabled:false}">
          </apx-chart>
        </div>
        <div class="mt-2 text-xs text-gray-500 border-t pt-2 text-center">
          Payments Made (monthly) · No fabricated Cash Inflow data
        </div>
      </div>

      <!-- Financial Alerts -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Financial Alerts</h3>
          <span class="text-sm text-blue-600 cursor-pointer hover:underline" (click)="navTo('/finance-approvals')">View All</span>
        </div>
        <div class="flex-1 p-4 space-y-3 overflow-y-auto max-h-52">
          <div *ngFor="let alert of d?.alerts"
               class="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
               (click)="navToAlert(alert)">
            <span class="text-lg flex-shrink-0"
              [ngClass]="{
                'text-red-500': alert.severity==='high',
                'text-amber-500': alert.severity==='medium',
                'text-blue-500': alert.severity==='low'
              }">
              {{alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '⚠️' : '🔵'}}
            </span>
            <div>
              <p class="text-sm text-gray-700 font-medium leading-snug">{{alert.message}}</p>
            </div>
          </div>
          <div *ngIf="!d?.alerts?.length" class="text-center text-sm text-gray-500 py-4">No active alerts. All clear!</div>
        </div>
      </div>

      <!-- Quick Actions (Finance Officer RBAC only — no Create PO) -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        <h3 class="font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div class="grid grid-cols-3 gap-3 flex-1">
          <button (click)="navTo('/finance-approvals')"
            class="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition text-emerald-700 text-xs font-semibold">
            <span class="text-xl">✅</span><span>Approve Invoice</span>
          </button>
          <button (click)="navTo('/finance-payments')"
            class="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition text-blue-700 text-xs font-semibold">
            <span class="text-xl">💳</span><span>Payment Tracking</span>
          </button>
          <button (click)="navTo('/finance-vendors')"
            class="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition text-indigo-700 text-xs font-semibold">
            <span class="text-xl">🏢</span><span>Vendor History</span>
          </button>
          <button (click)="navTo('/finance-budget')"
            class="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition text-amber-700 text-xs font-semibold">
            <span class="text-xl">📊</span><span>Spend Run Rate</span>
          </button>
          <button (click)="navTo('/finance-reports')"
            class="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-gray-700 text-xs font-semibold">
            <span class="text-xl">📋</span><span>Financial Reports</span>
          </button>
          <button (click)="navTo('/finance-audit')"
            class="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 transition text-rose-700 text-xs font-semibold">
            <span class="text-xl">🔍</span><span>Audit & Controls</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── FINANCE INSIGHT STRIP ── -->
    <div *ngIf="d?.finance_insight"
         class="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-sm text-emerald-800 font-medium shadow-sm mb-6">
      <span class="text-xl">💡</span>
      <span>Finance Insight: {{d.finance_insight}}</span>
    </div>

    <!-- Loading state -->
    <div *ngIf="!d" class="flex items-center justify-center h-64 text-gray-400">
      <div class="text-center">
        <div class="text-4xl mb-2">⏳</div>
        <p class="text-sm">Loading finance dashboard...</p>
      </div>
    </div>
  `
})
export class FinanceDashboardComponent implements OnInit, OnChanges {
  @Input() data: any;

  /** Normalized dashboard data — Finance endpoint returns directly, not nested under 'analytics' */
  d: any = null;

  spendCatChart: any;
  monthlySpendChart: any;
  runRateChart: any;
  paymentSummaryChart: any;
  payFlowChart: any;

  constructor(private router: Router) { }

  ngOnInit() {
    this.normalize();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.normalize();
    }
  }

  private normalize() {
    if (!this.data) return;
    // Finance dashboard endpoint returns data directly (not wrapped under 'analytics')
    // Handle both raw response and {analytics: ...} wrapped format defensively
    if (this.data?.kpis) {
      this.d = this.data;
    } else if (this.data?.analytics?.kpis) {
      this.d = this.data.analytics;
    } else {
      this.d = this.data;
    }
    this.buildCharts();
  }

  navTo(route: string) {
    this.router.navigate([route]);
  }

  navToAlert(alert: any) {
    if (alert.link_type === 'invoice' && alert.link_id) {
      this.router.navigate(['/finance-invoices', alert.link_id]);
    } else if (alert.link_type === 'approvals') {
      this.router.navigate(['/finance-approvals']);
    } else if (alert.link_type === 'po') {
      this.router.navigate(['/pos']);
    }
  }

  private buildCharts() {
    if (!this.d) return;

    // ─ Spend by Category donut ─────────────────────────────────────────────
    const cats = this.d.spend_by_category || [];
    const catSeries = cats.map((c: any) => c.amount);
    const catLabels = cats.map((c: any) => c.category);
    const catTotal = catSeries.reduce((a: number, b: number) => a + b, 0);

    this.spendCatChart = {
      series: catSeries,
      labels: catLabels,
      chart: { type: 'donut', height: 220, sparkline: { enabled: true } },
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
        show: true, position: 'right', fontSize: '10px',
        formatter: (val: any, opts: any) => {
          const pct = cats[opts.seriesIndex]?.percentage ?? 0;
          return `${val} (${pct}%)`;
        }
      },
      dataLabels: { enabled: false },
    };

    // ─ Monthly Spend area ─────────────────────────────────────────────────
    const monthly = this.d.monthly_spend || [];
    this.monthlySpendChart = {
      series: [{ name: 'Spend', data: monthly.map((m: any) => m.amount) }],
      chart: { type: 'area', height: 200, toolbar: { show: false }, sparkline: { enabled: true } },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#6366f1'],
      xaxis: { categories: monthly.map((m: any) => m.month) },
      dataLabels: { enabled: false },
    };

    // ─ Spend Run Rate bar (Committed vs Realized) ─────────────────────────
    const rr = this.d.spend_run_rate || [];
    this.runRateChart = {
      series: [
        { name: 'Committed', data: rr.map((r: any) => r.committed) },
        { name: 'Realized', data: rr.map((r: any) => r.realized) },
      ],
      chart: { type: 'bar', height: 200, toolbar: { show: false }, sparkline: { enabled: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      colors: ['#c7d2fe', '#6366f1'],
      xaxis: {
        categories: rr.map((r: any) => r.category?.substring(0, 8) || ''),
        labels: { style: { fontSize: '10px' } }
      },
      dataLabels: { enabled: false },
    };

    // ─ Payment Summary donut ──────────────────────────────────────────────
    const ps = this.d.payment_summary || {};
    const paidAmnt = ps.paid_amount || 0;
    const pendingAmnt = ps.pending_amount || 0;
    const overdueAmnt = ps.overdue_amount || 0;
    const psTotal = paidAmnt + pendingAmnt + overdueAmnt;

    this.paymentSummaryChart = {
      series: [paidAmnt, pendingAmnt, overdueAmnt],
      labels: ['Paid', 'Pending', 'Overdue'],
      chart: { type: 'donut', height: 200, sparkline: { enabled: true } },
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Paid',
                formatter: () => '₹' + this.formatMillions(paidAmnt)
              }
            }
          }
        }
      },
      legend: { show: true, position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
    };

    // ─ Payment Flow bar ───────────────────────────────────────────────────
    const pf = this.d.payment_flow || [];
    this.payFlowChart = {
      series: [{ name: 'Payments Made', data: pf.map((p: any) => p.payments_made) }],
      chart: { type: 'bar', height: 200, toolbar: { show: false }, sparkline: { enabled: false } },
      plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
      colors: ['#10b981'],
      stroke: { curve: 'smooth', width: 0 },
      xaxis: { categories: pf.map((p: any) => p.month), labels: { style: { fontSize: '9px' } } },
      dataLabels: { enabled: false },
    };
  }

  private formatMillions(n: number): string {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return n.toFixed(0);
  }
}
