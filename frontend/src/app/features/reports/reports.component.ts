import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, PercentPipe, DatePipe, NgApexchartsModule],
  template: `
    <div class="page-head flex justify-between items-center bg-white p-6 rounded shadow-sm border border-slate-200">
      <div>
        <h1 class="text-2xl font-bold text-[var(--slate-1)]">
          {{ reportType === 'performance' ? 'Performance / Reliability Reports' : reportType === 'order' ? 'Delivery / Order Reports' : reportType === 'compliance' ? 'Supply Chain Analytics' : 'Executive Analytics & Reports' }}
        </h1>
        <p class="text-slate-500">Comprehensive overview of Procurement, Vendors, and Ecosystem compliance derived from active PostgreSQL snapshots.</p>
      </div>
      <div>
         <button class="bg-[var(--primary)] text-white px-4 py-2 rounded font-medium hover:bg-indigo-700 transition" onclick="window.print()">Export Report</button>
      </div>
    </div>
    
    <div *ngIf="loading" class="mt-8 text-center text-slate-500">Generating analytics report...</div>

    <ng-container *ngIf="!loading && summary">
      
    <!-- Dynamic Dashboard Metrics Layout (Supply Chain Manager Scope) -->
    <div *ngIf="!isVendor && summary && summary.stats" class="mb-8 font-poppins">
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

      <!-- Dynamic Dashboard Charts based on Report Type -->
      <div *ngIf="!isVendor && summary" class="mb-10 font-poppins text-xs">
          <!-- PERFORMANCE REPORTS -->
          <div *ngIf="reportType === 'performance'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
                 <div class="flex justify-between items-center mb-4">
                   <h3 class="font-bold text-gray-800">Top Supplier Performance</h3>
                   <span class="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded">Live Reliability</span>
                 </div>
                 <div class="space-y-4 flex-1">
                   <div class="grid grid-cols-12 text-[10px] font-semibold text-gray-400 uppercase pb-2 border-b">
                     <div class="col-span-4">Vendor</div>
                     <div class="col-span-3 text-center">Score</div>
                     <div class="col-span-3 text-center">On-Time</div>
                     <div class="col-span-2 text-right">Risk</div>
                   </div>
                   <div *ngFor="let vendor of summary.top_suppliers" class="grid grid-cols-12 text-xs items-center hover:bg-gray-50">
                     <div class="col-span-4 font-medium text-gray-800 truncate pr-2">{{vendor.vendor}}</div>
                     <div class="col-span-3 text-center text-gray-600 font-bold">{{vendor.reliability_score}}/100</div>
                     <div class="col-span-3 text-center text-teal-600 font-bold">{{vendor.on_time_delivery_pct}}%</div>
                     <div class="col-span-2 text-right font-medium" 
                         [ngClass]="{'text-red-500': vendor.risk_level==='High', 'text-amber-500': vendor.risk_level==='Medium', 'text-emerald-500': vendor.risk_level==='Low'}">
                         {{vendor.risk_level}}
                     </div>
                   </div>
                   <div *ngIf="!summary.top_suppliers?.length" class="text-center text-sm text-gray-500 py-4">No vendor data found.</div>
                 </div>
               </div>
               
               <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
                 <div class="flex justify-between items-center mb-4">
                   <h3 class="font-bold text-gray-800">Delivery Performance Trend</h3>
                 </div>
                 <div class="flex-1 h-64 w-full" style="min-width: 100%;">
                   <apx-chart *ngIf="trendChart?.series?.length"
                     style="width: 100%; display: block;"
                     [series]="trendChart.series"
                     [chart]="trendChart.chart"
                     [xaxis]="trendChart.xaxis"
                     [colors]="trendChart.colors"
                     [dataLabels]="{enabled:false}"
                     [stroke]="trendChart.stroke">
                   </apx-chart>
                 </div>
               </div>
          </div>
          
          <!-- ORDER REPORTS: Movement Overview Chart + Status -->
          <div *ngIf="reportType === 'order'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
                 <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-800">Delivery / Order Movement Overview</h3>
                 </div>
                 <div class="flex-1 flex justify-center items-center h-64">
                   <apx-chart *ngIf="overviewChart?.series?.length"
                     [series]="overviewChart.series"
                     [chart]="overviewChart.chart"
                     [labels]="overviewChart.labels"
                     [colors]="overviewChart.colors"
                     [plotOptions]="overviewChart.plotOptions"
                     [dataLabels]="{enabled:false}"
                     [legend]="overviewChart.legend">
                   </apx-chart>
                   <div *ngIf="!overviewChart?.series?.length" class="text-gray-400 text-sm text-center">Loading chart...</div>
                 </div>
               </div>
               <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
                 <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-800">Order / Delivery Status Summary</h3>
                 </div>
                 <div class="flex-1 flex justify-center items-center h-64">
                   <apx-chart *ngIf="statusChart?.series?.length"
                     [series]="statusChart.series"
                     [chart]="statusChart.chart"
                     [labels]="statusChart.labels"
                     [colors]="statusChart.colors"
                     [plotOptions]="statusChart.plotOptions"
                     [dataLabels]="{enabled:false}"
                     [legend]="statusChart.legend">
                   </apx-chart>
                   <div *ngIf="!statusChart?.series?.length" class="text-gray-400 text-sm text-center">Loading chart...</div>
                 </div>
               </div>
          </div>
          <!-- Upcoming Deliveries for Order Reports -->
          <div *ngIf="reportType === 'order'" class="mt-6">
            <div class="bg-white shadow-sm border border-emerald-100 rounded-xl flex flex-col">
              <div class="flex justify-between items-center p-5 border-b border-emerald-50 bg-emerald-50/20">
                <h3 class="font-bold text-emerald-800 flex items-center gap-2">
                  <span class="text-xl">🚚</span> Upcoming Deliveries
                </h3>
                <span class="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Logistics Schedule</span>
              </div>
              <div class="p-4 space-y-3 max-h-[320px] overflow-y-auto">
                <div *ngFor="let uv of summary?.upcoming_deliveries"
                     class="flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all"
                     [ngClass]="uv.days_remaining < 0 ? 'border-red-100 bg-red-50/30' : (uv.days_remaining <= 3 ? 'border-amber-100 bg-amber-50/30' : 'border-gray-100 bg-white')">
                  <div class="w-1.5 h-12 rounded-full flex-none"
                       [ngClass]="uv.days_remaining < 0 ? 'bg-red-500' : (uv.days_remaining <= 3 ? 'bg-amber-400' : 'bg-emerald-400')"></div>
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
                <div *ngIf="!summary?.upcoming_deliveries?.length" class="p-8 text-center text-gray-400 text-sm">
                  No upcoming deliveries scheduled.
                </div>
              </div>
            </div>
          </div>
          
          <!-- SUPPLY CHAIN ANALYTICS & COMPLIANCE -->
          <div *ngIf="reportType === 'compliance' || !reportType" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
                 <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-800">Supply Chain Risk Overview</h3>
                 </div>
                 <div class="flex-1 flex justify-center items-center h-64">
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
               
               <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
                 <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-800">Delivery / Order Movement Overview</h3>
                 </div>
                 <div class="flex-1 flex justify-center items-center h-64">
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
          </div>

          <!-- TOP SUPPLIER PERFORMANCE (Compliance/Analytics view) -->
          <div *ngIf="reportType === 'compliance' || !reportType" class="mt-6">
            <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-gray-800">Top Supplier Performance</h3>
                <span class="text-xs text-gray-400">Live data</span>
              </div>
              <div class="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase px-3 pb-2 border-b border-gray-100">
                <div class="col-span-4">Vendor</div>
                <div class="col-span-3 text-center">Score</div>
                <div class="col-span-3 text-center">On-Time %</div>
                <div class="col-span-2 text-right">Risk</div>
              </div>
              <div *ngFor="let vendor of summary?.top_suppliers" class="grid grid-cols-12 items-center px-3 py-3 border-b border-gray-50 hover:bg-gray-50 transition text-sm">
                <div class="col-span-4 font-semibold text-gray-800 truncate">{{vendor.vendor}}</div>
                <div class="col-span-3 text-center font-bold text-gray-700">{{vendor.reliability_score}}/100</div>
                <div class="col-span-3 text-center font-bold text-teal-600">{{vendor.on_time_delivery_pct}}%</div>
                <div class="col-span-2 text-right font-medium"
                    [ngClass]="{'text-red-500': vendor.risk_level==='High', 'text-amber-500': vendor.risk_level==='Medium', 'text-emerald-500': vendor.risk_level==='Low'}">
                    {{vendor.risk_level}}
                </div>
              </div>
              <div *ngIf="!summary?.top_suppliers?.length" class="text-center text-sm text-gray-400 py-6">No supplier data available.</div>
            </div>
          </div>

          
          <div *ngIf="reportType === 'compliance' || !reportType" class="mt-6">
            <!-- Upcoming Deliveries - Rich Cards (same as dashboard) -->
            <div class="bg-white shadow-sm border border-emerald-100 rounded-xl flex flex-col">
              <div class="flex justify-between items-center p-5 border-b border-emerald-50 bg-emerald-50/20">
                <h3 class="font-bold text-emerald-800 flex items-center gap-2">
                  <span class="text-xl">🚚</span> Upcoming Deliveries
                </h3>
                <span class="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Logistics Schedule</span>
              </div>
              <div class="p-4 space-y-3 max-h-[320px] overflow-y-auto">
                <div *ngFor="let uv of summary?.upcoming_deliveries"
                     class="flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all"
                     [ngClass]="uv.days_remaining < 0 ? 'border-red-100 bg-red-50/30' : (uv.days_remaining <= 3 ? 'border-amber-100 bg-amber-50/30' : 'border-gray-100 bg-white')">
                  <div class="w-1.5 h-12 rounded-full flex-none"
                       [ngClass]="uv.days_remaining < 0 ? 'bg-red-500' : (uv.days_remaining <= 3 ? 'bg-amber-400' : 'bg-emerald-400')"></div>
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
                <div *ngIf="!summary?.upcoming_deliveries?.length" class="p-8 text-center text-gray-400 text-sm">
                  No upcoming deliveries scheduled.
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="reportType === 'order' || reportType === 'compliance' || !reportType" class="mt-6">
              <div class="bg-white shadow-sm border border-gray-100 rounded-xl flex flex-col">
                <div class="flex justify-between items-center p-5 border-b border-gray-100">
                  <h3 class="font-bold text-gray-800">Recent / Active Purchase Orders</h3>
                </div>
                <div class="overflow-x-auto flex-1 p-0">
                  <table class="w-full text-left text-xs whitespace-nowrap">
                    <thead class="bg-white text-gray-400 uppercase font-semibold">
                      <tr>
                        <th class="px-5 py-3">PO Number</th>
                        <th class="px-5 py-3">Vendor</th>
                        <th class="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr *ngFor="let po of summary?.recent_active_pos" class="hover:bg-gray-50">
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
                      </tr>
                      <tr *ngIf="!summary?.recent_active_pos?.length">
                        <td colspan="3" class="p-8 text-center text-gray-500">No active orders matching context.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
      </div>

      <!-- Legacy Generic Reports Overlays (Hidden) -->
      <div *ngIf="false">
          <!-- Report Header -->
          <div class="grid grid-cols-4 gap-4 mt-6">
            <div class="card p-5">
               <div class="text-xs font-bold text-slate-400 uppercase">Report Scope</div>
               <div class="text-xl font-bold text-indigo-700 mt-1 capitalize">{{reportType || 'Platform-Wide'}}</div>
            </div>
            <div class="card p-5">
               <div class="text-xs font-bold text-slate-400 uppercase">Generation Date</div>
               <div class="text-xl font-bold mt-1 text-slate-800">{{ today | date:'mediumDate' }}</div>
            </div>
            <div class="card p-5">
               <div class="text-xs font-bold text-slate-400 uppercase">System Integrity</div>
               <div class="text-xl font-bold mt-1 text-green-600">Operational</div>
            </div>
          </div>

          <div class="grid lg:grid-cols-2 gap-6 mt-8">
            <!-- Procurement Report -->
            <div class="card">
              <div class="card-head bg-slate-50 border-b p-4">
                <h3 class="font-bold text-slate-800">Procurement & Financial Summary</h3>
              </div>
              <div class="card-body p-5 space-y-4">
                 <div class="flex justify-between border-b pb-3">
                   <span class="text-slate-600">Total Purchase Orders</span>
                   <span class="font-bold">{{summary.kpis.total_pos}}</span>
                 </div>
                 <div class="flex justify-between border-b pb-3">
                   <span class="text-slate-600">Total Procurement Spend</span>
                   <span class="font-bold text-indigo-700">{{summary.kpis.total_spend | currency}}</span>
                 </div>
                 <div class="flex justify-between pb-2">
                   <span class="text-slate-600">PO Status Breakdowns</span>
                   <div class="text-right">
                      <div *ngFor="let cat of summary.chart_data?.po_status?.labels; let i = index" class="text-sm">
                        {{cat}}: <span class="font-bold">{{summary.chart_data?.po_status?.series[i]}}</span>
                      </div>
                   </div>
                 </div>
              </div>
            </div>
            
            <!-- Vendor Performance Report -->
            <div class="card">
              <div class="card-head bg-slate-50 border-b p-4">
                <h3 class="font-bold text-slate-800">Vendor Reliability Report</h3>
              </div>
              <div class="card-body p-5 space-y-4">
                 <div class="flex justify-between border-b pb-3">
                   <span class="text-slate-600">Total Operational Vendors</span>
                   <span class="font-bold">{{summary.kpis.total_vendors}}</span>
                 </div>
                 <div class="flex justify-between border-b pb-3">
                   <span class="text-slate-600">Average Platform Reliability</span>
                   <span class="font-bold text-green-600">89.4% (Healthy)</span> <!-- Aggregation placeholder -->
                 </div>
                 <div class="flex justify-between pb-2">
                   <span class="text-slate-600">Status Distribution</span>
                   <div class="text-right">
                      <div *ngFor="let cat of summary.chart_data?.vendor_status?.labels; let i = index" class="text-sm">
                        {{cat}}: <span class="font-bold">{{summary.chart_data?.vendor_status?.series[i]}}</span>
                      </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
          
          <!-- Top Vendors List -->
          <div class="card mt-8">
            <div class="card-head border-b p-4">
              <h3 class="font-bold text-slate-800">Top Performing Vendor Entities</h3>
            </div>
            <div class="card-body overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 border-b">
                   <tr>
                     <th class="p-3 font-medium text-slate-500 uppercase text-xs">Entity</th>
                     <th class="p-3 font-medium text-slate-500 uppercase text-xs">Category</th>
                     <th class="p-3 font-medium text-slate-500 uppercase text-xs">Reliability Scope</th>
                   </tr>
                </thead>
                <tbody>
                   <tr *ngFor="let v of summary.recent_vendors?.slice(0, 5)" class="border-b last:border-0 hover:bg-slate-50">
                     <td class="p-3 font-medium text-slate-800">{{v.name}}</td>
                     <td class="p-3 text-slate-600">{{v.category || 'Standard Services'}}</td>
                     <td class="p-3"><span class="badge" [ngClass]="'green'">High Distinction</span></td>
                   </tr>
                </tbody>
              </table>
            </div>
          </div>
      </div>
      
      <!-- Vendor Specific Reports Overlays -->
      <div *ngIf="isVendor && vendorAnalytics" class="mt-8 space-y-6">
        
        <!-- Persistent Top KPI Row (Displayed uniformly across ALL Vendor Reports) -->
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <!-- Reliability Score -->
              <div class="card p-4 flex flex-col justify-between shadow-sm">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                       <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   </div>
                   <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Reliability Score</div>
                </div>
                <div class="mt-4">
                   <div class="text-3xl font-bold text-gray-900">{{vendorAnalytics.kpis.reliability.value}} <span class="text-sm font-medium text-gray-400">/100</span></div>
                   <div class="text-xs font-semibold text-green-600 mt-1">{{vendorAnalytics.kpis.reliability.subtitle}}</div>
                </div>
              </div>

              <!-- Total Purchase Orders -->
              <div class="card p-4 flex flex-col justify-between shadow-sm">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                       <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   </div>
                   <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest leading-tight">Total Purchase Orders</div>
                </div>
                <div class="mt-4">
                   <div class="text-3xl font-bold text-gray-900">{{vendorAnalytics.kpis.purchase_orders.value}}</div>
                   <div class="text-xs font-semibold text-gray-400 mt-1">{{vendorAnalytics.kpis.purchase_orders.subtitle}}</div>
                </div>
              </div>

              <!-- On-Time Delivery -->
              <div class="card p-4 flex flex-col justify-between shadow-sm">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                       <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 17l-5-5m0 0l5-5m-5 5h12"></path></svg>
                   </div>
                   <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest leading-tight">On-Time Delivery</div>
                </div>
                <div class="mt-4">
                   <div class="text-3xl font-bold text-gray-900">{{vendorAnalytics.kpis.on_time.value}}</div>
                   <div class="text-xs font-semibold text-emerald-600 mt-1">{{vendorAnalytics.kpis.on_time.subtitle}}</div>
                </div>
              </div>

              <!-- Quality Rating -->
              <div class="card p-4 flex flex-col justify-between shadow-sm">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                       <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                   </div>
                   <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Quality Rating</div>
                </div>
                <div class="mt-4">
                   <div class="text-3xl font-bold text-gray-900">{{vendorAnalytics.kpis.quality.value}}</div>
                   <div class="text-xs font-semibold text-green-600 mt-1">{{vendorAnalytics.kpis.quality.subtitle}}</div>
                </div>
              </div>

              <!-- Total Invoiced -->
              <div class="card p-4 flex flex-col justify-between shadow-sm">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                       <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                   </div>
                   <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Total Invoiced</div>
                </div>
                <div class="mt-4">
                   <div class="text-3xl font-bold text-gray-900">{{vendorAnalytics.kpis.invoiced.value}}</div>
                   <div class="text-xs font-semibold text-gray-400 mt-1">{{vendorAnalytics.kpis.invoiced.subtitle}}</div>
                </div>
              </div>

              <!-- Pending Payments -->
              <div class="card p-4 flex flex-col justify-between shadow-sm">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                       <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   </div>
                   <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest leading-tight">Pending Payments</div>
                </div>
                <div class="mt-4">
                   <div class="text-3xl font-bold text-gray-900">{{vendorAnalytics.kpis.pending_payments.value}}</div>
                   <div class="text-xs font-semibold text-gray-400 mt-1">{{vendorAnalytics.kpis.pending_payments.subtitle}}</div>
                </div>
              </div>
           </div>

        <!-- Performance Report Elements -->
        <div *ngIf="reportType === 'performance'" class="flex flex-col gap-6">
           <!-- Existing Trends & Performance Summary -->
           <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div class="card p-5 h-[340px] flex flex-col shadow-sm">
                  <h3 class="font-bold text-slate-800 mb-4">Performance Trend</h3>
                  <apx-chart *ngIf="lineOptions" class="w-full flex-1"
                     [series]="lineOptions.series" [chart]="lineOptions.chart" [xaxis]="lineOptions.xaxis"
                     [dataLabels]="lineOptions.dataLabels" [colors]="lineOptions.colors" [stroke]="lineOptions.stroke"
                     [markers]="lineOptions.markers" [legend]="lineOptions.legend" [grid]="lineOptions.grid">
                  </apx-chart>
               </div>
               <div class="card p-5 h-[340px] flex flex-col shadow-sm">
                  <h3 class="font-bold text-slate-800 mb-4">Performance Summary</h3>
                  <div class="space-y-6 flex-1 overflow-y-auto pr-2">
                     <div *ngFor="let item of vendorAnalytics.performance_summary" class="flex items-center justify-between">
                        <div class="w-1/3 flex items-center gap-2">
                           <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path></svg></div>
                           <div class="text-xs font-semibold text-gray-600">{{item.label}}</div>
                        </div>
                        <div class="w-1/6 text-center text-xs font-bold text-gray-800">{{item.value}}</div>
                        <div class="w-1/2 flex items-center gap-3">
                           <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div class="h-full rounded-full {{item.color}}" [style.width]="item.pct"></div>
                           </div>
                           <span class="text-[10px] text-gray-400 font-mono w-10 text-right">{{item.pct}}</span>
                        </div>
                     </div>
                  </div>
               </div>
           </div>
        </div>

        <!-- Order Report Elements -->
        <div *ngIf="reportType === 'order'" class="card p-5">
           <h3 class="font-bold text-slate-800 mb-4">Recent Purchase Orders</h3>
           <table class="w-full text-left">
              <thead><tr class="bg-gray-50"><th class="p-3 text-[10px] uppercase text-gray-400 font-bold">PO Number</th><th class="p-3 text-[10px] uppercase text-gray-400 font-bold">Details</th><th class="p-3 text-[10px] uppercase text-gray-400 font-bold">Status</th></tr></thead>
              <tbody>
                 <tr *ngFor="let po of vendorAnalytics.recent_pos" class="border-b last:border-0 hover:bg-gray-50">
                    <td class="p-3 text-xs font-mono font-medium text-gray-700">{{po.po}}</td>
                    <td class="p-3 text-xs text-gray-600">{{po.desc}}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-semibold {{po.status_color}}">{{po.status}}</span></td>
                 </tr>
              </tbody>
           </table>
        </div>

        <!-- Compliance Report Elements -->
        <div *ngIf="reportType === 'compliance'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div class="card p-5 h-[340px]">
              <h3 class="font-bold text-slate-800 mb-4">Contract Status Overview</h3>
              <div class="flex items-center justify-center relative w-full h-[250px]">
                 <apx-chart *ngIf="donutOptions" class="w-[300px]"
                    [series]="donutOptions.series" [chart]="donutOptions.chart" [labels]="donutOptions.labels"
                    [plotOptions]="donutOptions.plotOptions" [colors]="donutOptions.colors" [dataLabels]="donutOptions.dataLabels"
                    [legend]="donutOptions.legend" [stroke]="donutOptions.stroke">
                 </apx-chart>
              </div>
           </div>
           
           <div class="card flex flex-col h-[340px]">
             <div class="card-head px-5 py-4 border-b">
                <h3 class="font-bold text-slate-800">Contract Alerts</h3>
             </div>
             <div class="card-body overflow-y-auto bg-slate-50 p-5">
                <div class="space-y-4">
                   <div *ngFor="let alert of vendorAnalytics.contract_alerts" class="bg-white p-4 rounded-lg border border-red-100 shadow-sm flex gap-4 items-start relative overflow-hidden">
                      <div class="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>
                      <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-none mt-1">
                         <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      </div>
                      <div>
                         <div class="font-bold text-slate-800 mb-1">{{alert.title}}</div>
                         <div class="text-[13px] font-medium text-slate-500 leading-relaxed">{{alert.subtitle}}</div>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </div>

      </div>
      
    </ng-container>
  `
})
export class ReportsComponent implements OnInit {
  summary: any = null;
  loading = true;
  today = new Date();
  reportType: string = '';

  isVendor = false;
  vendorAnalytics: any = null;
  lineOptions: any;
  donutOptions: any;

  overviewChart: any = null;
  trendChart: any = null;
  statusChart: any = null;
  riskChart: any = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private auth: AuthService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        const type = params['type'];
        if (type === 'delivery') this.reportType = 'order';
        else if (type === 'analytics') this.reportType = 'compliance';
        else this.reportType = type;
      } else if (this.isVendor) {
        this.reportType = 'performance';
      } else {
        this.reportType = '';
      }
    });

    this.auth.currentUser$.subscribe(u => {
      if (u && (u.role?.name === 'Vendor' || u.role_name === 'Vendor')) {
        this.isVendor = true;
        if (!this.reportType) {
          this.reportType = 'performance';
        }
        this.fetchVendorData();
      } else {
        this.fetchSummaryData();
      }
    });
  }

  fetchSummaryData() {
    let activeRole = 'summary';
    const roleName = localStorage.getItem('role');
    if (roleName === 'Supply Chain Manager') activeRole = 'scm';
    else if (roleName === 'Procurement Manager') activeRole = 'pm';

    const activeAPI = ['scm', 'pm'].includes(activeRole) ? `analytics/dashboard/${activeRole}` : 'analytics/dashboard-summary';
    this.http.get<any>(`${environment.apiBaseUrl}/${activeAPI}`).subscribe(
      res => {
        this.summary = res;

        // Initialize Charts mapping logic matching Scm Dashboard exactly
        if (res.movement_overview) {
          this.overviewChart = {
            series: res.movement_overview.map((c: any) => c.count),
            chart: { type: 'donut', height: 260 },
            labels: res.movement_overview.map((c: any) => c.status),
            colors: ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#cbd5e1', '#f97316', '#14b8a6', '#ec4899'],
            plotOptions: { pie: { donut: { size: '75%' } } },
            legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '12px' }
          };
        }

        if (res.performance_trend) {
          this.trendChart = {
            series: [{ name: 'On-Time Delivery %', data: res.performance_trend.map((t: any) => t.on_time_pct) }],
            chart: { type: 'area', height: 250, toolbar: { show: false }, sparkline: { enabled: true } },
            colors: ['#6366f1'],
            stroke: { curve: 'smooth', width: 3 },
            xaxis: { categories: res.performance_trend.map((t: any) => t.month) }
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

        if (res.risk_overview) {
          this.riskChart = {
            series: res.risk_overview.map((r: any) => r.count),
            chart: { type: 'donut', height: 280 },
            labels: res.risk_overview.map((r: any) => r.risk),
            colors: ['#3b82f6', '#f59e0b', '#ef4444'],
            plotOptions: { pie: { donut: { size: '75%' } } },
            legend: { position: 'bottom' }
          };
        }

        this.loading = false;
      },
      err => {
        console.error('Error fetching comprehensive report datamodel', err);
        this.loading = false;
      }
    );
  }

  fetchVendorData() {
    this.dashboardService.getRoleDashboard('vendor').subscribe({
      next: (data) => {
        this.vendorAnalytics = data.analytics || data;
        this.summary = this.vendorAnalytics; // Pass structural null checks for existing template checks
        this.initVendorCharts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching vendor analytics', err);
        this.loading = false;
      }
    });
  }

  initVendorCharts() {
    if (!this.vendorAnalytics) return;

    const trend = this.vendorAnalytics.performance_trend;
    if (trend) {
      this.lineOptions = {
        series: trend.series,
        chart: { type: "line", height: 260, toolbar: { show: false }, zoom: { enabled: false } },
        colors: ['#10B981', '#8B5CF6', '#3B82F6'],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 3 },
        xaxis: { categories: trend.categories, labels: { style: { colors: "#6b7280", fontSize: "10px" } } },
        legend: { show: true, position: 'bottom', horizontalAlign: 'center', fontSize: '10px' },
        grid: { borderColor: "#f3f4f6", strokeDashArray: 4 },
        markers: { size: 4, colors: ['#fff'], strokeWidth: 2 }
      };
    }

    const cStats = this.vendorAnalytics.contract_status;
    if (cStats) {
      this.donutOptions = {
        series: cStats.series,
        chart: { type: "donut", height: 260 },
        labels: cStats.labels,
        plotOptions: { pie: { donut: { size: "75%" } } },
        colors: ['#10B981', '#F59E0B', '#F43F5E', '#94A3B8'],
        dataLabels: { enabled: false },
        legend: { show: false },
        stroke: { width: 0 }
      };
    }
  }
}
