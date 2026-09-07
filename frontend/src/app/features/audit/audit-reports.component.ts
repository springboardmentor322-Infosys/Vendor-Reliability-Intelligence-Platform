import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-audit-reports',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, NgApexchartsModule],
    providers: [CurrencyPipe, DatePipe],
    templateUrl: './audit-reports.component.html'
})
export class AuditReportsComponent implements OnInit {
    data: any = null;
    loading: boolean = true;
    filters: any = {};

    kpis: any[] = [];
    findingsChart: any = null;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.fetchDashboardData();
    }

    fetchDashboardData() {
        this.loading = true;
        // Force fetching from auditor dashboard payload to get valid KPIs and Trends 
        this.http.get<any>('http://localhost:8000/analytics/dashboard/auditor').subscribe({
            next: rd => {
                if (!this.data) this.data = {};
                this.data.findings_summary = rd.findings_summary;

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

                this.loading = false;
            },
            error: e => {
                this.loading = false;
                console.error(e);
            }
        });
    }
}
