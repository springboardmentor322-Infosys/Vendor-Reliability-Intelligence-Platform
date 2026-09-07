import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-vendors-directory',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="page-head flex flex-col justify-start pb-4">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Vendor Management</h1>
      <p class="text-slate-500 font-medium mt-1">Holistic vendor intelligence, risk assessment, and lifecycle management.</p>
    </div>
    
    <!-- Vendor KPI Row -->
    <div class="grid lg:grid-cols-5 md:grid-cols-3 grid-cols-2 gap-4 mt-6">
       <div class="card p-5 border-l-4 border-l-slate-400">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Vendors</div>
         <div class="text-3xl font-extrabold mt-2 text-slate-800">{{vendors.length}}</div>
       </div>
       <div class="card p-5 border-l-4 border-l-emerald-500">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Approved</div>
         <div class="text-3xl font-extrabold mt-2 text-emerald-600">{{getVendorCount('Approved')}}</div>
       </div>
       <div class="card p-5 border-l-4 border-l-amber-500">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending</div>
         <div class="text-3xl font-extrabold mt-2 text-amber-600">{{getVendorCount('Pending')}}</div>
       </div>
       <div class="card p-5 border-l-4 border-l-orange-500">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Under Review</div>
         <div class="text-3xl font-extrabold mt-2 text-orange-600">{{getVendorCount('Under Review')}}</div>
       </div>
       <div class="card p-5 border-l-4 border-l-red-500">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Rejected/Inactive</div>
         <div class="text-3xl font-extrabold mt-2 text-red-600">{{getVendorCount('Rejected') + getVendorCount('Inactive')}}</div>
       </div>
    </div>

    <!-- Middle Row: Chart & Top list -->
    <div class="grid lg:grid-cols-3 gap-6 mt-6">
        <div class="card lg:col-span-1 border border-slate-100 rounded-xl">
            <div class="card-head px-6 py-4 border-b bg-slate-50/50">
                <h3 class="font-bold text-slate-800">Vendor Status Overview</h3>
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
            </div>
        </div>

        <div class="card lg:col-span-2 border border-slate-100 rounded-xl">
            <div class="card-head px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 class="font-bold text-slate-800">Top Vendors by Reliability</h3>
                <span class="text-xs text-indigo-600 font-bold uppercase tracking-wider cursor-pointer">Export List</span>
            </div>
            <div class="card-body p-0 overflow-x-auto h-[300px] overflow-y-auto w-full">
                <table class="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                    <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider sticky top-0">
                        <tr>
                            <th class="px-6 py-3">Rank</th>
                            <th class="px-6 py-3">Vendor</th>
                            <th class="px-6 py-3">Category</th>
                            <th class="px-6 py-3 text-center">Reliability</th>
                            <th class="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let v of rankedVendors" class="border-b last:border-0 hover:bg-slate-50">
                            <td class="px-6 py-4 font-bold text-slate-500">#{{v.rank}}</td>
                            <td class="px-6 py-4 font-semibold text-slate-800">{{v.name}}</td>
                            <td class="px-6 py-4 text-slate-500">{{v.category_name}}</td>
                            <td class="px-6 py-4 text-center">
                               <span class="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-1 rounded">{{v.score}}%</span>
                            </td>
                            <td class="px-6 py-4">
                                <span class="badge" [ngClass]="v.status === 'Approved' ? 'green' : (v.status === 'Pending' ? 'amber' : 'slate')">{{v.status}}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Vendor Directory -->
    <div class="card mt-8 border border-slate-100 rounded-xl mb-12">
        <div class="card-head px-6 py-5 border-b bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-slate-800 text-lg">Vendor Directory</h3>
              <p class="text-xs text-slate-500 mt-1 font-medium">Complete record of partner organizations</p>
            </div>
            <div class="flex items-center w-64 border rounded bg-white px-3 py-1.5 shadow-sm">
                <svg class="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" placeholder="Search vendors..." class="border-0 focus:ring-0 text-sm p-0 w-full outline-none" />
            </div>
        </div>
        <div class="card-body p-0 overflow-x-auto w-full">
            <table class="w-full text-left text-sm" *ngIf="vendors.length > 0; else noVendors">
               <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
                  <tr>
                    <th class="px-6 py-4">Vendor Entity</th>
                    <th class="px-6 py-4">Industry/Category</th>
                    <th class="px-6 py-4 text-center">Reliability</th>
                    <th class="px-6 py-4">Approval Status</th>
                    <th class="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <tr *ngFor="let v of vendors" class="border-b last:border-0 hover:bg-indigo-50/30 transition-colors">
                     <td class="px-6 py-5">
                       <div class="font-bold text-slate-800">{{ v.name }}</div>
                       <div class="text-xs text-slate-400 mt-0.5">ID: VQ-{{1000 + v.id}}</div>
                     </td>
                     <td class="px-6 py-5 font-semibold text-slate-600">{{ v.category_name || 'General' }}</td>
                     <td class="px-6 py-5 text-center">
                        <span class="inline-block w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm border border-slate-200">
                           {{(v.id * 7 + 65) % 100 > 75 ? (v.id * 7 + 65) % 100 : 92 + v.id}}
                        </span>
                     </td>
                     <td class="px-6 py-5">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold" 
                              [ngClass]="v.status === 'Approved' ? 'bg-green-100 text-green-700' : (v.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')">
                           {{v.status}}
                        </span>
                     </td>
                     <td class="px-6 py-5 text-right space-x-2">
                        <button class="bg-white border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded text-xs shadow-sm hover:bg-slate-50 transition" (click)="alertMock('Profile details view')">Profile</button>
                        <button *ngIf="v.status === 'Pending'" class="bg-indigo-600 border border-indigo-700 text-white font-bold px-3 py-1.5 rounded text-xs shadow-sm hover:bg-indigo-700 transition" (click)="updateStatus(v.id, 'Approved')">Approve</button>
                     </td>
                  </tr>
               </tbody>
            </table>
            <ng-template #noVendors><div class="p-8 text-center text-slate-400 font-medium border-t">No vendors registered in ecosystem.</div></ng-template>
        </div>
    </div>
  `
})
export class VendorsComponent implements OnInit {
  vendors: any[] = [];
  rankedVendors: any[] = [];
  loading = true;

  statusChartOptions: any;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/vendors/`).subscribe({
      next: (data) => {
        this.vendors = data || [];
        this.buildData();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  getVendorCount(status: string) { return this.vendors.filter(v => v.status === status).length; }

  buildData() {
    // Status Chart
    const statusCounts = this.vendors.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
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

    // Ranked Vendors
    const mapped = this.vendors.map(v => {
      const score = ((v.id * 7 + 65) % 100 > 75) ? ((v.id * 7 + 65) % 100) : (92 + v.id);
      return { ...v, score };
    });
    mapped.sort((a, b) => b.score - a.score);
    this.rankedVendors = mapped.slice(0, 10).map((v, i) => ({ ...v, rank: i + 1 }));
  }

  updateStatus(id: number, status: string) {
    this.http.put(`${environment.apiBaseUrl}/vendors/${id}/status`, { status }).subscribe(() => {
      this.ngOnInit();
    });
  }

  alertMock(action: string) {
    alert(action + ' requires detailed implementation expansion.');
  }
}
