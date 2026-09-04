import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vendor-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendor-profile.html',
  styleUrl: './vendor-profile.css'
})
export class VendorProfileComponent implements OnInit {
  vendor: any = null;
  loading = true;
  private apiUrl = `${environment.apiUrl}/vendors/me`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) this.loadVendor();
    else {
      this.auth.loadProfile().subscribe({
        next: () => this.loadVendor(),
        error: err => { console.error('Profile Error:', err); this.loading = false; }
      });
    }
  }

  loadVendor(): void {
    this.http.get<any>(this.apiUrl).subscribe({
      next: vendor => { this.vendor = vendor; this.loading = false; },
      error: err => { console.error('Vendor API Error:', err); this.loading = false; }
    });
  }
}
