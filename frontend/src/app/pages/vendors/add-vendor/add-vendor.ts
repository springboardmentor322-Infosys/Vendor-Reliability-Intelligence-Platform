import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-add-vendor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './add-vendor.html',
  styleUrl: './add-vendor.css',
})
export class AddVendorComponent {

  vendorCategories = [
    'Raw Material Suppliers',
    'Equipment Vendors',
    'IT Vendors',
    'Service Providers',
    'Logistics Partners',
    'Maintenance Vendors'
  ];

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
    private router: Router
  ) {}

  saveVendor() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.post(
      'http://127.0.0.1:8000/vendors/add',
      this.vendor,
      { headers }
    ).subscribe({

      next: (response) => {
        console.log('Success:', response);
        alert('Vendor Added Successfully');
        this.router.navigate(['/vendors']);
      },

      error: (error) => {

        console.log('Full Error:', error);

        if (error.status === 401) {
          alert('401 - Login expired or token missing');
        }
        else if (error.status === 403) {
          alert('403 - You are not an Admin');
        }
        else if (error.status === 422) {
          alert('422 - Invalid data sent to backend');
        }
        else if (error.status === 404) {
          alert('404 - API URL not found');
        }
        else if (error.status === 500) {
          alert('500 - Backend server error');
        }
        else {
          alert('Error: ' + JSON.stringify(error.error));
        }

      }

    });

  }

}