import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface Comp { distribution: any[]; trend: any[]; }

@Component({
    selector: 'app-compliance-reports',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, NgApexchartsModule],
    providers: [CurrencyPipe, DatePipe],
    templateUrl: './compliance-reports.component.html'
})
export class ComplianceReportsComponent implements OnInit {
    data: any = null;
    loading: boolean = true;
    filters: any = {};

    complianceChart: any = null;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.fetchComplianceData();
    }

    fetchComplianceData() {
        this.loading = true;
        this.http.get<any>('http://localhost:8000/analytics/dashboard/auditor').subscribe({
            next: rd => {
                if (!this.data) this.data = {};
                this.data.compliance_overview = rd.compliance_overview;

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
            error: e => {
                this.loading = false;
                console.error(e);
            }
        });
    }
}
