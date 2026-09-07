import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface VendorItem { id: number; name: string; reliability_score: number; risk_level: string; status: string; category: string; }

@Component({
  selector: 'app-vendor-audit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './vendor-audit.component.html'
})
export class VendorAuditComponent implements OnInit {
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
      let url = 'http://localhost:8000/audit/vendors' + (q ? '?' + q : '');
      this.http.get<any>(url).subscribe({
         next: d => { this.data = d; this.loading = false; },
         error: e => { this.loading = false; this.data = []; }
      });
  }
}
