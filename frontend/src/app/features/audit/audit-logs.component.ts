import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgApexchartsModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './audit-logs.component.html'
})
export class AuditLogsComponent implements OnInit {
  data: any[] = [];
  dashboard: any = null;
  loading: boolean = true;
  filters: any = {};
  kpis: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    let q = Object.keys(this.filters).filter(k => this.filters[k]).map(k => k + '=' + encodeURIComponent(this.filters[k])).join('&');

    // Fetch Audit Logs Database records
    let url = 'http://localhost:8000/audit/logs' + (q ? '?' + q : '');
    this.http.get<any[]>(url).subscribe({
      next: (d: any) => {
        this.data = d.logs || [];

        // Fetch KPIs to pad visual layout
        this.http.get<any>('http://localhost:8000/analytics/dashboard/auditor').subscribe({
          next: rd => {
            this.dashboard = rd;
            const k = rd.kpis;
            if (k) {
              this.kpis = [
                { label: 'Audits Conducted', value: k.audits_conducted, icon: 'fa-regular stroke', color: 'text-indigo-600', sub: 'Total mapped objects' },
                { label: 'Compliance Score', value: k.compliance_score + '%', icon: 'fa-solid flex', color: 'text-emerald-600', sub: 'Calculated compliant' },
                { label: 'Open Audit Findings', value: k.open_findings, icon: 'fa-solid alert', color: 'text-amber-600', sub: 'Requires investigation' },
                { label: 'High Risk Vendors', value: k.high_risk_vendors, icon: 'fa-solid shield', color: 'text-red-500', sub: 'Risk score < 60' },
                { label: 'Pending Approvals', value: k.pending_approvals, icon: 'fa-regular file', color: 'text-blue-500', sub: 'Action required' },
                { label: 'Overdue Actions', value: k.overdue_actions, icon: 'fa-regular clock', color: 'text-fuchsia-600', sub: 'Overdue control logs' },
              ];
            }
            this.loading = false;
          },
          error: () => this.loading = false
        });
      },
      error: e => { this.loading = false; this.data = []; }
    });
  }
}
