import os

content = r'''import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-auditor-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, RouterModule],
  providers: [CurrencyPipe],
  template: 
    <div class="p-6 max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
           <h2 class="text-2xl font-bold text-gray-900">Welcome back, Auditor! 👏</h2>
           <p class="text-sm text-gray-500 mt-1">Audit, compliance and operational control overview.</p>
        </div>
        <div class="flex items-center space-x-4">
            <button class="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700">Audit Export ▾</button>
            <div class="bg-white border rounded-lg p-2 text-gray-500 cursor-pointer relative">
                <span class="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">3</span>
                🔔
            </div>
            <div class="bg-white border rounded-lg p-2 text-gray-500 cursor-pointer relative">
                ✉️
            </div>
            <div class="bg-white border rounded-lg px-3 py-2 text-sm text-gray-600 font-medium">
                📅 Sep 07, 2026
            </div>
            <div class="flex items-center space-x-2">
                <div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">LH</div>
                <span class="text-sm font-medium text-gray-700">Layla Haddad ▾</span>
            </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <div *ngFor="let k of kpis" class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow" [routerLink]="k.link">
            <div class="flex items-start justify-between">
                <div>
                   <div class="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wide">{{k.label}}</div>
                   <div class="text-2xl font-bold" [ngClass]="k.color">{{k.value}}</div>
                </div>
                <div class="bg-indigo-50 p-2 rounded-lg opacity-80" [innerHTML]="k.icon"></div>
            </div>
            <div class="text-xs mt-3 flex items-center text-gray-500">
               <span class="font-medium mr-1">{{k.sub}}</span>
            </div>
        </div>
      </div>

      <!-- Main Row 1 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Audit Coverage (Donut) -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 class="font-bold text-gray-800 mb-4">Audit / Transaction Coverage</h3>
            <div *ngIf="loading" class="animate-pulse h-48 bg-gray-100 rounded"></div>
            <div *ngIf="!loading && coverageChart" class="relative">
               <apx-chart 
                  [series]="coverageChart.series" 
                  [chart]="coverageChart.chart" 
                  [labels]="coverageChart.labels"
                  [colors]="coverageChart.colors"
                  [plotOptions]="coverageChart.plotOptions"
                  [legend]="coverageChart.legend">
               </apx-chart>
            </div>
            <div class="mt-4 text-center">
                <a routerLink="/audit-overview" class="text-blue-600 hover:underline text-sm font-medium">View Detailed Coverage →</a>
            </div>
        </div>

        <!-- Compliance Trend (Line) -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 col-span-1 lg:col-span-1">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-gray-800">Compliance & Exceptions</h3>
                <span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">This Year ▾</span>
            </div>
            <div *ngIf="loading" class="animate-pulse h-48 bg-gray-100 rounded"></div>
            <div *ngIf="!loading && trendChart" class="h-64">
               <apx-chart 
                  [series]="trendChart.series" 
                  [chart]="trendChart.chart"
                  [colors]="trendChart.colors"
                  [xaxis]="trendChart.xaxis"
                  [stroke]="trendChart.stroke">
               </apx-chart>
            </div>
        </div>

        <!-- Top Risk Areas -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-0 overflow-hidden">
             <div class="p-5 border-b flex justify-between items-center">
                <h3 class="font-bold text-gray-800">Top Risk / Exception Areas</h3>
                <a routerLink="/risk-controls" class="text-blue-600 text-xs font-medium hover:underline">View All</a>
             </div>
             <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr><th class="px-4 py-2">Area</th><th class="px-4 py-2">Exceptions</th><th class="px-4 py-2">Risk</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr *ngFor="let r of data?.top_risk_areas" class="hover:bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-800">{{r.area}}</td>
                        <td class="px-4 py-3 font-semibold text-red-600">{{r.exceptions}}</td>
                        <td class="px-4 py-3">
                           <span class="px-2 py-1 text-xs rounded-full font-bold" [ngClass]="r.risk === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">{{r.risk}}</span>
                        </td>
                    </tr>
                </tbody>
             </table>
        </div>
      </div>

      <!-- Main Row 2 (Audits + Action Center) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <!-- Recent Audit Logs -->
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2 overflow-hidden">
             <div class="p-5 border-b flex justify-between items-center">
                <h3 class="font-bold text-gray-800">Recent Audit Activity</h3>
                <a routerLink="/audit-logs" class="text-blue-600 text-xs font-medium hover:underline">View Log Explorer →</a>
             </div>
             <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr><th class="px-4 py-2">User</th><th class="px-4 py-2">Action</th><th class="px-4 py-2">Entity</th><th class="px-4 py-2">Result</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr *ngFor="let log of data?.recent_activity" class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-gray-600">{{log.user}}</td>
                        <td class="px-4 py-3 font-medium text-gray-800">{{log.action}}</td>
                        <td class="px-4 py-3 text-gray-500">{{log.entity || "System"}} <span *ngIf="log.entity_id">#{{log.entity_id}}</span></td>
                        <td class="px-4 py-3">
                            <span class="text-xs px-2 py-1 rounded font-semibold" [ngClass]="log.result === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">{{log.result}}</span>
                        </td>
                    </tr>
                </tbody>
             </table>
          </div>

          <!-- Critical Reviews -->
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
             <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-gray-800">Critical / Upcoming Reviews</h3>
             </div>
             <div class="space-y-4">
                 <div *ngFor="let c of data?.critical_reviews" class="flex justify-between items-center p-3 rounded-lg border border-amber-100 bg-amber-50">
                    <div class="flex items-center space-x-3">
                        <div class="text-xl">⚠️</div>
                        <div>
                            <div class="font-bold text-gray-800 text-sm">{{c.title}}</div>
                            <div class="text-xs text-gray-500">{{c.type}}</div>
                        </div>
                    </div>
                    <div class="text-lg font-bold text-amber-700">{{c.count}}</div>
                 </div>
             </div>
          </div>
      </div>
      
      <!-- Bottom Insight -->
      <div *ngIf="data?.insight_text" class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between text-indigo-900 shadow-sm">
         <div class="flex items-center space-x-3">
            <span class="text-xl">💡</span>
            <span class="font-medium text-sm"><b>Audit Insight:</b> {{data.insight_text}}</span>
         </div>
         <a routerLink="/exception-reports" class="bg-white px-4 py-1 text-sm rounded border border-indigo-200 font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">Resolve Exceptions →</a>
      </div>

    </div>
  
})
export class AuditorDashboardComponent implements OnInit {
  data: any = null;
  loading = true;
  kpis: any[] = [];
  coverageChart: any = null;
  trendChart: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>('http://localhost:8000/analytics/dashboard/auditor').subscribe({
        next: (resp) => {
            this.data = resp;
            this.buildKpis();
            this.buildCharts();
            this.loading = false;
        },
        error: (err) => {
            console.error(err);
            this.loading = false;
        }
    });
  }

  buildKpis() {
      const k = this.data.kpis;
      if (!k) return;
      this.kpis = [
          { label: 'Auditable Records', value: k.total_auditable, color: 'text-indigo-700', sub: 'Total mapped objects', link: "/audit-overview", icon: "📑" },
          { label: 'Audit Coverage', value: k.audit_coverage + '%', color: 'text-blue-700', sub: 'Est coverage rate', link: "/audit-overview", icon: "🔍" },
          { label: 'Compliance Rate', value: k.compliance_rate + '%', color: 'text-emerald-700', sub: 'Calculated compliant', link: "/compliance-reports", icon: "✅" },
          { label: 'Open Exceptions', value: k.open_exceptions, color: 'text-red-600', sub: 'Requires investigation', link: "/exception-reports", icon: "⚠️" },
          { label: 'High Risk Vendors', value: k.high_risk_vendors, color: 'text-amber-600', sub: 'Risk score < 60', link: "/vendor-audit", icon: "🏢" },
          { label: 'Critical Reviews', value: k.critical_reviews, color: 'text-red-700', sub: 'Overdue control logs', link: "/risk-controls", icon: "🚨" },
      ];
  }

  buildCharts() {
      if(!this.data) return;
      
      const cov = this.data.coverage || [];
      this.coverageChart = {
          series: cov.map((c: any) => c.count),
          labels: cov.map((c: any) => c.category),
          chart: { type: 'donut', height: 250, sparkline: { enabled: true } },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
          legend: { show: true, position: 'right' },
          plotOptions: { pie: { donut: { size: '65%' } } }
      };
      
      const trend = this.data.compliance_trend || [];
      this.trendChart = {
          series: [
              { name: 'Compliance %', type: 'area', data: trend.map((t: any) => t.compliance) },
              { name: 'Exceptions', type: 'line', data: trend.map((t: any) => t.exceptions) }
          ],
          chart: { type: 'line', height: 250, toolbar: { show: false } },
          stroke: { curve: 'smooth', width: [0, 3] },
          colors: ['#6366f1', '#ef4444'],
          xaxis: { categories: trend.map((t: any) => t.month) }
      };
  }
}
'''
with open(r'd:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit\auditor-dashboard.component.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Dashboard completely rewritten with real intelligence.")
