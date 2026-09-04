import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, UserProfile } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './vendor-dashboard.html',
  styleUrl: './vendor-dashboard.css'
})
export class VendorDashboardComponent implements OnInit {
  user: UserProfile | null = null;
  vendorName = '';
  totalOrders = 0;
  activeContracts = 0;
  performanceScore = 0;
  recentOrders: any[] = [];

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser();
    if (this.user) this.loadDashboard();
    else this.auth.loadProfile().subscribe({
      next: p => { this.user = p; this.loadDashboard(); },
      error: err => console.error('Profile Error:', err)
    });
  }

  loadDashboard(): void {
    this.http.get<any>(`${environment.apiUrl}/vendors/me`).subscribe({
      next: v => {
        this.vendorName = v.vendor_name;
        this.loadOrders(v.vendor_name);
        this.loadContracts(v.vendor_name);
        this.loadPerformance(v.vendor_name);
      },
      error: err => console.error('Vendor Error:', err)
    });
  }

  loadOrders(name: string): void {
    this.http.get<any[]>(`${environment.apiUrl}/purchase-orders/`).subscribe({
      next: data => {
        const rows = data.filter(x => x.vendor_name === name);
        this.totalOrders = rows.length;
        this.recentOrders = rows.slice(0, 5);
      },
      error: err => console.error('Orders Error:', err)
    });
  }

  loadContracts(name: string): void {
    this.http.get<any[]>(`${environment.apiUrl}/contracts/`).subscribe({
      next: data => this.activeContracts = data.filter(x => x.vendor_name === name && x.status !== 'Expired').length,
      error: err => console.error('Contracts Error:', err)
    });
  }

  loadPerformance(name: string): void {
    this.http.get<any[]>(`${environment.apiUrl}/performance/`).subscribe({
      next: data => {
        const rows = data.filter(x => x.vendor_name === name).sort((a,b) => b.id - a.id);
        this.performanceScore = rows[0]?.overall_score ?? 0;
      },
      error: err => console.error('Performance Error:', err)
    });
  }
}
