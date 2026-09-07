import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pm-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <!-- Top Header -->
    <div class="flex justify-between items-center pb-6 border-b border-gray-200">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Welcome back, Procurement Manager! 👋</h1>
        <p class="text-sm text-gray-500 mt-1">Here's what's happening with your procurement operations today.</p>
      </div>
    </div>
    
    <!-- 6 KPI CARDS -->
    <div *ngIf="analyticsData" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 my-6">
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">🛒</span>
          <span>Total PO's</span>
        </div>
        <div class="text-3xl font-extrabold text-gray-800">{{analyticsData.stats.total_pos.value}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">📄</span>
          <span>Active PO's</span>
        </div>
        <div class="text-3xl font-extrabold text-gray-800">{{analyticsData.stats.active_pos.value}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">🚚</span>
          <span>Orders in Transit</span>
        </div>
        <div class="text-3xl font-extrabold text-gray-800">{{analyticsData.stats.orders_in_transit.value}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">₹</span>
          <span>Total Spend (YTD)</span>
        </div>
        <div class="text-2xl font-extrabold text-gray-800">{{analyticsData.stats.total_spend.value}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-red-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600">❗</span>
          <span>Delayed Deliveries</span>
        </div>
        <div class="text-3xl font-extrabold text-red-600">{{analyticsData.stats.delayed.value}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">🛡️</span>
          <span>Avg. Reliability Score</span>
        </div>
        <div class="text-3xl font-extrabold text-teal-600">{{analyticsData.stats.avg_reliability.value}}</div>
      </div>
    </div>

    <!-- FIRST ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6" *ngIf="overviewChart && spendChart && vendorChart">
      <!-- Procurement Overview -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Procurement Overview</h3>
          <span class="text-xs text-gray-400 border px-2 py-1 rounded">This Month ⌄</span>
        </div>
        <div class="flex-1 flex justify-center items-center h-48">
          <apx-chart
            [series]="overviewChart.series"
            [chart]="overviewChart.chart"
            [labels]="overviewChart.labels"
            [colors]="overviewChart.colors"
            [plotOptions]="overviewChart.plotOptions"
            [dataLabels]="{enabled:false}"
            [legend]="overviewChart.legend">
          </apx-chart>
        </div>
        <div class="mt-4 text-center border-t pt-3">
          <a class="text-xs font-semibold text-blue-600 hover:underline cursor-pointer" (click)="navTo('/pos')">View All Purchase Orders →</a>
        </div>
      </div>
      
      <!-- Spend Analysis (YTD) -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Spend Analysis (YTD)</h3>
          <span class="text-xs text-gray-400 border px-2 py-1 rounded">This Year ⌄</span>
        </div>
        <div class="flex-1 h-48">
          <apx-chart
            [series]="spendChart.series"
            [chart]="spendChart.chart"
            [xaxis]="spendChart.xaxis"
            [colors]="spendChart.colors"
            [dataLabels]="{enabled:false}"
            [stroke]="spendChart.stroke">
          </apx-chart>
        </div>
        <div class="mt-4 text-xs font-medium text-emerald-600 border-t pt-3 text-center cursor-pointer" (click)="navTo('/spend-analysis')">
           ↑ Track detailed spending in Budget & Spend Analysis →
        </div>
      </div>

      <!-- Top Vendor Performance -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Top Vendor Performance</h3>
          <span class="text-xs text-gray-400 border px-2 py-1 rounded">This Month ⌄</span>
        </div>
        <div class="space-y-4 flex-1">
          <div class="grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b">
            <div class="col-span-5">Vendor</div>
            <div class="col-span-4 text-center">Reliability Score</div>
            <div class="col-span-3 text-right">On-Time Delivery</div>
          </div>
          <div *ngFor="let vendor of analyticsData?.top_vendors" class="grid grid-cols-12 text-sm items-center">
            <div class="col-span-5 font-medium text-gray-800 truncate pr-2">{{vendor.name}}</div>
            <div class="col-span-4 flex items-center">
              <div class="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                <div class="bg-emerald-500 h-1.5 rounded-full" [style.width.%]="vendor.score"></div>
              </div>
              <span class="text-xs font-semibold w-8">{{vendor.score}}/100</span>
            </div>
            <div class="col-span-3 text-right font-medium text-gray-600">{{vendor.delivery || 0}}%</div>
          </div>
          <div *ngIf="!analyticsData?.top_vendors?.length" class="text-center text-sm text-gray-500 py-4">No vendor data found.</div>
        </div>
        <div class="mt-4 text-center border-t pt-3">
          <a class="text-xs font-semibold text-blue-600 hover:underline cursor-pointer" (click)="navTo('/vendors')">View All Vendors →</a>
        </div>
      </div>
    </div>

    <!-- SECOND ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
      <!-- Recent Purchase Orders -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Recent Purchase Orders</h3>
          <a class="text-sm text-blue-600 hover:underline cursor-pointer" (click)="navTo('/pos')">View All</a>
        </div>
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead class="bg-white text-gray-400 uppercase font-semibold">
              <tr>
                <th class="px-5 py-3">PO Number</th>
                <th class="px-5 py-3">Vendor</th>
                <th class="px-5 py-3">Order Date</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let po of analyticsData?.recent_orders" class="hover:bg-gray-50 cursor-pointer" (click)="navTo('/pos/'+po.po_number)">
                <td class="px-5 py-4 font-bold text-gray-700">{{po.po_number}}</td>
                <td class="px-5 py-4 text-gray-600">{{po.vendor}}</td>
                <td class="px-5 py-4 text-gray-600">{{po.date | date:'MMM d, yyyy'}}</td>
                <td class="px-5 py-4">
                  <span class="px-2 py-1 text-[10px] font-semibold rounded-lg"
                        [ngClass]="{
                          'bg-emerald-100 text-emerald-700': po.status === 'Completed' || po.status === 'Delivered',
                          'bg-blue-100 text-blue-700': po.status === 'In Progress' || po.status === 'Ordered',
                          'bg-amber-100 text-amber-700': po.status === 'Pending' || po.status === 'Approved',
                          'bg-red-100 text-red-700': po.status === 'Cancelled'
                        }">
                    {{po.status}}
                  </span>
                </td>
                <td class="px-5 py-4 text-gray-700">{{po.amount | currency}}</td>
              </tr>
              <tr *ngIf="!analyticsData?.recent_orders?.length">
                <td colspan="5" class="p-8 text-center text-gray-500">No recent POs.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PO Status Summary -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col" *ngIf="statusSummaryChart">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">PO Status Summary</h3>
        </div>
        <div class="flex-1 flex justify-center items-center h-48">
            <apx-chart
              [series]="statusSummaryChart.series"
              [chart]="statusSummaryChart.chart"
              [labels]="statusSummaryChart.labels"
              [colors]="statusSummaryChart.colors"
              [plotOptions]="statusSummaryChart.plotOptions"
              [legend]="statusSummaryChart.legend"
              [dataLabels]="{enabled:false}">
            </apx-chart>
        </div>
      </div>

      <!-- Upcoming Deliveries -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Upcoming Deliveries</h3>
          <a class="text-sm text-blue-600 hover:underline cursor-pointer" (click)="navTo('/delivery')">View All</a>
        </div>
        <div class="flex-1 p-5 space-y-4">
           <div *ngFor="let item of analyticsData?.upcoming_deliveries" class="flex justify-between items-center border-b pb-3 last:border-0 hover:bg-slate-50 cursor-pointer">
              <div class="flex items-center space-x-3">
                 <div class="w-8 h-8 rounded bg-blue-50 text-blue-500 flex justify-center items-center">🚚</div>
                 <div>
                    <div class="text-sm font-bold text-gray-800">{{item.po_number}}</div>
                    <div class="text-xs text-gray-500">{{item.vendor}}</div>
                 </div>
              </div>
              <div class="text-right">
                 <div class="text-xs text-gray-600">{{item.expected_delivery | date:'MMM d, yyyy'}}</div>
                 <div class="text-xs font-semibold text-emerald-600" [class.text-red-600]="item.relative_status === 'Today/Delayed'">{{item.relative_status}}</div>
              </div>
           </div>
           <div *ngIf="!analyticsData?.upcoming_deliveries?.length" class="text-center text-sm text-gray-500">No upcoming deliveries.</div>
        </div>
      </div>
    </div>

    <!-- THIRD ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
      <!-- Budget vs Actual Spend -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Budget vs Actual Spend</h3>
          <span class="text-xs text-gray-400 border px-2 py-1 rounded">This Year ⌄</span>
        </div>
        <div class="flex-1 flex" *ngIf="analyticsData?.budget as bud">
           <!-- Budget Details -->
           <div class="w-1/2 flex flex-col justify-center space-y-4">
              <div>
                 <div class="text-xs text-gray-500">Total Projection</div>
                 <div class="font-bold text-gray-800">{{bud.total_budget | currency:'INR'}}</div>
              </div>
              <div>
                 <div class="text-xs text-gray-500">Actual Spend</div>
                 <div class="font-bold text-gray-800">{{bud.actual_spend | currency:'INR'}}</div>
              </div>
              <div>
                 <div class="text-xs text-gray-500">Remaining</div>
                 <div class="font-bold text-gray-800">{{bud.remaining | currency:'INR'}}</div>
                 <div class="text-xs text-gray-400">({{100 - bud.utilization_pct}}%)</div>
              </div>
           </div>
           <!-- Gauge Chart Proxy -->
           <div class="w-1/2 flex flex-col justify-center items-center relative">
              <svg width="140" height="90" viewBox="0 0 170 105">
                <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="#EEF1F2" stroke-width="20"/>
                <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="#6366f1" stroke-width="20" stroke-linecap="round" [attr.stroke-dasharray]="(bud.utilization_pct / 100) * 220 + ' 220'"/>
              </svg>
              <div class="absolute bottom-6 flex flex-col items-center">
                 <span class="text-xl font-bold">{{bud.utilization_pct}}%</span>
                 <span class="text-xs text-gray-500">Spend Utilized</span>
              </div>
           </div>
        </div>
      </div>
      
      <!-- Contract Expiry Alerts -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Contract Expiry Alerts</h3>
          <a class="text-sm text-blue-600 hover:underline cursor-pointer" (click)="navTo('/contracts')">View All</a>
        </div>
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead class="bg-white text-gray-400 font-semibold border-b">
              <tr>
                <th class="px-5 py-3">Contract</th>
                <th class="px-5 py-3">Vendor</th>
                <th class="px-5 py-3">Expiry Date</th>
                <th class="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of analyticsData?.contract_alerts" class="border-b last:border-0 hover:bg-slate-50 cursor-pointer" (click)="navTo('/contracts')">
                <td class="px-5 py-3 font-medium text-gray-700">{{c.contract}}</td>
                <td class="px-5 py-3 text-gray-600">{{c.vendor}}</td>
                <td class="px-5 py-3 text-gray-600">{{c.expiry_date | date:'MMM d, yyyy'}}</td>
                <td class="px-5 py-3">
                   <span class="text-orange-500 font-semibold" [class.text-red-600]="c.status === 'Expired'">{{c.status}}</span>
                </td>
              </tr>
              <tr *ngIf="!analyticsData?.contract_alerts?.length"><td colspan="4" class="p-5 text-center text-gray-500">No approaching contract expiries.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Recent Notifications -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Recent Notifications</h3>
          <a class="text-sm text-blue-600 hover:underline cursor-pointer" (click)="navTo('/notifications')">View All</a>
        </div>
        <div class="flex-1 p-5 space-y-4">
           <div *ngFor="let notif of analyticsData?.recent_notifications" class="flex items-start space-x-3 cursor-pointer" (click)="navTo('/notifications')">
              <span class="text-xl" [ngClass]="{'text-red-500': notif.type === 'alert', 'text-emerald-500': notif.type !== 'alert'}">
                {{notif.type === 'alert' ? '⚠️' : '✅'}}
              </span>
              <div>
                 <p class="text-sm text-gray-700 font-medium">{{notif.message}}</p>
                 <p class="text-xs text-gray-400 mt-1">{{notif.time}}</p>
              </div>
           </div>
           <div *ngIf="!analyticsData?.recent_notifications?.length" class="text-center text-sm text-gray-500">No recent notifications.</div>
        </div>
      </div>
    </div>
    
    <!-- BOTTOM INSIGHT STRIP -->
    <div class="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-center space-x-2 text-sm text-blue-800 font-medium shadow-sm mb-6">
       <span>💡</span>
       <span>Procurement Insight: You have {{analyticsData?.procurement_overview?.pending || 0}} purchase orders currently awaiting action.</span>
    </div>
  `
})
export class PmDashboardComponent implements OnInit, OnChanges {
  @Input() data: any;
  analyticsData: any;

  overviewChart: any;
  spendChart: any;
  vendorChart: any = true; // Flag for layout rendering
  statusSummaryChart: any;

  constructor(private router: Router) { }

  ngOnInit() {
    this.initCharts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data?.analytics) {
      this.analyticsData = this.data.analytics;
      this.initCharts();
    }
  }

  navTo(route: string) {
    this.router.navigate([route]);
  }

  initCharts() {
    if (!this.analyticsData) return;

    const ov = this.analyticsData.procurement_overview || {};
    const ovSeries = [ov.completed || 0, ov.ordered || 0, ov.delivered || 0, ov.pending || 0, ov.cancelled || 0];
    const ovTotal = ovSeries.reduce((a, b) => a + b, 0);
    const labels = ['Completed', 'In Progress', 'Delivered', 'Pending Approval', 'Cancelled'];
    const colors = ['#3b82f6', '#10b981', '#059669', '#f59e0b', '#ef4444'];

    this.overviewChart = {
      series: ovSeries,
      labels: labels,
      chart: { type: 'donut', height: 200, sparkline: { enabled: true } },
      colors: colors,
      legend: {
        show: true, position: 'right', fontSize: '11px', formatter: function (val: any, opts: any) {
          const count = opts.w.globals.seriesTotals[opts.seriesIndex];
          const pct = Math.round((count / ovTotal) * 100) || 0;
          return val + " - " + count + " (" + pct + "%)";
        }
      },
      plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: "Total PO's", formatter: () => ovTotal } } } } }
    };

    // Deep copy for the second donut to ensure rendering independent
    this.statusSummaryChart = JSON.parse(JSON.stringify(this.overviewChart));

    const monthly = this.analyticsData.monthly_spend || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.spendChart = {
      series: [{ name: "Spend", data: monthly }],
      chart: { type: "area", height: 200, toolbar: { show: false }, sparkline: { enabled: true } },
      stroke: { curve: "smooth", width: 2 },
      colors: ["#6366f1"],
      xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }
    };
  }
}
