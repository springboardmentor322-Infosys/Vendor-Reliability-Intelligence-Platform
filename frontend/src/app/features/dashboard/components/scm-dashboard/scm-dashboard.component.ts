import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Router } from '@angular/router';

@Component({
  selector: 'app-scm-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <!-- Top Header -->
    <div class="flex justify-between items-center pb-6 border-b border-gray-200">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Welcome back, Supply Chain Manager! 👋</h1>
        <p class="text-sm text-gray-500 mt-1">Here is your operational snapshot of global order deliveries and supplier risk.</p>
      </div>
    </div>
    
    <!-- 6 KPI CARDS -->
    <div *ngIf="analyticsData" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 my-6">
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">🛒</span>
          <span>Total Purchase Orders</span>
        </div>
        <div class="text-3xl font-extrabold text-gray-800">{{analyticsData.stats?.total_pos || 0}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">📦</span>
          <span>Active / In-Movement Orders</span>
        </div>
        <div class="text-3xl font-extrabold text-gray-800">{{analyticsData.stats?.active_in_movement || 0}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">🚚</span>
          <span>Orders in Transit</span>
        </div>
        <div class="text-3xl font-extrabold text-gray-800">{{analyticsData.stats?.orders_in_transit || 0}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">⏱️</span>
          <span>On-Time Delivery %</span>
        </div>
        <div class="text-3xl font-extrabold text-teal-600">{{analyticsData.stats?.on_time_delivery_pct || 0}}%</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-red-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600">❗</span>
          <span>Delayed Deliveries</span>
        </div>
        <div class="text-3xl font-extrabold text-red-600">{{analyticsData.stats?.delayed_deliveries || 0}}</div>
      </div>
      <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
        <div class="flex items-center space-x-2 text-sm font-semibold text-gray-500 mb-2">
          <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">🛡️</span>
          <span>Average Reliability Score</span>
        </div>
        <div class="text-3xl font-extrabold text-gray-800">{{analyticsData.stats?.average_reliability_score || 0}}</div>
      </div>
    </div>

    <!-- FIRST ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6" *ngIf="overviewChart && trendChart">
      <!-- Movement Overview -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
           <h3 class="font-bold text-gray-800">Delivery / Order Movement Overview</h3>
        </div>
        <div class="flex-1 flex justify-center items-center h-48">
          <apx-chart *ngIf="overviewChart?.series?.length"
            [series]="overviewChart.series"
            [chart]="overviewChart.chart"
            [labels]="overviewChart.labels"
            [colors]="overviewChart.colors"
            [plotOptions]="overviewChart.plotOptions"
            [dataLabels]="{enabled:false}"
            [legend]="overviewChart.legend">
          </apx-chart>
          <div *ngIf="!overviewChart?.series?.length" class="text-gray-400">No PO distribution metadata available</div>
        </div>
        <div class="mt-4 text-center border-t pt-3">
          <a class="text-xs font-semibold text-blue-600 hover:underline cursor-pointer" (click)="navTo('/pos')">View All Active Orders →</a>
        </div>
      </div>
      
      <!-- Delivery Trend -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Delivery Performance Trend</h3>
          <span class="text-[10px] text-gray-400 border px-1 rounded bg-gray-50">DataCo Historical</span>
        </div>
        <div class="flex-1 h-48 w-full" style="min-width: 100%;">
          <apx-chart *ngIf="trendChart?.series?.length"
            style="width: 100%; display: block;"
            [series]="trendChart.series"
            [chart]="trendChart.chart"
            [xaxis]="trendChart.xaxis"
            [colors]="trendChart.colors"
            [dataLabels]="{enabled:false}"
            [stroke]="trendChart.stroke">
          </apx-chart>
          <div *ngIf="!trendChart?.series?.length" class="text-gray-400 text-center h-full flex items-center justify-center">No trend mapping calculated</div>
        </div>
      </div>

      <!-- Top Supplier Performance -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-gray-800">Top Supplier Performance</h3>
          <a class="text-xs text-blue-600 hover:underline cursor-pointer" (click)="navTo('/vendors')">View All</a>
        </div>
        <div class="space-y-4 flex-1">
          <div class="grid grid-cols-12 text-[10px] font-semibold text-gray-400 uppercase pb-2 border-b">
            <div class="col-span-4">Vendor</div>
            <div class="col-span-3 text-center">Score</div>
            <div class="col-span-3 text-center">On-Time</div>
            <div class="col-span-2 text-right">Risk</div>
          </div>
          <div *ngFor="let vendor of analyticsData?.top_suppliers" class="grid grid-cols-12 text-xs items-center cursor-pointer hover:bg-gray-50" (click)="navTo('/vendors')">
            <div class="col-span-4 font-medium text-gray-800 truncate pr-2">{{vendor.vendor}}</div>
            <div class="col-span-3 text-center text-gray-600 font-bold">{{vendor.reliability_score}}/100</div>
            <div class="col-span-3 text-center text-teal-600">{{vendor.on_time_delivery_pct}}%</div>
            <div class="col-span-2 text-right font-medium" 
                [ngClass]="{'text-red-500': vendor.risk_level==='High', 'text-amber-500': vendor.risk_level==='Medium', 'text-emerald-500': vendor.risk_level==='Low'}">
                {{vendor.risk_level}}
            </div>
          </div>
          <div *ngIf="!analyticsData?.top_suppliers?.length" class="text-center text-sm text-gray-500 py-4">No vendor data found.</div>
        </div>
      </div>
    </div>

    <!-- SECOND ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
      
      <!-- Recent / Active Purchase Orders -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Recent / Active Purchase Orders</h3>
          <a class="text-sm text-blue-600 hover:underline cursor-pointer" (click)="navTo('/pos')">View All</a>
        </div>
        <div class="overflow-x-auto flex-1 p-0">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead class="bg-white text-gray-400 uppercase font-semibold">
              <tr>
                <th class="px-5 py-3">PO Number</th>
                <th class="px-5 py-3">Vendor</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Expected</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let po of analyticsData?.recent_active_pos" class="hover:bg-gray-50 cursor-pointer" (click)="navTo('/pos/'+po.po_number)">
                <td class="px-5 py-3 font-bold text-gray-700">{{po.po_number}}</td>
                <td class="px-5 py-3 text-gray-600">{{po.vendor}}</td>
                <td class="px-5 py-3">
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
                <td class="px-5 py-3 text-gray-700">
                    <span *ngIf="po.expected_delivery" [ngClass]="po.delayed ? 'text-red-500 font-bold' : ''">{{po.expected_delivery | date:'MMM d, yyyy'}}</span>
                    <span *ngIf="!po.expected_delivery" class="text-gray-300">-</span>
                </td>
              </tr>
              <tr *ngIf="!analyticsData?.recent_active_pos?.length">
                <td colspan="4" class="p-8 text-center text-gray-500">No active orders matching context.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Order / Delivery Status Summary -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
           <h3 class="font-bold text-gray-800">Order / Delivery Status Summary</h3>
        </div>
        <div class="flex-1 flex justify-center items-center h-48">
          <apx-chart *ngIf="statusChart?.series?.length"
            [series]="statusChart.series"
            [chart]="statusChart.chart"
            [labels]="statusChart.labels"
            [colors]="statusChart.colors"
            [plotOptions]="statusChart.plotOptions"
            [dataLabels]="{enabled:false}"
            [legend]="statusChart.legend">
          </apx-chart>
        </div>
      </div>
      
      <!-- Upcoming Deliveries - Rich Cards -->
      <div class="bg-white shadow-sm border border-emerald-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-emerald-50 bg-emerald-50/20">
          <h3 class="font-bold text-emerald-800 flex items-center gap-2">
            <span class="text-xl">🚚</span> Upcoming Deliveries
          </h3>
          <div class="flex items-center gap-3">
            <span class="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Logistics Schedule</span>
            <a class="text-xs text-blue-600 hover:underline cursor-pointer font-bold" (click)="navTo('/delivery')">View All →</a>
          </div>
        </div>
        <div class="p-4 space-y-3 max-h-[340px] overflow-y-auto">
          <div *ngFor="let uv of analyticsData?.upcoming_deliveries"
               class="flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all"
               [ngClass]="uv.days_remaining < 0 ? 'border-red-100 bg-red-50/30' : (uv.days_remaining <= 3 ? 'border-amber-100 bg-amber-50/30' : 'border-gray-100 bg-white')"
               (click)="navTo('/delivery')">
            <!-- Urgency Indicator -->
            <div class="w-1.5 h-12 rounded-full flex-none"
                 [ngClass]="uv.days_remaining < 0 ? 'bg-red-500' : (uv.days_remaining <= 3 ? 'bg-amber-400' : 'bg-emerald-400')"></div>
            <!-- Main Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-extrabold text-sm text-gray-800">{{uv.po_number}}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      [ngClass]="uv.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : (uv.status === 'Ordered' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')">
                  {{uv.status || 'In Transit'}}
                </span>
              </div>
              <div class="text-xs text-gray-500">Vendor: <span class="font-semibold text-gray-700">{{uv.vendor || '—'}}</span></div>
              <div class="text-xs text-gray-400 mt-0.5" *ngIf="uv.expected_delivery">Expected: <span class="font-medium text-gray-600">{{uv.expected_delivery | date:'MMM d, yyyy'}}</span></div>
            </div>
            <!-- Days Badge -->
            <div class="flex flex-col items-center flex-none">
              <div class="text-2xl font-black" [ngClass]="uv.days_remaining < 0 ? 'text-red-600' : (uv.days_remaining <= 3 ? 'text-amber-600' : 'text-emerald-600')">
                {{uv.days_remaining < 0 ? (-uv.days_remaining) : uv.days_remaining}}
              </div>
              <div class="text-[10px] font-bold uppercase" [ngClass]="uv.days_remaining < 0 ? 'text-red-400' : 'text-gray-400'">
                {{uv.days_remaining < 0 ? 'days late' : 'days left'}}
              </div>
              <span class="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                    [ngClass]="uv.days_remaining < 0 ? 'bg-red-500' : (uv.days_remaining <= 3 ? 'bg-amber-500' : 'bg-emerald-500')">
                {{uv.days_remaining < 0 ? 'OVERDUE' : (uv.days_remaining <= 3 ? 'HIGH' : 'OK')}}
              </span>
            </div>
          </div>
          <div *ngIf="!analyticsData?.upcoming_deliveries?.length" class="p-8 text-center text-gray-400 text-sm">
            No upcoming deliveries scheduled.
          </div>
        </div>
      </div>
    </div>
    
    <!-- THIRD ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
      
      <!-- Risk Overview -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
        <div class="flex justify-between items-center mb-4">
           <h3 class="font-bold text-gray-800">Supply Chain Risk Overview</h3>
           <a class="text-[10px] text-blue-600 cursor-pointer" (click)="navTo('/reliability')">Detail →</a>
        </div>
        <div class="flex-1 flex justify-center items-center h-48">
          <apx-chart *ngIf="riskChart?.series?.length"
            [series]="riskChart.series"
            [chart]="riskChart.chart"
            [labels]="riskChart.labels"
            [colors]="riskChart.colors"
            [plotOptions]="riskChart.plotOptions"
            [dataLabels]="{enabled:false}"
            [legend]="riskChart.legend">
          </apx-chart>
        </div>
      </div>

      <!-- Contract Expiry Alerts -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Contract Expiry Alerts</h3>
          <a class="text-xs text-blue-600 hover:underline cursor-pointer" (click)="navTo('/contracts')">View Compliance</a>
        </div>
        <div class="flex-1 p-5 space-y-3">
           <div *ngFor="let alert of analyticsData?.contract_alerts" class="border p-3 rounded-lg flex justify-between items-center" 
                [ngClass]="alert.days_to_expiry < 30 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'">
                <div>
                   <div class="text-sm font-bold text-gray-800">{{alert.contract_title}}</div>
                   <div class="text-xs text-gray-500">{{alert.vendor}}</div>
                </div>
                <div class="text-right">
                   <div class="font-semibold text-xs" [ngClass]="alert.days_to_expiry < 30 ? 'text-red-600' : 'text-amber-600'">
                       {{ alert.days_to_expiry < 0 ? 'EXPIRED' : 'Expiring in ' + alert.days_to_expiry + ' days' }}
                   </div>
                </div>
           </div>
           <div *ngIf="!analyticsData?.contract_alerts?.length" class="text-sm text-gray-500 text-center py-4">No critical contract alerts</div>
        </div>
      </div>
      
      <!-- Operational Notifications -->
      <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">Operational Notifications</h3>
          <a class="text-xs text-blue-600 hover:underline cursor-pointer" (click)="navTo('/notifications')">Notification Center</a>
        </div>
        <div class="flex-1 p-5 space-y-3">
           <div *ngFor="let notif of analyticsData?.operational_notifications" class="flex gap-3 text-sm pb-3 border-b border-gray-100 last:border-0 last:pb-0">
               <div class="w-8 h-8 rounded shrink-0 flex items-center justify-center text-lg"
                    [ngClass]="{'bg-red-100 text-red-600': notif.type === 'risk_alert' || notif.type === 'delivery_delay', 'bg-blue-100 text-blue-600': notif.type !== 'risk_alert'}">
                    {{ notif.type === 'delivery_delay' ? '❗' : (notif.type === 'risk_alert' ? '⚠️' : '🔔') }}
               </div>
               <div>
                   <div class="font-bold text-gray-800 leading-tight">{{notif.title}}</div>
                   <div class="text-xs text-gray-500 mt-1 line-clamp-1 truncate block w-48" [title]="notif.message">{{notif.message}}</div>
                   <div class="text-[10px] text-gray-400 mt-0.5">{{notif.date | date:'short'}}</div>
               </div>
           </div>
           <div *ngIf="!analyticsData?.operational_notifications?.length" class="text-sm text-gray-500 text-center py-4">No recent operational alerts</div>
        </div>
      </div>
    </div>
  `
})
export class ScmDashboardComponent implements OnInit, OnChanges {
  @Input() data: any;
  analyticsData: any;
  overviewChart: any;
  trendChart: any;
  statusChart: any;
  riskChart: any;

  constructor(private router: Router) { }

  ngOnInit() {
    // Initialization triggered in ngOnChanges if data arrives early
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      // Safely resolve nested layers avoiding undefined crashes
      this.analyticsData = this.data.analytics || this.data;
      this.initCharts();
    }
  }

  navTo(path: string) {
    this.router.navigate([path]);
  }

  initCharts() {
    if (!this.analyticsData) return;

    // Movement Overview (PO Status Distribution)
    const movLabels = this.analyticsData.movement_overview?.map((m: any) => m.status) || [];
    const movData = this.analyticsData.movement_overview?.map((m: any) => m.count) || [];

    this.overviewChart = {
      series: movData,
      labels: movLabels,
      chart: { type: 'donut', height: 260 },
      colors: ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#cbd5e1'],
      plotOptions: {
        pie: { donut: { size: '75%' } }
      },
      legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '12px' }
    };

    // Status Summary (Delivery State delay/on-time)
    const statLabels = this.analyticsData.status_summary?.map((m: any) => m.status) || [];
    const statData = this.analyticsData.status_summary?.map((m: any) => m.count) || [];

    this.statusChart = {
      series: statData,
      labels: statLabels,
      chart: { type: 'donut', height: 260 },
      colors: ['#10b981', '#ef4444', '#f59e0b'],
      plotOptions: {
        pie: { donut: { size: '65%' } }
      },
      legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '12px' }
    };

    // Risk Overview
    const riskLabels = this.analyticsData.risk_overview?.map((m: any) => m.risk) || [];
    const riskData = this.analyticsData.risk_overview?.map((m: any) => m.count) || [];

    this.riskChart = {
      series: [{ name: 'Risk Count', data: riskData }],
      labels: riskLabels,
      chart: { type: 'bar', height: 200 },
      colors: ['#ef4444', '#f59e0b', '#10b981'],
      plotOptions: {
        bar: { distributed: true, borderRadius: 4 }
      },
      legend: { show: false }
    };

    // Performance Trend (DataCo Line Chart)
    const trendCats = this.analyticsData.performance_trend?.map((t: any) => t.period) || [];
    const onTimeData = this.analyticsData.performance_trend?.map((t: any) => t.on_time_pct) || [];
    const delayedData = this.analyticsData.performance_trend?.map((t: any) => t.delayed_pct) || [];

    this.trendChart = {
      series: [
        { name: "On-Time %", data: onTimeData },
        { name: "Delayed %", data: delayedData }
      ],
      chart: { height: 240, type: "area", toolbar: { show: false }, parentHeightOffset: 0 },
      colors: ['#10b981', '#ef4444'],
      stroke: { curve: "smooth", width: 2 },
      xaxis: { categories: trendCats }
    };
  }
}
