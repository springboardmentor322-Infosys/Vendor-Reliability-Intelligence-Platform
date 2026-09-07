import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-spend-analysis',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="page-head pb-4 border-b border-gray-200">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Budget & Spend Analysis</h1>
        <p class="text-sm text-gray-500 mt-1">Granular breakdown of procurement spending and budget utilization.</p>
      </div>
    </div>
    
    <div *ngIf="analyticsData" class="mt-6">
      
      <!-- KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         <div class="bg-white p-5 shadow-sm border border-gray-100 rounded-xl flex items-center shadow-lg">
            <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center text-xl mr-4">💰</div>
            <div>
               <div class="text-xs text-gray-500 font-semibold uppercase">Total Spend (YTD)</div>
               <div class="text-2xl font-bold">{{analyticsData.stats.total_spend.value}}</div>
            </div>
         </div>
         <div class="bg-white p-5 shadow-sm border border-gray-100 rounded-xl flex items-center shadow-lg">
            <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex justify-center items-center text-xl mr-4">📈</div>
            <div>
               <div class="text-xs text-gray-500 font-semibold uppercase">Projected Annual Run Rate</div>
               <div class="text-2xl font-bold">{{analyticsData.budget?.total_budget | currency:'INR'}}</div>
            </div>
         </div>
         <div class="bg-white p-5 shadow-sm border border-gray-100 rounded-xl flex items-center shadow-lg">
            <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex justify-center items-center text-xl mr-4">⏱️</div>
            <div>
               <div class="text-xs text-gray-500 font-semibold uppercase">Remaining vs Projection</div>
               <div class="text-2xl font-bold">{{analyticsData.budget?.remaining | currency:'INR'}}</div>
            </div>
         </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <!-- Spend Trend -->
         <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5" *ngIf="spendChart">
            <h3 class="font-bold text-gray-800 mb-4">Monthly Spend Trend</h3>
            <apx-chart
              [series]="spendChart.series"
              [chart]="spendChart.chart"
              [stroke]="spendChart.stroke"
              [colors]="spendChart.colors"
              [xaxis]="spendChart.xaxis"
              [dataLabels]="{enabled:false}">
            </apx-chart>
         </div>

         <!-- Spend by Category -->
         <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5" *ngIf="categoryChart">
            <h3 class="font-bold text-gray-800 mb-4">Spend By Category</h3>
            <div class="flex justify-center items-center h-64">
                <apx-chart
                  [series]="categoryChart.series"
                  [chart]="categoryChart.chart"
                  [labels]="categoryChart.labels"
                  [colors]="categoryChart.colors"
                  [plotOptions]="categoryChart.plotOptions"
                  [legend]="categoryChart.legend"
                  [dataLabels]="{enabled:false}">
                </apx-chart>
            </div>
         </div>
      </div>
      
    </div>
    
  `
})
export class SpendAnalysisComponent implements OnInit {
  analyticsData: any;
  spendChart: any;
  categoryChart: any;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: any) => {
      if (user) {
        const roleMap: any = { 'Administrator': 'admin', 'Procurement Manager': 'pm', 'Vendor': 'vendor' };
        const currentRoleKey = roleMap[user.role?.name || 'Administrator'] || 'admin';

        this.dashboardService.getRoleDashboard(currentRoleKey).subscribe((data: any) => {
          this.analyticsData = data.analytics || data;
          this.initCharts();
        });
      }
    });
  }

  initCharts() {
    const monthly = this.analyticsData.monthly_spend || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.spendChart = {
      series: [{ name: "Spend", data: monthly }],
      chart: { type: "area", height: 280, toolbar: { show: false } },
      stroke: { curve: "smooth", width: 3 },
      colors: ["#3b82f6"],
      xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }
    };

    const catData = this.analyticsData.category_spend || [];
    const catLabels = catData.length ? catData.map((c: any) => c.category) : ['No Data'];
    const catSeries = catData.length ? catData.map((c: any) => c.amount) : [1];

    this.categoryChart = {
      series: catSeries,
      labels: catLabels,
      chart: { type: 'donut', height: 280 },
      colors: ['#047857', '#0ea5e9', '#8b5cf6', '#f43f5e', '#f59e0b', '#64748b'],
      legend: { position: 'bottom', fontSize: '11px' },
      plotOptions: { pie: { donut: { size: '65%' } } }
    };
  }
}
