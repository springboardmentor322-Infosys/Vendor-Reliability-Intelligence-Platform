import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface CommItem { id: number; thread: string; sender: string; recipient: string; created: string; last_message: string; status: string; }

@Component({
  selector: 'app-audit-communications',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [CurrencyPipe, DatePipe],
  templateUrl: './audit-communications.component.html'
})
export class AuditCommunicationsComponent implements OnInit {
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
      let url = 'http://localhost:8000/audit/communications' + (q ? '?' + q : '');
      this.http.get<any>(url).subscribe({
         next: d => { this.data = d; this.loading = false; },
         error: e => { this.loading = false; this.data = []; }
      });
  }
}
