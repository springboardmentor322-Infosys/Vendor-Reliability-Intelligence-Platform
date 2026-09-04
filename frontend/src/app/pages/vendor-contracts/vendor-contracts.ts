import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vendor-contracts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendor-contracts.html',
  styleUrl: './vendor-contracts.css'
})
export class VendorContractsComponent implements OnInit {
  contracts: any[] = [];
  loading = true;
  private contractApi = `${environment.apiUrl}/contracts`;
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
      next: vendor => this.loadContracts(vendor.vendor_name),
      error: err => { console.error('Vendor API Error:', err); this.loading = false; }
    });
  }

  loadContracts(vendorName: string): void {
    this.http.get<any[]>(`${this.contractApi}/`).subscribe({
      next: contracts => { this.contracts = contracts.filter(c => c.vendor_name === vendorName); this.loading = false; },
      error: err => { console.error('Contract API Error:', err); this.loading = false; }
    });
  }

  isExpiringSoon(date: string): boolean {
    const days = (new Date(date).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 90;
  }
}
