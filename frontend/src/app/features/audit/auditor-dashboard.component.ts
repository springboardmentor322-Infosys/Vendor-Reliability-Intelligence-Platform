import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-auditor-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, RouterModule],
  providers: [CurrencyPipe, DatePipe, PercentPipe],
  templateUrl: './auditor-dashboard.component.html',
  styleUrls: []
})
export class AuditorDashboardComponent implements OnInit {
  data: any = null;
  loading = true;
  user: any = null;

  kpis: any[] = [];
  
  complianceChart: any = null;
  findingsChart: any = null;
  riskChart: any = null;
  checklistChart: any = null;
  evidenceChart: any = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.http.get<any>('http://localhost:8000/auth/me').subscribe({
      next: (resp) => { this.user = resp; },
      error: (err) => console.error(err)
    });

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

  getBadgeColor(status: string): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (s.includes('open') || s.includes('high') || s.includes('expir') || s.includes('fail') || s.includes('late')) return 'bg-red-100 text-red-800';
    if (s.includes('progress') || s.includes('medium') || s.includes('partial')) return 'bg-amber-100 text-amber-800';
    if (s.includes('low') || s.includes('close') || s.includes('schedule') || s.includes('success') || s.includes('active') || s.includes('compliant') || s.includes('safe')) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  }

  buildKpis() {
      const k = this.data.kpis;
      if (!k) return;
      this.kpis = [
          { label: 'Audits Conducted', value: k.audits_conducted, icon: 'fa-regular stroke', color: 'text-indigo-600', sub: 'Total mapped objects' },
          { label: 'Compliance Score', value: k.compliance_score + '%', icon: 'fa-solid flex', color: 'text-emerald-600', sub: 'Calculated compliant' },
          { label: 'Open Audit Findings', value: k.open_findings, icon: 'fa-solid alert', color: 'text-amber-600', sub: 'Requires investigation' },
          { label: 'High Risk Vendors', value: k.high_risk_vendors, icon: 'fa-solid shield', color: 'text-red-500', sub: 'Risk score < 60' },
          { label: 'Pending Approvals', value: k.pending_approvals, icon: 'fa-regular file', color: 'text-blue-500', sub: 'Action required' },
          { label: 'Overdue Actions', value: k.overdue_actions, icon: 'fa-regular clock', color: 'text-fuchsia-600', sub: 'Overdue control logs' },
      ];
  }

  buildCharts() {
      if(!this.data) return;
      
      const comp = this.data.compliance_overview || {};
      this.complianceChart = {
          series: [comp.compliant || 0, comp.partially_compliant || 0, comp.non_compliant || 0, comp.not_assessed || 0],
          labels: ['Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Assessed'],
          chart: { type: 'donut', height: 250 },
          colors: ['#10b981', '#f59e0b', '#ef4444', '#9ca3af'],
          plotOptions: { pie: { donut: { size: '65%', labels: { show: true, name: {show: true}, value: {show: true}, total: {show: true, label: 'Overall Compliance', formatter: () => (comp.overall || 0) + '%'} } } } },
          legend: { show: false }
      };

      const ft = this.data.findings_trend || [];
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
      
      const risk = this.data.risk_assessment || {};
      this.riskChart = {
          series: [risk.high_risk || 0, risk.medium_risk || 0, risk.low_risk || 0, risk.minimal_risk || 0],
          labels: ['High Risk', 'Medium Risk', 'Low Risk', 'Minimal Risk'],
          chart: { type: 'donut', height: 250 },
          colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
          plotOptions: { pie: { donut: { size: '65%', labels: { show: true, name: {show: true}, value: {show: true}, total: {show: true, label: 'Assessments', formatter: () => (risk.total || 0)} } } } },
          legend: { show: false }
      };

      const cl = this.data.checklist_progress || { overall: 0 };
      this.checklistChart = {
          series: [cl.overall],
          chart: { type: 'radialBar', height: 250 },
          plotOptions: { radialBar: { hollow: { size: '70%' }, dataLabels: { name: { show: true, label: 'Overall Progress' }, value: { show: true, formatter: (val:any) => val + "%" } } } },
          colors: ['#6366f1']
      };

      const ev = this.data.evidence_summary || { documents: 0, images: 0, emails: 0, other: 0, total: 0 };
      this.evidenceChart = {
          series: [ev.documents, ev.images, ev.emails, ev.other],
          labels: ['Documents', 'Images', 'Emails', 'Others'],
          chart: { type: 'donut', height: 250 },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
          plotOptions: { pie: { donut: { size: '65%', labels: { show: true, name: {show: false}, total: {show: true, label: 'Total Evidence', formatter: () => ev.total} } } } },
          legend: { show: false }
      };
  }

  generateReport() {
    this.router.navigate(['/audit-exports']);
  }
}
