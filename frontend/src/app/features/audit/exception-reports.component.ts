import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-exception-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgApexchartsModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './exception-reports.component.html'
})
export class ExceptionReportsComponent implements OnInit {
  data: any[] = [];
  dashboard: any = null;
  loading: boolean = true;
  filters: any = {};
  findingsChart: any = null;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    let q = Object.keys(this.filters).filter(k => this.filters[k]).map(k => k + '=' + encodeURIComponent(this.filters[k])).join('&');

    // 1. Fetch real exceptions
    let url = 'http://localhost:8000/audit/reports/exceptions' + (q ? '?' + q : '');
    this.http.get<any[]>(url).subscribe({
      next: d => {
        this.data = d;

        // 2. Fetch dashboard visuals
        this.http.get<any>('http://localhost:8000/analytics/dashboard/auditor').subscribe({
          next: rd => {
            this.dashboard = rd;
            this.buildChart(rd);
            this.loading = false;
          },
          error: () => this.loading = false
        });
      },
      error: e => { this.loading = false; this.data = []; }
    });
  }

  buildChart(rd: any) {
    const ft = rd.findings_trend || [];
    this.findingsChart = {
      series: [
        { name: 'High', data: ft.map((t: any) => t.high) },
        { name: 'Medium', data: ft.map((t: any) => t.medium) },
        { name: 'Low', data: ft.map((t: any) => t.low) }
      ],
      labels: ft.map((t: any) => t.month),
      chart: { type: 'bar', stacked: true, height: 250, toolbar: { show: false } },
      colors: ['#ef4444', '#f59e0b', '#10b981'],
      legend: { position: 'bottom' }
    };
  }
}
