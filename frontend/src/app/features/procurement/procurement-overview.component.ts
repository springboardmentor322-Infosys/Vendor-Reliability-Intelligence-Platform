import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-procurement-overview',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="page-head flex flex-col justify-start pb-4">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Procurement Overview</h1>
      <p class="text-slate-500 font-medium mt-1">Detailed analysis, trends, and tracking for all organizational procurement activities.</p>
    </div>
    
    <!-- Procurement KPI Cards -->
    <div class="grid lg:grid-cols-4 md:grid-cols-2 gap-4 mt-6">
       <div class="card p-5 border-l-4 border-l-slate-400">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Total PRs</div>
         <div class="text-3xl font-extrabold mt-2 text-slate-800">{{prs.length}}</div>
       </div>
       <div class="card p-5 border-l-4 border-l-amber-500">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending PRs</div>
         <div class="text-3xl font-extrabold mt-2 text-amber-600">{{getPrCount('Pending')}}</div>
       </div>
       <div class="card p-5 border-l-4 border-l-blue-500">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Total POs</div>
         <div class="text-3xl font-extrabold mt-2 text-slate-800">{{pos.length}}</div>
       </div>
       <div class="card p-5 border-l-4 border-l-emerald-500">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Spend</div>
         <div class="text-3xl font-extrabold mt-2 text-emerald-600">{{getTotalSpend() | currency}}</div>
       </div>
    </div>

    <!-- Analytics Charts Row -->
    <div class="grid lg:grid-cols-2 gap-6 mt-6">
        <!-- Status Chart -->
        <div class="card rounded-xl shadow-sm border border-slate-100">
            <div class="card-head px-6 py-4 border-b bg-slate-50/50">
                <h3 class="font-bold text-slate-800">Procurement Status Breakdown</h3>
            </div>
            <div class="card-body p-6 flex justify-center items-center h-[300px]">
                <apx-chart *ngIf="statusChartOptions"
                           [series]="statusChartOptions.series"
                           [chart]="statusChartOptions.chart"
                           [labels]="statusChartOptions.labels"
                           [colors]="statusChartOptions.colors"
                           [plotOptions]="statusChartOptions.plotOptions"
                           [legend]="statusChartOptions.legend">
                </apx-chart>
                <div *ngIf="!statusChartOptions" class="text-slate-400">Processing records...</div>
            </div>
        </div>

        <!-- Trend Chart -->
        <div class="card rounded-xl shadow-sm border border-slate-100">
            <div class="card-head px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 class="font-bold text-slate-800">Procurement Spend Trend</h3>
            </div>
            <div class="card-body p-6 flex justify-center items-center h-[300px]">
                <apx-chart *ngIf="trendChartOptions"
                           [series]="trendChartOptions.series"
                           [chart]="trendChartOptions.chart"
                           [xaxis]="trendChartOptions.xaxis"
                           [stroke]="trendChartOptions.stroke"
                           [colors]="trendChartOptions.colors">
                </apx-chart>
            </div>
        </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6 mt-6 border-t pt-6" *ngIf="vendorSummaries.length">
       <div class="card lg:col-span-2 rounded-xl border border-slate-100">
          <div class="card-head px-6 py-4 border-b bg-slate-50/50">
             <h3 class="font-bold text-slate-800">Vendor Procurement Summary</h3>
          </div>
          <div class="card-body p-0 overflow-x-auto">
              <table class="w-full text-left text-sm">
                  <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
                      <tr>
                          <th class="px-6 py-4">Vendor ID</th>
                          <th class="px-6 py-4 text-center">Total Orders (POs)</th>
                          <th class="px-6 py-4 text-right">Aggregated Spend</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr *ngFor="let summary of vendorSummaries" class="border-b last:border-0 hover:bg-slate-50">
                          <td class="px-6 py-4 font-semibold">Vendor #{{summary.vendorId}}</td>
                          <td class="px-6 py-4 text-center font-bold text-indigo-600">{{summary.orderCount}}</td>
                          <td class="px-6 py-4 text-right">{{summary.totalSpend | currency}}</td>
                      </tr>
                  </tbody>
              </table>
          </div>
       </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6 mt-6">
      <div class="card rounded-xl shadow-sm border border-slate-100">
        <div class="card-head px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 class="font-bold text-slate-800">Recent Procurement Requests</h3>
          <span class="text-xs font-bold text-indigo-600 cursor-pointer">Filter</span>
        </div>
        <div class="card-body overflow-x-auto p-0">
          <table class="w-full text-left text-sm" *ngIf="prs.length > 0; else noPrs">
            <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th class="px-6 py-3">Description</th>
                <th class="px-6 py-3">Department</th>
                <th class="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pr of prs" class="border-b last:border-0 hover:bg-slate-50">
                <td class="px-6 py-4 font-medium">{{pr.description || 'General Request'}}</td>
                <td class="px-6 py-4 text-slate-500">{{pr.department}}</td>
                <td class="px-6 py-4"><span class="badge" [ngClass]="pr.status === 'Approved' ? 'teal' : (pr.status === 'Pending' ? 'amber' : 'slate')">{{pr.status}}</span></td>
              </tr>
            </tbody>
          </table>
          <ng-template #noPrs><div class="p-8 text-center text-slate-400 font-medium border-t">No active procurement requests found.</div></ng-template>
        </div>
      </div>
      
      <div class="card rounded-xl shadow-sm border border-slate-100">
        <div class="card-head px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 class="font-bold text-slate-800">Active Purchase Orders</h3>
          <span class="text-xs font-bold text-indigo-600 cursor-pointer">Filter</span>
        </div>
        <div class="card-body overflow-x-auto p-0">
          <table class="w-full text-left text-sm whitespace-nowrap" *ngIf="pos.length > 0; else noPos">
            <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th class="px-6 py-3">PO Number</th>
                <th class="px-6 py-3">Vendor</th>
                <th class="px-6 py-3 text-right">Amount</th>
                <th class="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let po of pos" class="border-b last:border-0 hover:bg-slate-50">
                <td class="px-6 py-4 font-bold text-slate-700">{{po.po_number}}</td>
                <td class="px-6 py-4 text-slate-500 text-xs">Vendor #{{po.vendor_id}}</td>
                <td class="px-6 py-4 text-right font-semibold">{{po.amount | currency}}</td>
                <td class="px-6 py-4"><span class="badge" [ngClass]="['Delivered', 'Completed'].includes(po.status) ? 'green' : (po.status === 'Pending' ? 'amber' : 'slate')">{{po.status}}</span></td>
              </tr>
            </tbody>
          </table>
          <ng-template #noPos><div class="p-8 text-center text-slate-400 font-medium border-t">No purchase orders found.</div></ng-template>
        </div>
      </div>
    </div>
  `
})
export class ProcurementOverviewComponent implements OnInit {
  prs: any[] = [];
  pos: any[] = [];
  vendorSummaries: any[] = [];

  statusChartOptions: any;
  trendChartOptions: any;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/procurement/requests`).subscribe(res => {
      this.prs = res || [];
    });

    this.http.get<any[]>(`${environment.apiBaseUrl}/procurement/purchase-orders`).subscribe(res => {
      this.pos = res || [];
      this.buildCharts();
      this.buildVendorSummary();
    });
  }

  getPrCount(status: string) { return this.prs.filter(p => p.status === status).length; }
  getPoCount(status: string) { return this.pos.filter(p => p.status === status).length; }
  getTotalSpend() { return this.pos.reduce((acc, po) => acc + (po.amount || 0), 0); }

  buildCharts() {
    // Dynamic Status Chart based on actual loaded POs
    const statusCounts = this.pos.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(statusCounts).length ? Object.keys(statusCounts) : ['No Data'];
    const series = Object.values(statusCounts).length ? Object.values(statusCounts) : [1];

    this.statusChartOptions = {
      series: series as number[],
      chart: { type: 'donut', height: 260 },
      labels: labels,
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b'],
      plotOptions: { pie: { donut: { size: '70%' } } },
      legend: { position: 'bottom' }
    };

    // Mock Trend line since there's no timeseries API available for procurement dates natively
    this.trendChartOptions = {
      series: [{ name: "Spend", data: [4000, 15000, 22000, 9000, 28000, this.getTotalSpend()] }],
      chart: { type: 'line', height: 260, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#4f46e5'],
      xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Current'] }
    };
  }

  buildVendorSummary() {
    const vMap = new Map<number, any>();
    this.pos.forEach(po => {
      if (!vMap.has(po.vendor_id)) vMap.set(po.vendor_id, { vendorId: po.vendor_id, orderCount: 0, totalSpend: 0 });
      const ref = vMap.get(po.vendor_id);
      ref.orderCount++;
      ref.totalSpend += po.amount || 0;
    });
    this.vendorSummaries = Array.from(vMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }
}
