import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-procurement-audit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgApexchartsModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './procurement-audit.component.html'
})
export class ProcurementAuditComponent implements OnInit {
  data: any[] = [];
  dashboard: any = null;
  loading: boolean = true;
  filters: any = {};
  complianceChart: any = null;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    let q = Object.keys(this.filters).filter(k => this.filters[k]).map(k => k + '=' + encodeURIComponent(this.filters[k])).join('&');

    // Fetch dynamic Procurement records (real POs)
    let url = 'http://localhost:8000/audit/procurement' + (q ? '?' + q : '');
    this.http.get<any[]>(url).subscribe({
      next: d => {
        this.data = d;

        // Fetch dynamic compliance visualization from the main dashboard
        this.http.get<any>('http://localhost:8000/analytics/dashboard/auditor').subscribe({
          next: rd => {
            this.dashboard = rd;

            const comp = rd.compliance_overview || {};
            this.complianceChart = {
              series: [comp.compliant || 0, comp.partially_compliant || 0, comp.non_compliant || 0, comp.not_assessed || 0],
              labels: ['Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Assessed'],
              chart: { type: 'donut', height: 250 },
              colors: ['#10b981', '#f59e0b', '#ef4444', '#9ca3af'],
              plotOptions: { pie: { donut: { size: '65%', labels: { show: true, name: { show: true }, value: { show: true }, total: { show: true, label: 'Overall Compliance', formatter: () => (comp.overall || 0) + '%' } } } } },
              legend: { show: false }
            };

            this.loading = false;
          },
          error: () => this.loading = false
        });
      },
      error: e => { this.loading = false; this.data = []; }
    });
  }
}
