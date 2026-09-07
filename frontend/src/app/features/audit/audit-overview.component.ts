import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface AuditOverview { transactions: number; vendors: number; exceptions: number; recent_activity: any[]; expiring_contracts: any[]; high_risk_vendors: any[]; }

@Component({
  selector: 'app-audit-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './audit-overview.component.html'
})
export class AuditOverviewComponent implements OnInit {
  data: any = null;
  loading: boolean = true;
  filters: any = {};
  
  constructor(private http: HttpClient) {}

  ngOnInit() {
     this.load();
  }
  
  load() {
      this.loading = true;
      let q = Object.keys(this.filters).filter(k => this.filters[k]).map(k => k + '=' + encodeURIComponent(this.filters[k])).join('&');
      let url = 'http://localhost:8000/audit/overview' + (q ? '?' + q : '');
      this.http.get<any>(url).subscribe({
         next: d => { this.data = d; this.loading = false; },
         error: e => { this.loading = false; this.data = []; }
      });
  }
}
