
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './procurement.html',
  styleUrl: './procurement.css'
})
export class Procurement implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private apiUrl = 'http://127.0.0.1:8000';

  vendors: any[] = [];

  // Procurement records
  procurements: any[] = [];
  loadingProcurements = false;

  procurementData = {
    vendor_id: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
    request_date: ''
  };

  loadingVendors = false;
  submitting = false;

  successMessage = '';
  errorMessage = '';

  // Vendor ID -> Vendor Name
  vendorNames: { [key: number]: string } = {
    1: 'Tech Solutions Pvt Ltd',
    2: 'Global Office Supplies',
    3: 'ABC Technologies',
    9: 'Sri Lakshmi Industries',
    10: 'Prime Solutions',
    12: 'Reliable IT Solutions',
    16: 'Bharat Tech Supplies'
  };

  ngOnInit(): void {
    this.loadVendors();
    this.loadProcurements();
  }

  loadVendors(): void {

    this.loadingVendors = true;
    this.errorMessage = '';

    this.http.get<any[]>(
      `${this.apiUrl}/vendors`
    ).subscribe({

      next: (response: any[]) => {

        console.log(
          'VENDORS RESPONSE:',
          response
        );

        console.log(
          'VENDOR IDS:',
          response.map((v: any) => ({
            id: v.id,
            vendor_id: v.vendor_id,
            name: v.vendor_name,
            fullObject: v
          }))
        );

        this.vendors = Array.isArray(response)
          ? response
          : [];

        console.log(
          'VENDOR COUNT:',
          this.vendors.length
        );

        console.log(
          'VENDORS STORED:',
          this.vendors
        );

        this.loadingVendors = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'VENDOR LOAD ERROR:',
          error
        );

        this.vendors = [];
        this.loadingVendors = false;

        this.errorMessage =
          error?.error?.detail ||
          'Unable to load vendors.';

        this.cdr.detectChanges();
      }

    });
  }

  loadProcurements(): void {

    this.loadingProcurements = true;

    this.http.get<any[]>(
      `${this.apiUrl}/procurements`
    ).subscribe({

      next: (response: any[]) => {

        console.log(
          'PROCUREMENTS RESPONSE:',
          response
        );

        this.procurements = Array.isArray(response)
          ? response
          : [];

        console.log(
          'PROCUREMENT COUNT:',
          this.procurements.length
        );

        this.loadingProcurements = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'PROCUREMENT LOAD ERROR:',
          error
        );

        this.procurements = [];
        this.loadingProcurements = false;

        this.cdr.detectChanges();
      }

    });
  }

  createProcurement(): void {

    this.successMessage = '';
    this.errorMessage = '';

    if (
      this.procurementData.vendor_id === '' ||
      this.procurementData.vendor_id === null ||
      this.procurementData.vendor_id === undefined
    ) {
      this.errorMessage =
        'Please select a vendor.';
      return;
    }

    if (
      !this.procurementData.product_name.trim()
    ) {
      this.errorMessage =
        'Please enter product or service.';
      return;
    }

    if (
      this.procurementData.quantity <= 0
    ) {
      this.errorMessage =
        'Quantity must be greater than 0.';
      return;
    }

    if (
      this.procurementData.unit_price < 0
    ) {
      this.errorMessage =
        'Budget cannot be negative.';
      return;
    }

    if (
      !this.procurementData.request_date
    ) {
      this.errorMessage =
        'Please select the request date.';
      return;
    }

    this.submitting = true;

    const payload = {

      item_name:
        this.procurementData.product_name.trim(),

      quantity:
        Number(this.procurementData.quantity),

      budget:
        Number(this.procurementData.quantity) *
        Number(this.procurementData.unit_price),

      request_date:
        this.procurementData.request_date,

      vendor_id:
        Number(this.procurementData.vendor_id)

    };

    console.log(
      'PROCUREMENT PAYLOAD:',
      payload
    );

    this.http.post(
      `${this.apiUrl}/procurements`,
      payload
    ).subscribe({

      next: (response: any) => {

        console.log(
          'PROCUREMENT RESPONSE:',
          response
        );

        this.successMessage =
          'Procurement request created successfully.';

        this.submitting = false;

        this.procurementData = {

          vendor_id: '',
          product_name: '',
          quantity: 1,
          unit_price: 0,
          request_date: ''

        };

        // Reload procurement records
        this.loadProcurements();

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'PROCUREMENT ERROR:',
          error
        );

        console.error(
          'BACKEND DETAIL:',
          error?.error
        );

        this.errorMessage =
          error?.error?.detail ||
          'Failed to create procurement request.';

        this.submitting = false;

        this.cdr.detectChanges();
      }

    });
  }

  getVendorName(vendorId: number): string {

    const id = Number(vendorId);

    const vendor = this.vendors.find(
      (v: any) =>
        Number(v.id) === id ||
        Number(v.vendor_id) === id
    );

    console.log(
      'VENDOR LOOKUP:',
      {
        requestedId: id,
        foundVendor: vendor,
        vendorId: vendor?.id ?? vendor?.vendor_id,
        vendorName: vendor?.vendor_name ?? vendor?.name
      }
    );

    if (vendor) {

      const name =
        vendor.vendor_name ||
        vendor.name ||
        vendor.supplier_name;

      if (name) {
        return String(name).trim();
      }
    }

    // Fallback mapping
    if (this.vendorNames[id]) {
      return this.vendorNames[id];
    }

    return `Vendor ID ${id}`;
  }

}