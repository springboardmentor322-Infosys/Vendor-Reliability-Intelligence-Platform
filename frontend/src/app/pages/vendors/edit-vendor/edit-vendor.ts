import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-edit-vendor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-vendor.html',
  styleUrls: ['./edit-vendor.css']
})
export class EditVendorComponent implements OnInit {

  vendorId!: number;

  vendor = {
    vendor_name: '',
    category: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active'
  };

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.vendorId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadVendor();
  }

  loadVendor(): void {

    this.http.get<any>(
      `http://127.0.0.1:8000/vendors/${this.vendorId}`
    ).subscribe({

      next: (data) => {
        this.vendor = data;
      },

      error: (err) => {
        console.error(err);
        alert('Failed to Load Vendor');
      }

    });

  }

  updateVendor(): void {

    const token = localStorage.getItem('token');

    if (!token) {
      alert('Please login first');
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.put(
      `http://127.0.0.1:8000/vendors/${this.vendorId}`,
      this.vendor,
      { headers }
    ).subscribe({

      next: () => {
        alert('Vendor Updated Successfully');
        this.router.navigate(['/vendors']);
      },

      error: (err) => {
        console.error(err);
        alert('Update Failed');
      }

    });

  }

}