
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VendorService } from '../../services/vendor';

@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './vendors.html',
  styleUrl: './vendors.css'
})
export class Vendors implements OnInit {

  private vendorService = inject(VendorService);

  vendors: any[] = [];

  searchText: string = '';

  isEditMode: boolean = false;

  editingVendorId: number | null = null;

  vendor = {
    vendor_name: '',
    category: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    delivery_score: 0,
    quality_score: 0,
    payment_score: 0,
    compliance_score: 0
  };

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.vendorService.getVendors().subscribe({
      next: (response: any[]) => {
        console.log('VENDORS RESPONSE:', response);
        this.vendors = response;
      },
      error: (error: any) => {
        console.error('VENDORS ERROR:', error);
      }
    });
  }

  addVendor(): void {
    this.vendorService.addVendor(this.vendor).subscribe({
      next: (response: any) => {
        console.log('VENDOR CREATED:', response);

        this.loadVendors();

        this.resetForm();

        this.isEditMode = false;
        this.editingVendorId = null;
      },
      error: (error: any) => {
        console.error('CREATE VENDOR ERROR:', error);
      }
    });
  }

  editVendor(vendor: any): void {
    this.isEditMode = true;
    this.editingVendorId = vendor.id;

    this.vendor = {
      vendor_name: vendor.vendor_name || '',
      category: vendor.category || '',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      delivery_score: vendor.delivery_score || 0,
      quality_score: vendor.quality_score || 0,
      payment_score: vendor.payment_score || 0,
      compliance_score: vendor.compliance_score || 0
    };
  }

  updateVendor(): void {

    if (this.editingVendorId === null) {
      return;
    }

    this.vendorService
      .updateVendor(this.editingVendorId, this.vendor)
      .subscribe({
        next: (response: any) => {
          console.log('VENDOR UPDATED:', response);

          this.loadVendors();

          this.resetForm();

          this.isEditMode = false;
          this.editingVendorId = null;
        },
        error: (error: any) => {
          console.error('UPDATE VENDOR ERROR:', error);
        }
      });
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.editingVendorId = null;
    this.resetForm();
  }

  deleteVendor(id: number): void {

    if (!confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    this.vendorService.deleteVendor(id).subscribe({
      next: (response: any) => {
        console.log('VENDOR DELETED:', response);

        this.loadVendors();
      },
      error: (error: any) => {
        console.error('DELETE VENDOR ERROR:', error);
      }
    });
  }

  resetForm(): void {
    this.vendor = {
      vendor_name: '',
      category: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      delivery_score: 0,
      quality_score: 0,
      payment_score: 0,
      compliance_score: 0
    };
  }

  get filteredVendors(): any[] {
    if (!this.searchText.trim()) {
      return this.vendors;
    }

    const search = this.searchText.toLowerCase();

    return this.vendors.filter((vendor: any) =>
      (vendor.vendor_name || '').toLowerCase().includes(search) ||
      (vendor.category || '').toLowerCase().includes(search) ||
      (vendor.email || '').toLowerCase().includes(search) ||
      (vendor.risk_level || '').toLowerCase().includes(search) ||
      (vendor.status || '').toLowerCase().includes(search)
    );
  }
}