import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-delivery-tracking',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="page-head pb-4 border-b border-gray-200 flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Supply Chain Order Tracking</h1>
        <p class="text-sm text-gray-500 mt-1">Detailed transit information, route mapping, and estimated delivery times for all active purchase orders.</p>
      </div>
      <div>
        <span class="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded w-fit">Live Tracking Active</span>
      </div>
    </div>
    <!-- Dynamic Dashboard Metrics Layout (Supply Chain Manager Scope) -->
    <div *ngIf="summary && summary.stats" class="mt-8 font-poppins">
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
          <div class="flex items-center space-x-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            <span class="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">🛒</span>
            <span>Total Purchase Orders</span>
          </div>
          <div class="text-2xl font-black text-slate-800">{{summary.stats?.total_pos || 0}}</div>
        </div>
        <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
          <div class="flex items-center space-x-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            <span class="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">📦</span>
            <span>Active / In-Movement Orders</span>
          </div>
          <div class="text-2xl font-black text-slate-800">{{summary.stats?.active_in_movement || 0}}</div>
        </div>
        <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
          <div class="flex items-center space-x-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            <span class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">🚚</span>
            <span>Orders in Transit</span>
          </div>
          <div class="text-2xl font-black text-slate-800">{{summary.stats?.orders_in_transit || 0}}</div>
        </div>
        <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
          <div class="flex items-center space-x-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            <span class="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs">⏱️</span>
            <span>On-Time Delivery %</span>
          </div>
          <div class="text-2xl font-black text-teal-600">{{summary.stats?.on_time_delivery_pct || 0}}%</div>
        </div>
        <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
          <div class="flex items-center space-x-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            <span class="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs">❗</span>
            <span>Delayed Deliveries</span>
          </div>
          <div class="text-2xl font-black text-red-600">{{summary.stats?.delayed_deliveries || 0}}</div>
        </div>
        <div class="bg-white p-4 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-between">
          <div class="flex items-center space-x-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            <span class="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs">🛡️</span>
            <span>Average Reliability Score</span>
          </div>
          <div class="flex items-baseline space-x-1">
              <h3 class="text-2xl font-black text-slate-800">{{summary.stats?.average_reliability_score || 0}}</h3>
              <span class="text-xs font-bold text-slate-400">/ 100</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 p-1" *ngIf="summary">
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
    </div>

    <div class="mt-6 mb-8" *ngIf="summary">
      <!-- Upcoming Deliveries -->
      <div class="bg-white shadow-sm border border-emerald-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-emerald-50 bg-emerald-50/20">
          <h3 class="font-bold text-emerald-800 flex items-center gap-2">
              <span class="text-xl">🚚</span> Upcoming Deliveries
          </h3>
          <span class="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Logistics Schedule</span>
        </div>
        <div class="overflow-x-auto flex-1 p-0">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead class="bg-white text-gray-400 uppercase font-semibold border-b border-gray-100">
              <tr>
                <th class="px-5 py-3">PO Number</th>
                <th class="px-5 py-3">T-Minus (Days)</th>
                <th class="px-5 py-3">Risk/Delay</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr *ngFor="let uv of summary?.upcoming_deliveries" class="hover:bg-emerald-50/50 transition">
                <td class="px-5 py-3 font-bold text-indigo-700">{{uv.po_number}}</td>
                <td class="px-5 py-3 text-gray-800 font-semibold">{{uv.days_remaining}} Days</td>
                <td class="px-5 py-3">
                    <span class="px-2 py-0.5 rounded text-white" [ngClass]="uv.days_remaining < 0 ? 'bg-red-500' : (uv.days_remaining <= 3 ? 'bg-amber-500' : 'bg-emerald-500')">
                        {{uv.days_remaining < 0 ? 'Overdue' : (uv.days_remaining <= 3 ? 'High' : 'Normal')}}
                    </span>
                </td>
              </tr>
              <tr *ngIf="!summary?.upcoming_deliveries?.length">
                <td colspan="3" class="p-8 text-center text-gray-500">No scheduled upcoming deliveries.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="mt-8 flex flex-col gap-6" *ngIf="orders.length">
        <div *ngFor="let order of getActiveOrders()" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h3 class="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                         {{order.po_number}} 
                         <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                               [ngClass]="order.status === 'Ordered' ? 'bg-amber-100 text-amber-700' : (order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')">
                             {{order.status}}
                         </span>
                    </h3>
                    <div class="text-sm text-gray-500 mt-1">Vendor: <span class="font-medium text-gray-700">{{order.vendor?.name || 'Local Dist'}}</span></div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-400">Total Value</div>
                    <div class="font-bold text-gray-800">{{order.amount | currency}}</div>
                </div>
            </div>
            
            <div class="relative w-full mb-4 mt-2 px-8">
                <!-- Tracking Bar UI -->
                <div class="absolute inset-0 top-1/2 -mt-[2px] h-[4px] bg-gray-100 w-full z-0 rounded-full"></div>
                <div class="absolute inset-0 top-1/2 -mt-[2px] h-[4px] bg-blue-500 z-0 rounded-full transition-all duration-1000"
                     [style.width.%]="getProgress(order)"></div>
                     
                <div class="relative z-10 flex justify-between">
                    <div class="flex flex-col items-center">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center border-[3px] bg-white border-blue-500 text-blue-500 shadow shadow-blue-200">
                           <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>
                        <div class="mt-2 text-xs font-bold text-gray-800 text-center w-24">Order Placed</div>
                    </div>
                    
                    <div class="flex flex-col items-center">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center border-[3px] bg-white transition-colors"
                             [ngClass]="getProgress(order) >= 50 ? 'border-blue-500' : 'border-gray-200'">
                             <div *ngIf="getProgress(order) >= 50" class="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>
                        <div class="mt-2 text-xs font-bold text-gray-800 text-center w-24">In Transit</div>
                    </div>
                    
                    <div class="flex flex-col items-center">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center border-[3px] bg-white transition-colors"
                             [ngClass]="getProgress(order) === 100 ? 'border-blue-500' : 'border-gray-200'">
                             <div *ngIf="getProgress(order) === 100" class="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>
                        <div class="mt-2 text-xs font-bold text-gray-800 text-center w-24">Delivered</div>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
    
    <div class="mt-8 text-center text-gray-500" *ngIf="!orders.length && !loading">
       <p>No active delivery data available in transit endpoints.</p>
    </div>
  `
})
export class DeliveryTrackingComponent implements OnInit {
  orders: any[] = [];
  summary: any = null;
  loading = true;

  overviewChart: any = null;
  statusChart: any = null;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    let activeRole = 'summary';
    const roleName = localStorage.getItem('role');
    if (roleName === 'Supply Chain Manager') activeRole = 'scm';
    else if (roleName === 'Procurement Manager') activeRole = 'pm';

    const activeAPI = ['scm', 'pm'].includes(activeRole) ? `analytics/dashboard/${activeRole}` : 'analytics/dashboard-summary';
    this.http.get<any>(`${environment.apiBaseUrl}/${activeAPI}`).subscribe(res => {
      this.summary = res;
      if (res.movement_overview) {
        this.overviewChart = {
          series: res.movement_overview.map((c: any) => c.value),
          chart: { type: 'donut', height: 280, sparkline: { enabled: true } },
          labels: res.movement_overview.map((c: any) => c.status),
          colors: ['#3b82f6', '#f59e0b', '#10b981'],
          plotOptions: { pie: { donut: { size: '75%' } } },
          legend: { show: false }
        };
      }
      if (res.status_summary) {
        this.statusChart = {
          series: res.status_summary.map((s: any) => s.count),
          chart: { type: 'pie', height: 280 },
          labels: res.status_summary.map((s: any) => s.status),
          colors: ['#10b981', '#ef4444', '#f59e0b'],
          plotOptions: { pie: { dataLabels: { offset: -10 } } },
          legend: { position: 'bottom' }
        };
      }
    });

    this.http.get<any[]>(`${environment.apiBaseUrl}/procurement/purchase-orders`).subscribe(res => {
      this.orders = res || [];
      this.loading = false;
    }, err => {
      console.error(err);
      this.loading = false;
    });
  }

  getActiveOrders() {
    return this.orders.filter(o => o.status !== 'Pending' && o.status !== 'Cancelled').slice(0, 10);
  }

  getProgress(order: any) {
    if (order.status === 'Completed' || order.status === 'Delivered') return 100;
    if (order.status === 'Ordered') return 50;
    return 20; // Approved / Processing
  }
}
