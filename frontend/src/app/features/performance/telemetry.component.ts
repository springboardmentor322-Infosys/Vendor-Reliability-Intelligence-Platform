import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-risk-reliability-delivery',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="page-head pb-4 border-b border-gray-200">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Reliability & Risk Assessment</h1>
        <p class="text-sm text-gray-500 mt-1">Cross-functional metrics evaluating vendor capabilities, high-risk detection, and automated mitigation recommendations.</p>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 mb-8" *ngIf="analyticsData">
       <!-- Supply Chain Risk Overview Chart -->
       <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
         <div class="flex justify-between items-center mb-4">
           <h3 class="font-bold text-gray-800">Supply Chain Risk Overview</h3>
           <span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase">Real-Time</span>
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
           <div *ngIf="!riskChart?.series?.length" class="text-gray-400">Aggregating Risk Signals...</div>
         </div>
       </div>

       <!-- Top Supplier Performance -->
       <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5 flex flex-col">
         <div class="flex justify-between items-center mb-4">
           <h3 class="font-bold text-gray-800">Top Supplier Performance</h3>
           <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">Live Stats</span>
         </div>
         <div class="space-y-4 flex-1">
           <div class="grid grid-cols-12 text-[10px] font-semibold text-gray-400 uppercase pb-2 border-b">
             <div class="col-span-4">Vendor</div>
             <div class="col-span-3 text-center">Score</div>
             <div class="col-span-3 text-center">On-Time</div>
             <div class="col-span-2 text-right">Risk</div>
           </div>
           <div *ngFor="let v of analyticsData?.top_suppliers" class="grid grid-cols-12 text-xs items-center cursor-pointer hover:bg-gray-50">
             <div class="col-span-4 font-medium text-gray-800 truncate pr-2">{{v.vendor}}</div>
             <div class="col-span-3 text-center text-gray-600 font-bold">{{v.reliability_score}}/100</div>
             <div class="col-span-3 text-center text-teal-600 font-bold">{{v.on_time_delivery_pct}}%</div>
             <div class="col-span-2 text-right font-medium" 
                 [ngClass]="{'text-red-500': v.risk_level==='High', 'text-amber-500': v.risk_level==='Medium', 'text-emerald-500': v.risk_level==='Low'}">
                 {{v.risk_level}}
             </div>
           </div>
           <div *ngIf="!analyticsData?.top_suppliers?.length" class="text-center text-sm text-gray-500 py-4">No vendor data found.</div>
         </div>
       </div>
    </div>

    <div class="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
       <!-- Vendor Risk Cards -->
       <div *ngFor="let vendor of getRankedVendors()" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition">
           <div class="flex justify-between items-start mb-4">
              <div>
                  <h3 class="font-extrabold text-gray-800 text-lg">{{vendor.vendor_name}}</h3>
                  <div class="text-xs text-gray-500">{{vendor.category || 'General Supplier'}}</div>
              </div>
              <span class="px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-widest"
                    [ngClass]="getRiskLevel(vendor) === 'High' ? 'bg-red-100 text-red-700' : (getRiskLevel(vendor) === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')">
                  {{getRiskLevel(vendor)}} RISK
              </span>
           </div>
           
           <div class="mt-4 grid grid-cols-2 gap-4 border-t border-b border-gray-50 py-4">
               <div>
                   <div class="text-[10px] text-gray-400 font-semibold uppercase">Reliability Score</div>
                   <div class="text-2xl font-bold text-gray-800">{{getScore(vendor)}}/100</div>
               </div>
               <div>
                   <div class="text-[10px] text-gray-400 font-semibold uppercase">Delivery Defect Rate</div>
                   <div class="text-2xl font-bold text-gray-800">{{getDefectRate(vendor)}}%</div>
               </div>
           </div>
           
           <div class="mt-4 flex-1">
               <div class="text-xs font-bold text-gray-700 mb-2">Automated Recommendation</div>
               <div class="text-xs text-gray-600 bg-gray-50 rounded p-3 border border-gray-100 shadow-inner">
                   <div class="flex gap-2">
                      <span class="text-lg leading-none" [ngClass]="getRiskLevel(vendor) === 'High' ? 'text-red-500' : 'text-blue-500'">
                          {{getRiskLevel(vendor) === 'High' ? '⚠️' : '💡'}}
                      </span>
                      <p class="leading-relaxed">{{getRecommendation(vendor)}}</p>
                   </div>
               </div>
           </div>
       </div>
    </div>
    
    <div class="mt-8 text-center text-gray-500" *ngIf="!vendors.length && !loading">
       <p>No vendor ecosystem data available for risk profiling.</p>
    </div>
  `
})
export class AdvancedTelemetryComponent implements OnInit {
  vendors: any[] = [];
  analyticsData: any = null;
  riskChart: any = null;
  loading = true;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    let activeRole = 'summary';
    const roleName = localStorage.getItem('role');
    if (roleName === 'Supply Chain Manager') activeRole = 'scm';
    else if (roleName === 'Procurement Manager') activeRole = 'pm';

    const activeAPI = ['scm', 'pm'].includes(activeRole) ? `analytics/dashboard/${activeRole}` : 'analytics/dashboard-summary';
    this.http.get<any>(`${environment.apiBaseUrl}/${activeAPI}`).subscribe(res => {
      this.analyticsData = res;
      this.vendors = (res.top_suppliers || []).map((v: any) => ({
        ...v,
        vendor_name: v.vendor,
        score: v.reliability_score,
        risk_level: v.risk_level,
        defect_rate: 100 - (v.on_time_delivery_pct || 100)
      }));
      if (res.risk_overview) {
        this.riskChart = {
          series: res.risk_overview.map((r: any) => r.count),
          chart: { type: 'donut', height: 250 },
          labels: res.risk_overview.map((r: any) => r.risk),
          colors: ['#3b82f6', '#f59e0b', '#ef4444'],
          plotOptions: { pie: { donut: { size: '75%' } } },
          legend: { position: 'bottom' }
        };
      }
    });

    this.http.get<any[]>(`${environment.apiBaseUrl}/reliability/vendors-metrics`).subscribe(res => {
      // Retaining this for secondary states if any, but using SCM dataset above
      this.loading = false;
    }, err => {
      console.error(err);
      this.loading = false;
    });
  }

  getScore(vendor: any) { return vendor.score || 0; }
  getDefectRate(vendor: any) { return vendor.defect_rate || 0; }

  getRiskLevel(vendor: any) {
    return vendor.risk_level || 'Low';
  }

  getRecommendation(vendor: any) {
    const risk = this.getRiskLevel(vendor);
    if (risk === 'High') return 'Immediate review required. Excessive delivery defects and low overall reliability detected. Consider executing a compliance audit or freezing new contract allocations.';
    if (risk === 'Medium') return 'Performance is acceptable but trending towards caution thresholds. Monitor SLA agreements closely on upcoming logistics assignments.';
    return 'Vendor maintains excellent compliance and structural integrity. Recommended for priority contract renewals and continuous strategic sourcing.';
  }

  getRankedVendors() {
    return [...this.vendors].sort((a, b) => this.getScore(a) - this.getScore(b));
  }
}
