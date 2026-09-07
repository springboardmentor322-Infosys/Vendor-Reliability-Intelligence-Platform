import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Vendor Performance & Reliability</h1>
        <p>Evaluate quality ratings, issue resolutions and order completion rates across the ecosystem.</p>
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

    <!-- Top Supplier Performance -->
    <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col mt-6 mb-8" *ngIf="summary">
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
        <div *ngFor="let vendor of summary?.top_suppliers" class="grid grid-cols-12 text-xs items-center cursor-pointer hover:bg-gray-50">
          <div class="col-span-4 font-medium text-gray-800 truncate pr-2">{{vendor.vendor}}</div>
          <div class="col-span-3 text-center text-gray-600 font-bold">{{vendor.reliability_score}}/100</div>
          <div class="col-span-3 text-center text-teal-600 font-bold">{{vendor.on_time_delivery_pct}}%</div>
          <div class="col-span-2 text-right font-medium" 
              [ngClass]="{'text-red-500': vendor.risk_level==='High', 'text-amber-500': vendor.risk_level==='Medium', 'text-emerald-500': vendor.risk_level==='Low'}">
              {{vendor.risk_level}}
          </div>
        </div>
        <div *ngIf="!summary?.top_suppliers?.length" class="text-center text-sm text-gray-500 py-4">No vendor data found.</div>
      </div>
    </div>

    <div class="card mt-6">
      <div class="card-head bg-slate-50 border-b p-4">
        <h3 class="font-bold text-slate-800">Performance Index</h3>
      </div>
      <div class="card-body overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-white border-b-2 border-slate-100 uppercase text-xs text-slate-400 font-bold tracking-widest">
            <tr>
              <th class="px-6 py-4">Vendor Entity</th>
              <th class="px-6 py-4">Category</th>
              <th class="px-6 py-4 text-center">Score</th>
              <th class="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of vendors" class="border-b last:border-0 hover:bg-slate-50">
              <td class="px-6 py-4 font-semibold text-slate-800">{{v.vendor_name}}</td>
              <td class="px-6 py-4 text-slate-600">{{v.category || 'N/A'}}</td>
              <td class="px-6 py-4 text-center">
                 <span class="px-2 py-1 bg-indigo-50 text-indigo-700 font-extrabold rounded">
                    {{v.score}}%
                 </span>
              </td>
              <td class="px-6 py-4 text-right">
                  <span class="badge" [ngClass]="v.status === 'Excellent' ? 'green' : (v.status === 'Poor' ? 'red' : 'amber')">{{v.status}}</span>
              </td>
            </tr>
            <tr *ngIf="!vendors.length">
               <td colspan="4" class="px-6 py-8 text-center text-slate-400 font-medium">No vendors currently indexed for performance calculation.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class PerformanceComponent implements OnInit {
  vendors: any[] = [];
  summary: any = null;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    let activeRole = 'summary';
    const roleName = localStorage.getItem('role');
    if (roleName === 'Supply Chain Manager') activeRole = 'scm';
    else if (roleName === 'Procurement Manager') activeRole = 'pm';

    const activeAPI = ['scm', 'pm'].includes(activeRole) ? `analytics/dashboard/${activeRole}` : 'analytics/dashboard-summary';
    this.http.get<any>(`${environment.apiBaseUrl}/${activeAPI}`).subscribe(res => {
      this.summary = res;
      this.vendors = (res.top_suppliers || []).map((v: any) => ({
        ...v,
        vendor_name: v.vendor,
        score: v.reliability_score,
        status: v.risk_level === 'Low' ? 'Excellent' : (v.risk_level === 'High' ? 'Poor' : 'Average')
      }));
    });

    this.http.get<any[]>(`${environment.apiBaseUrl}/reliability/vendors-metrics`).subscribe(res => {
      this.vendors = res || [];
    }, err => {
      console.error('Failed to load performance metrics', err);
    });
  }
}
