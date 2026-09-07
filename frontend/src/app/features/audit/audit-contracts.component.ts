import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface ContractItem { id: number; contract: string; vendor: string; start_date: string; expiry: string; status: string; days_remaining: number; }

@Component({
  selector: 'app-audit-contracts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './audit-contracts.component.html'
})
export class AuditContractsComponent implements OnInit {
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
      let url = 'http://localhost:8000/audit/contracts' + (q ? '?' + q : '');
      this.http.get<any>(url).subscribe({
         next: d => { this.data = d; this.loading = false; },
         error: e => { this.loading = false; this.data = []; }
      });
  }
}
