import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vendor-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-orders.html',
  styleUrl: './vendor-orders.css'
})
export class VendorOrdersComponent implements OnInit {
  orders: any[] = [];
  vendor: any = null;
  private apiUrl = `${environment.apiUrl}/purchase-orders`;
  private vendorApi = `${environment.apiUrl}/vendors/me`;

  statuses = ['In Progress', 'Shipped', 'Partial Delivery', 'Delivered'];

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    if (this.auth.currentUser()) this.loadVendor();
    else this.auth.loadProfile().subscribe({ next: () => this.loadVendor(), error: err => console.error(err) });
  }

  loadVendor(): void {
    this.http.get<any>(this.vendorApi).subscribe({
      next: vendor => { this.vendor = vendor; this.loadOrders(vendor.vendor_name); },
      error: err => console.error('Vendor API Error:', err)
    });
  }

  loadOrders(vendorName: string): void {
    this.http.get<any[]>(`${this.apiUrl}/`).subscribe({
      next: orders => this.orders = orders.filter(order => order.vendor_name === vendorName),
      error: err => console.error('Order API Error:', err)
    });
  }

  updateStatus(order: any): void {
    this.http.put<any>(`${this.apiUrl}/${order.id}/status`, null, { params: { status: order.status } })
      .subscribe({
        next: () => alert('Order status updated successfully'),
        error: err => { console.error('Status Update Error:', err); alert(err.error?.detail || 'Failed to update status'); }
      });
  }
}
