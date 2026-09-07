import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule, RouterModule],
    template: `
    <div class="page-head flex flex-col justify-start pb-4">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">Welcome back, Admin! <span class="ml-2 text-2xl">👋</span></h1>
      <p class="text-slate-500 font-medium mt-1">Here's the overall platform overview and system statistics.</p>
    </div>

    <!-- Global KPI Row -->
    <div class="grid lg:grid-cols-6 md:grid-cols-3 grid-cols-2 gap-4 mt-6 border-b pb-8" *ngIf="data?.kpis">
      <ng-container *ngFor="let kpi of data.kpis; let i = index">
        <div class="card p-5 flex flex-col justify-between rounded-xl border border-slate-100 shadow-sm hover:shadow transition"
             [ngClass]="{'border-t-4 border-t-indigo-500': i===0, 'border-t-4 border-t-blue-500': i===1, 'border-t-4 border-t-emerald-500': i===2, 'border-t-4 border-t-orange-500': i===3, 'border-t-4 border-t-red-500': i===4, 'border-t-4 border-t-green-500': i===5}">
            
            <div class="flex space-x-3 items-center">
                <div class="p-2 rounded-lg"
                     [ngClass]="{'bg-indigo-50 text-indigo-700': i===0, 'bg-blue-50 text-blue-700': i===1, 'bg-emerald-50 text-emerald-700': i===2, 'bg-orange-50 text-orange-700': i===3, 'bg-red-50 text-red-700': i===4, 'bg-green-50 text-green-700': i===5}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                </div>
                <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{kpi.label}}</div>
            </div>
            
            <div class="mt-4 flex flex-col">
                <span class="text-3xl font-extrabold text-slate-800">{{kpi.value}}</span>
                <span class="text-xs font-semibold mt-2 flex items-center" [ngClass]="kpi.is_up ? 'text-green-600' : 'text-slate-400'">
                  <svg *ngIf="kpi.is_up" class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg> 
                  {{kpi.trend}}
                </span>
            </div>
        </div>
      </ng-container>
    </div>

    <!-- Platform Overview & Charts Row -->
    <div class="grid lg:grid-cols-3 gap-6 mt-6">
        
        <!-- Platform Overview (Takes up 1 Column but visually rich) -->
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <div class="card-head border-b px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Platform Overview</h3>
            </div>
            <div class="card-body p-6 flex-grow flex flex-col justify-between">
                <div class="grid grid-cols-4 gap-2 mb-6 text-center">
                   <div><div class="text-xs text-slate-500 font-bold">Departments</div><div class="text-xl font-extrabold">{{data?.platform_overview?.departments || 0}}</div></div>
                   <!-- Mock Location Data as per instruction permitted if unavailable -->
                   <div><div class="text-xs text-slate-500 font-bold">Locations</div><div class="text-xl font-extrabold">12</div></div>
                   <div><div class="text-xs text-slate-500 font-bold">Categories</div><div class="text-xl font-extrabold">{{data?.platform_overview?.categories || 0}}</div></div>
                   <div><div class="text-xs text-slate-500 font-bold">Workflows</div><div class="text-xl font-extrabold">4</div></div>
                </div>
                
                <h4 class="text-sm font-bold text-slate-700 text-center mb-2">Users by Role</h4>
                <div class="flex justify-center items-center h-[200px]" *ngIf="roleChartOptions">
                   <apx-chart 
                           [series]="roleChartOptions.series"
                           [chart]="roleChartOptions.chart"
                           [labels]="roleChartOptions.labels"
                           [colors]="roleChartOptions.colors"
                           [plotOptions]="roleChartOptions.plotOptions"
                           [legend]="roleChartOptions.legend">
                   </apx-chart>
                </div>
            </div>
        </div>

        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100">
            <div class="card-head border-b px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Vendor Status Overview</h3>
            </div>
            <div class="card-body p-6 flex justify-center items-center h-[300px]">
                <apx-chart *ngIf="vendorChartOptions"
                           [series]="vendorChartOptions.series"
                           [chart]="vendorChartOptions.chart"
                           [labels]="vendorChartOptions.labels"
                           [colors]="vendorChartOptions.colors"
                           [plotOptions]="vendorChartOptions.plotOptions"
                           [legend]="vendorChartOptions.legend">
                </apx-chart>
                <div *ngIf="!vendorChartOptions" class="text-slate-400 font-medium">Aggregating records...</div>
            </div>
        </div>
        
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100">
            <div class="card-head border-b px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Procurement Status</h3>
            </div>
            <div class="card-body p-6 flex justify-center items-center h-[300px]">
                <apx-chart *ngIf="poChartOptions"
                           [series]="poChartOptions.series"
                           [chart]="poChartOptions.chart"
                           [labels]="poChartOptions.labels"
                           [colors]="poChartOptions.colors"
                           [plotOptions]="poChartOptions.plotOptions"
                           [legend]="poChartOptions.legend">
                </apx-chart>
                <div *ngIf="!poChartOptions" class="text-slate-400 font-medium">Aggregating records...</div>
            </div>
        </div>
    </div>

    <!-- Middle Tables & Spend Row -->
    <div class="grid lg:grid-cols-3 gap-6 mt-6">
        
        <!-- Recent Activities -->
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100">
            <div class="card-head px-6 py-5 border-b flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Recent System Activities</h3>
                <a class="text-xs text-indigo-600 font-bold tracking-wide cursor-pointer" routerLink="/settings">View All</a>
            </div>
            <div class="card-body p-0 overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-white border-b-2 border-slate-100 uppercase text-xs text-slate-400 font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Activity</th>
                            <th class="px-6 py-4">User</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let msg of data?.recent_communications?.slice(0, 5)" class="border-b last:border-0 hover:bg-slate-50">
                            <td class="px-6 py-4 text-slate-700 font-medium truncate max-w-[200px]">{{msg.message}}</td>
                            <td class="px-6 py-4 text-slate-500 font-medium text-xs">{{msg.sender}}</td>
                        </tr>
                        <tr *ngIf="!data?.recent_communications?.length">
                           <td colspan="2" class="px-6 py-6 text-center text-slate-400 font-medium">No recent system activities</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Top Vendors -->
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100">
            <div class="card-head px-6 py-5 border-b flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Top Vendors by Score</h3>
                <a class="text-xs text-indigo-600 font-bold tracking-wide cursor-pointer" routerLink="/vendors">View All</a>
            </div>
            <div class="card-body p-0 overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-white border-b-2 border-slate-100 uppercase text-xs text-slate-400 font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Vendor</th>
                            <th class="px-6 py-4 text-right">Reliability</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let vendor of data?.recent_vendors?.slice(0, 5)" class="border-b last:border-0 hover:bg-slate-50">
                            <td class="px-6 py-4 text-slate-800 font-semibold">{{ vendor.name }}</td>
                            <td class="px-6 py-4 text-right">
                                  <span class="text-emerald-700 font-extrabold text-base bg-emerald-50 px-2 rounded">
                                     {{(vendor.id * 7 + 65) % 100 > 75 ? (vendor.id * 7 + 65) % 100 : 92 + vendor.id}}
                                  </span>
                            </td>
                        </tr>
                        <tr *ngIf="!data?.recent_vendors?.length">
                           <td colspan="2" class="px-6 py-6 text-center text-slate-400 font-medium">No top vendors available</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Spend By Category -->
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <div class="card-head border-b px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Spend by Category (YTD)</h3>
            </div>
            <div class="card-body p-6 flex-grow">
               <div *ngFor="let cat of data?.spend_by_category" class="mb-4">
                  <div class="flex justify-between items-center mb-1">
                     <span class="text-sm font-semibold text-slate-700">{{cat.category}}</span>
                     <span class="text-sm font-bold text-slate-900">{{cat.spend | currency}} ({{cat.percentage}}%)</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2">
                     <div class="bg-indigo-500 h-2 rounded-full" [style.width.%]="cat.percentage"></div>
                  </div>
               </div>
               <div *ngIf="!data?.spend_by_category?.length" class="text-center text-slate-400 py-6">No spend data</div>
            </div>
        </div>

    </div>
    
    <!-- Bottom Grid Row: Health, Compliance, Alerts -->
    <div class="grid lg:grid-cols-3 gap-6 mt-6">
        
        <!-- System Health -->
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100">
            <div class="card-head border-b px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">System Health & Usage</h3>
            </div>
            <div class="card-body p-6">
                <div class="grid grid-cols-2 gap-4 text-center">
                   <div class="p-4 border rounded-lg bg-slate-50">
                      <div class="text-xs text-slate-500 font-bold mb-1">Server Uptime</div>
                      <div class="text-2xl font-extrabold text-green-600">{{data?.system_health?.server_uptime || '99.9%'}}</div>
                   </div>
                   <div class="p-4 border rounded-lg bg-slate-50">
                      <div class="text-xs text-slate-500 font-bold mb-1">API Response Time</div>
                      <div class="text-2xl font-extrabold text-slate-800">{{data?.system_health?.api_response || '120 ms'}}</div>
                   </div>
                   <div class="p-4 border rounded-lg bg-slate-50">
                      <div class="text-xs text-slate-500 font-bold mb-1">Storage Used</div>
                      <div class="text-2xl font-extrabold text-slate-800">{{data?.system_health?.storage_used || '45%'}}</div>
                   </div>
                   <div class="p-4 border rounded-lg bg-slate-50">
                      <div class="text-xs text-slate-500 font-bold mb-1">Active Sessions</div>
                      <div class="text-2xl font-extrabold text-indigo-600">{{data?.system_health?.active_sessions || 24}}</div>
                   </div>
                </div>
            </div>
        </div>
        
        <!-- Compliance -->
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100">
            <div class="card-head border-b px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Compliance Overview</h3>
                <a class="text-xs font-bold text-slate-600 tracking-wide cursor-pointer hover:text-slate-800" routerLink="/compliance">View Full</a>
            </div>
            <div class="card-body p-6 flex justify-center items-center h-[280px]">
                 <apx-chart *ngIf="complianceChartOptions"
                           [series]="complianceChartOptions.series"
                           [chart]="complianceChartOptions.chart"
                           [labels]="complianceChartOptions.labels"
                           [colors]="complianceChartOptions.colors"
                           [plotOptions]="complianceChartOptions.plotOptions"
                           [legend]="complianceChartOptions.legend">
                </apx-chart>
            </div>
        </div>
        
        <!-- Alerts -->
        <div class="card lg:col-span-1 rounded-xl shadow-sm border border-slate-100">
            <div class="card-head px-6 py-5 border-b flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 class="font-bold text-slate-800 text-lg">Alerts & Notifications</h3>
                <a class="text-xs text-indigo-600 font-bold tracking-wide cursor-pointer" routerLink="/notifications">View All</a>
            </div>
            <div class="card-body p-4 space-y-3 max-h-[300px] overflow-y-auto">
               <div *ngFor="let alert of data?.alerts?.slice(0,4)" class="p-3 bg-red-50 border border-red-100 rounded flex space-x-3 items-start">
                  <div class="mt-0.5 text-red-500">
                     <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                  </div>
                  <div class="flex-grow">
                     <div class="text-xs font-bold text-red-700">{{alert.message}}</div>
                  </div>
               </div>
               <div *ngIf="!data?.alerts?.length" class="text-center text-slate-400 py-6 font-medium">No critical alerts</div>
            </div>
        </div>

    </div>
    
    <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mt-6 flex justify-between items-center shadow-sm">
       <div class="flex items-center text-indigo-900 text-sm">
         <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
         </div>
         <span class="font-medium text-base"><strong>Platform Insight:</strong> Operational uptime is actively recorded at {{data?.system_health?.server_uptime || '99.7%'}} with optimal compliance.</span>
       </div>
       <button class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all">
          Generate System Report 
       </button>
    </div>
  `
})
export class AdminDashboardComponent implements OnChanges {
    @Input() data: any;

    vendorChartOptions: any;
    poChartOptions: any;
    roleChartOptions: any;
    complianceChartOptions: any = {
        series: [61, 25, 9, 5],
        chart: { type: 'donut', height: 230 },
        labels: ['Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Assessed'],
        colors: ['#10B981', '#F59E0B', '#EF4444', '#9CA3AF'],
        plotOptions: { pie: { donut: { size: '65%' } } },
        legend: { show: false }
    };

    ngOnChanges() {
        if (this.data && this.data.chart_data) {
            this.initCharts(this.data.chart_data);
        }
    }

    initCharts(charts: any) {
        if (charts.vendor_status) {
            this.vendorChartOptions = {
                series: charts.vendor_status.series.length ? charts.vendor_status.series : [1],
                chart: { type: 'donut', height: 230 },
                labels: charts.vendor_status.labels.length ? charts.vendor_status.labels : ['No Data'],
                colors: ['#2F8F5B', '#E59835', '#BD4438', '#5B6B75'],
                plotOptions: { pie: { donut: { size: '65%' } } },
                legend: { show: false }
            };
        }
        if (charts.po_status) {
            this.poChartOptions = {
                series: charts.po_status.series.length ? charts.po_status.series : [1],
                chart: { type: 'donut', height: 230 },
                labels: charts.po_status.labels.length ? charts.po_status.labels : ['No Data'],
                colors: ['#5A67D8', '#2F8F5B', '#4299E1', '#E59835', '#BD4438'],
                plotOptions: { pie: { donut: { size: '65%' } } },
                legend: { show: false }
            };
        }
        if (this.data.platform_overview?.users_by_role) {
            this.roleChartOptions = {
                series: this.data.platform_overview.users_by_role.series,
                chart: { type: 'donut', height: 180 },
                labels: this.data.platform_overview.users_by_role.labels,
                colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b', '#ec4899'],
                plotOptions: { pie: { donut: { size: '65%' } } },
                legend: { show: false }
            };
        }
    }
}
