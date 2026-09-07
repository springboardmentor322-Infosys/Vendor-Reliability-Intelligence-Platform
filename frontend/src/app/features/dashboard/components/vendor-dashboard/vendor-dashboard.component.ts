import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div *ngIf="analytics" class="space-y-6">
      
      <!-- Top KPI Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <!-- Reliability Score -->
        <div class="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             </div>
             <div>
               <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Reliability Score</div>
             </div>
          </div>
          <div class="mt-4">
             <div class="text-3xl font-bold text-gray-900">{{analytics.kpis.reliability.value}} <span class="text-sm font-medium text-gray-400">/100</span></div>
             <div class="text-xs font-semibold text-green-600 mt-1">{{analytics.kpis.reliability.subtitle}}</div>
          </div>
        </div>

        <!-- Total Purchase Orders -->
        <div class="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
             </div>
             <div>
               <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Total Purchase Orders</div>
             </div>
          </div>
          <div class="mt-4">
             <div class="text-3xl font-bold text-gray-900">{{analytics.kpis.purchase_orders.value}}</div>
             <div class="text-xs font-semibold text-gray-400 mt-1">{{analytics.kpis.purchase_orders.subtitle}}</div>
          </div>
        </div>

        <!-- On-Time Delivery -->
        <div class="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 17l-5-5m0 0l5-5m-5 5h12"></path></svg>
             </div>
             <div>
               <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">On-Time Delivery</div>
             </div>
          </div>
          <div class="mt-4">
             <div class="text-3xl font-bold text-gray-900">{{analytics.kpis.on_time.value}}</div>
             <div class="text-xs font-semibold text-emerald-600 mt-1">{{analytics.kpis.on_time.subtitle}}</div>
          </div>
        </div>

        <!-- Quality Rating -->
        <div class="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
             </div>
             <div>
               <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Quality Rating</div>
             </div>
          </div>
          <div class="mt-4">
             <div class="text-3xl font-bold text-gray-900">{{analytics.kpis.quality.value}}</div>
             <div class="text-xs font-semibold text-green-600 mt-1">{{analytics.kpis.quality.subtitle}}</div>
          </div>
        </div>

        <!-- Total Invoiced -->
        <div class="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
             </div>
             <div>
               <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Total Invoiced</div>
             </div>
          </div>
          <div class="mt-4">
             <div class="text-3xl font-bold text-gray-900">{{analytics.kpis.invoiced.value}}</div>
             <div class="text-xs font-semibold text-gray-400 mt-1">{{analytics.kpis.invoiced.subtitle}}</div>
          </div>
        </div>

        <!-- Pending Payments -->
        <div class="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
             </div>
             <div>
               <div class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pending Payments</div>
             </div>
          </div>
          <div class="mt-4">
             <div class="text-3xl font-bold text-gray-900">{{analytics.kpis.pending_payments.value}}</div>
             <div class="text-xs font-semibold text-gray-400 mt-1">{{analytics.kpis.pending_payments.subtitle}}</div>
          </div>
        </div>
      </div>

      <!-- Main Dash Row 1: Gauge, Summary, POs -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Overall Reliability Score -->
        <div class="card h-[380px] flex flex-col relative">
          <div class="card-head">
            <h3>Overall Reliability Score</h3>
          </div>
          <div class="card-body flex-1 flex flex-col justify-center items-center -mt-6">
            <apx-chart *ngIf="gaugeOptions" class="w-full"
              [series]="gaugeOptions.series"
              [chart]="gaugeOptions.chart"
              [plotOptions]="gaugeOptions.plotOptions"
              [colors]="gaugeOptions.colors"
              [labels]="gaugeOptions.labels"
              [stroke]="gaugeOptions.stroke"
            ></apx-chart>
            <!-- Overlay Data -->
            <div class="absolute bottom-12 flex flex-col items-center">
              <div class="text-4xl font-bold text-gray-900">{{analytics.kpis.reliability.value}}<span class="text-xl text-gray-400 font-normal">/100</span></div>
              <div class="text-sm font-semibold text-green-600 mt-1">{{analytics.kpis.reliability.subtitle}}</div>
              <p class="text-[11px] text-gray-400 text-center px-8 mt-4 leading-relaxed">
                Your reliability score is based on delivery performance, quality, communication, compliance and service.
              </p>
            </div>
          </div>
        </div>

        <!-- Performance Summary -->
        <div class="card h-[380px] flex flex-col">
          <div class="card-head">
            <h3 class="flex items-center gap-2">Performance Summary <span class="text-xs text-gray-400 font-normal">(Last 90 Days) ⓘ</span></h3>
          </div>
          <div class="card-body flex-1 overflow-y-auto pr-2">
            <div class="space-y-6 pt-2">
               <div *ngFor="let item of analytics.performance_summary" class="flex items-center justify-between">
                  <div class="w-1/3 flex items-center gap-2">
                    <!-- Icon placeholder -->
                    <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path></svg></div>
                    <span class="text-xs font-semibold text-gray-600">{{item.label}}</span>
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

        <!-- Recent Purchase Orders -->
        <div class="card h-[380px] flex flex-col">
          <div class="card-head">
            <h3>Recent Purchase Orders</h3>
            <a href="javascript:void(0)" class="text-indigo-600 hover:text-indigo-800">View All</a>
          </div>
          <div class="card-body flex-1 overflow-y-auto px-0 pt-0">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="px-4 py-3 text-[10px] text-gray-400 font-semibold tracking-wider">PO Number</th>
                  <th class="px-4 py-3 text-[10px] text-gray-400 font-semibold tracking-wider">Item/Service</th>
                  <th class="px-4 py-3 text-[10px] text-gray-400 font-semibold tracking-wider text-center">Status</th>
                  <th class="px-4 py-3 text-[10px] text-gray-400 font-semibold tracking-wider text-right">Order Date</th>
                  <th class="px-4 py-3 text-[10px] text-gray-400 font-semibold tracking-wider text-right">Delivery Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let po of analytics.recent_pos" class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-xs font-mono font-medium text-gray-700">{{po.po}}</td>
                  <td class="px-4 py-3 text-xs text-gray-600">{{po.desc}}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold {{po.status_color}}">{{po.status}}</span>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-500 text-right">{{po.order_date}}</td>
                  <td class="px-4 py-3 text-xs text-gray-500 text-right">{{po.delivery_date}}</td>
                </tr>
              </tbody>
            </table>
            <div class="px-4 mt-3">
              <a href="javascript:void(0)" class="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1.5 rounded-md inline-block hover:bg-indigo-100 transition-colors">View All Purchase Orders &rarr;</a>
            </div>
          </div>
        </div>

      </div>

      <!-- Main Dash Row 2: Alerts, Notifications, Account Summary -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Contract Alerts -->
        <div class="card flex flex-col h-[280px]">
          <div class="card-head">
            <h3>Contract Alerts</h3>
          </div>
          <div class="card-body overflow-y-auto">
             <div class="space-y-4">
                <div *ngFor="let alert of analytics.contract_alerts" class="flex gap-4">
                   <div class="w-10 h-10 rounded-md bg-red-50 flex items-center justify-center flex-none">
                     <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                   </div>
                   <div>
                      <div class="text-[13px] font-semibold text-gray-800">{{alert.title}}</div>
                      <div class="text-[11px] text-gray-500 mt-1">{{alert.subtitle}}</div>
                   </div>
                </div>
             </div>
             <div class="mt-6">
                <a href="javascript:void(0)" class="text-xs text-indigo-600 font-semibold hover:underline">View All Alerts &rarr;</a>
             </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="card flex flex-col h-[280px]">
          <div class="card-head">
            <h3>Notifications</h3>
            <a href="javascript:void(0)" class="text-indigo-600 hover:text-indigo-800">View All</a>
          </div>
          <div class="card-body overflow-y-auto">
             <div class="space-y-4">
                <div *ngFor="let notif of analytics.notifications" class="flex justify-between items-start gap-4 pb-4 border-b border-gray-50">
                   <div class="flex gap-3 items-start">
                     <div class="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center flex-none mt-0.5">
                       <svg class="w-3 h-3 {{notif.icon_color}}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg>
                     </div>
                     <div class="text-xs text-gray-700 leading-snug pr-4">{{notif.title}}</div>
                   </div>
                   <div class="text-[10px] text-gray-400 whitespace-nowrap pt-1">{{notif.time}}</div>
                </div>
             </div>
          </div>
        </div>

        <!-- Account Summary -->
        <div class="card flex flex-col h-[280px]">
          <div class="card-head">
            <h3>Account Summary</h3>
          </div>
          <div class="card-body overflow-y-auto text-xs text-gray-600">
             <div class="space-y-4">
                <div class="flex justify-between items-center pb-3 border-b border-gray-50">
                   <div class="flex items-center gap-2 text-gray-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg> Vendor ID</div>
                   <div class="font-mono font-bold text-gray-800">{{analytics.account_summary.vendor_id}}</div>
                </div>
                <div class="flex justify-between items-center pb-3 border-b border-gray-50">
                   <div class="flex items-center gap-2 text-gray-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Vendor Since</div>
                   <div class="font-semibold text-gray-800">{{analytics.account_summary.vendor_since}}</div>
                </div>
                <div class="flex justify-between items-center pb-3 border-b border-gray-50">
                   <div class="flex items-center gap-2 text-gray-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> Primary Contact</div>
                   <div class="font-semibold text-gray-800">{{analytics.account_summary.primary_contact}}</div>
                </div>
                <div class="flex justify-between items-center pb-3 border-b border-gray-50">
                   <div class="flex items-center gap-2 text-gray-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg> Contact Email</div>
                   <div class="font-semibold text-gray-800">{{analytics.account_summary.contact_email}}</div>
                </div>
                <div class="flex justify-between items-center">
                   <div class="flex items-center gap-2 text-gray-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg> Contact Phone</div>
                   <div class="font-semibold text-gray-800">{{analytics.account_summary.contact_phone}}</div>
                </div>
             </div>
          </div>
        </div>

      </div>

      <!-- Main Dash Row 3: Trend, Status, Documents -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Performance Trend -->
        <div class="card flex flex-col h-[340px]">
          <div class="card-head">
            <h3>Performance Trend</h3>
            <div class="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-600 font-semibold cursor-pointer select-none">Last 6 Months &or;</div>
          </div>
          <div class="card-body overflow-hidden -mx-2 -mt-4">
             <apx-chart *ngIf="lineOptions" class="w-full"
               [series]="lineOptions.series"
               [chart]="lineOptions.chart"
               [xaxis]="lineOptions.xaxis"
               [dataLabels]="lineOptions.dataLabels"
               [colors]="lineOptions.colors"
               [stroke]="lineOptions.stroke"
               [markers]="lineOptions.markers"
               [legend]="lineOptions.legend"
               [grid]="lineOptions.grid"
             ></apx-chart>
          </div>
        </div>

        <!-- Contract Status -->
        <div class="card flex flex-col h-[340px]">
          <div class="card-head">
            <h3>Contract Status</h3>
          </div>
          <div class="card-body flex-1 flex items-center justify-between px-6 relative">
             <div class="w-1/2 -ml-6 relative">
                 <apx-chart *ngIf="donutOptions" class="w-full"
                   [series]="donutOptions.series"
                   [chart]="donutOptions.chart"
                   [labels]="donutOptions.labels"
                   [plotOptions]="donutOptions.plotOptions"
                   [colors]="donutOptions.colors"
                   [dataLabels]="donutOptions.dataLabels"
                   [legend]="donutOptions.legend"
                   [stroke]="donutOptions.stroke"
                 ></apx-chart>
                 <!-- Center Text Overlay -->
                 <div class="absolute inset-0 flex flex-col items-center justify-center top-3">
                    <div class="text-3xl font-bold text-gray-800">{{analytics.contract_status.total}}</div>
                    <div class="text-[10px] text-gray-400 font-semibold uppercase mt-1">Total Contracts</div>
                 </div>
             </div>
             <div class="w-1/2 -mr-6 space-y-4">
                 <div class="flex justify-between items-center text-xs">
                     <div class="flex items-center gap-2 text-gray-600 font-semibold"><div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Active</div>
                     <div class="font-bold text-gray-900">{{analytics.contract_status.series[0]}} <span class="font-normal text-gray-400 text-[10px] ml-1">{{(analytics.contract_status.series[0] / analytics.contract_status.total * 100) | number:'1.0-1'}}%</span></div>
                 </div>
                 <div class="flex justify-between items-center text-xs">
                     <div class="flex items-center gap-2 text-gray-600 font-semibold"><div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div> Expiring Soon</div>
                     <div class="font-bold text-gray-900">{{analytics.contract_status.series[1]}} <span class="font-normal text-gray-400 text-[10px] ml-1">{{(analytics.contract_status.series[1] / analytics.contract_status.total * 100) | number:'1.0-1'}}%</span></div>
                 </div>
                 <div class="flex justify-between items-center text-xs">
                     <div class="flex items-center gap-2 text-gray-600 font-semibold"><div class="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Expired</div>
                     <div class="font-bold text-gray-900">{{analytics.contract_status.series[2]}} <span class="font-normal text-gray-400 text-[10px] ml-1">{{(analytics.contract_status.series[2] / analytics.contract_status.total * 100) | number:'1.0-1'}}%</span></div>
                 </div>
                 <div class="flex justify-between items-center text-xs">
                     <div class="flex items-center gap-2 text-gray-600 font-semibold"><div class="w-2.5 h-2.5 rounded-full bg-slate-400"></div> Draft</div>
                     <div class="font-bold text-gray-900">{{analytics.contract_status.series[3]}} <span class="font-normal text-gray-400 text-[10px] ml-1">{{(analytics.contract_status.series[3] / analytics.contract_status.total * 100) | number:'1.0-1'}}%</span></div>
                 </div>
             </div>
          </div>
          <div class="pb-5 px-6">
             <a href="javascript:void(0)" class="text-xs text-indigo-600 font-semibold hover:underline">View All Contracts &rarr;</a>
          </div>
        </div>

        <!-- Important Documents -->
        <div class="card flex flex-col h-[340px]">
          <div class="card-head">
            <h3>Important Documents</h3>
            <a href="javascript:void(0)" class="text-indigo-600 hover:text-indigo-800">View All</a>
          </div>
          <div class="card-body overflow-y-auto">
             <div class="space-y-4">
                <div *ngFor="let doc of analytics.important_documents" class="flex items-center justify-between pb-3 border-b border-gray-50">
                    <div class="flex items-center gap-3">
                       <div class="w-8 h-8 rounded bg-gray-50 border border-gray-100 flex items-center justify-center {{doc.icon_color}}">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                       </div>
                       <div>
                          <div class="text-[12px] font-bold text-gray-800">{{doc.name}}</div>
                          <div class="text-[10px] text-gray-500">{{doc.date}}</div>
                       </div>
                    </div>
                    <div class="w-7 h-7 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer flex items-center justify-center transition-colors">
                       <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </div>
                </div>
             </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class VendorDashboardComponent implements OnInit, OnChanges {
  @Input() data: any;
  analytics: any;

  gaugeOptions: any;
  lineOptions: any;
  donutOptions: any;

  ngOnInit() {
    this.initCharts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      // Extract vendor response wrapper (has kpis, etc)
      // Notice dashboard component passes data=dashboardData, which is the response dict for vendor
      this.analytics = this.data.analytics || this.data;
      this.initCharts();
    }
  }

  initCharts() {
    if (!this.analytics) return;

    let score = this.analytics.kpis?.reliability?.value || 0;

    // 1. GAUGE CHART
    this.gaugeOptions = {
      series: [score],
      chart: { type: "radialBar", height: 320, sparkline: { enabled: true } },
      plotOptions: {
        radialBar: {
          startAngle: -120,
          endAngle: 120,
          hollow: { size: "65%" },
          track: { background: "#e5e7eb", strokeWidth: "100%", margin: 5 },
          dataLabels: { show: false } // Custom HTML handles label
        }
      },
      colors: score >= 80 ? ['#10B981'] : score >= 60 ? ['#F59E0B'] : ['#EF4444'],
      stroke: { lineCap: "round" }
    };

    // 2. LINE CHART
    const trend = this.analytics.performance_trend;
    this.lineOptions = {
      series: trend.series,
      chart: { type: "line", height: 260, toolbar: { show: false }, zoom: { enabled: false } },
      colors: ['#10B981', '#8B5CF6', '#3B82F6'],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      xaxis: {
        categories: trend.categories,
        labels: { style: { colors: "#6b7280", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      legend: { show: true, position: 'bottom', horizontalAlign: 'center', fontSize: '10px', markers: { radius: 12, offsetX: -2 } },
      grid: { borderColor: "#f3f4f6", strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
      markers: { size: 4, colors: ['#fff'], strokeColors: ['#10B981', '#8B5CF6', '#3B82F6'], strokeWidth: 2 }
    };

    // 3. DONUT CHART
    const cStats = this.analytics.contract_status;
    this.donutOptions = {
      series: cStats.series,
      chart: { type: "donut", height: 260 },
      labels: cStats.labels,
      colors: ['#10B981', '#F59E0B', '#F43F5E', '#94A3B8'],
      plotOptions: { donut: { size: '75%' } },
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { show: false }
    };

  }
}
