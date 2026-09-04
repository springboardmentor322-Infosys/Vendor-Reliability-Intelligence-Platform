import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vendor-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendor-performance.html',
  styleUrl: './vendor-performance.css'
})
export class VendorPerformanceComponent implements OnInit {
  performance: any = null;
  loading = true;
  private apiUrl = `${environment.apiUrl}/performance`;
  private vendorApi = `${environment.apiUrl}/vendors/me`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    if (this.auth.currentUser()) this.loadVendor();
    else this.auth.loadProfile().subscribe({
      next: () => this.loadVendor(),
      error: err => { console.error(err); this.loading = false; }
    });
  }

  loadVendor(): void {
    this.http.get<any>(this.vendorApi).subscribe({
      next: vendor => this.getPerformance(vendor.vendor_name),
      error: err => { console.error('Vendor API Error:', err); this.loading = false; }
    });
  }

  getPerformance(vendorName: string): void {
    this.http.get<any[]>(`${this.apiUrl}/`).subscribe({
      next: data => {
        this.performance = data
          .filter(item => item.vendor_name === vendorName)
          .sort((a,b) => b.id - a.id)[0] || null;
        this.loading = false;
      },
      error: err => { console.error('Performance API Error:', err); this.loading = false; }
    });
  }
}
