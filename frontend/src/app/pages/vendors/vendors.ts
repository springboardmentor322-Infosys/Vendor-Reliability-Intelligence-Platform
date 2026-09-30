import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastService } from '../../services/toast';
import { Vendor } from '../../services/vendor';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendors.html',
  styleUrl: './vendors.css'
})
export class Vendors implements OnInit {

  vendors: any[] = [];
  filteredVendors: any[] = [];

  searchText = '';
  selectedCategory = '';
  selectedStatus = '';

  categoryOptions = [
    { value: 'Raw Material Supplier', label: 'Raw Material Suppliers' },
    { value: 'Equipment Vendor', label: 'Equipment Vendors' },
    { value: 'IT Vendor', label: 'IT Vendors' },
    { value: 'Service Provider', label: 'Service Providers' },
    { value: 'Logistics Partner', label: 'Logistics Partners' },
    { value: 'Maintenance Vendor', label: 'Maintenance Vendors' }
  ];

  statusOptions = [
    { value: '', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Rejected', label: 'Rejected' }
  ];

  constructor(
    private vendorService: Vendor,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    this.loadVendors();
  }

  filterVendors(): void {
    const search = this.searchText.toLowerCase().trim();
    const category = this.selectedCategory.toLowerCase().trim();
    const status = this.selectedStatus.toLowerCase().trim();

    this.filteredVendors = this.vendors.filter(vendor => {
      const matchesSearch = !search ||
        vendor.vendor_name?.toLowerCase().includes(search) ||
        vendor.email?.toLowerCase().includes(search) ||
        vendor.phone?.toLowerCase().includes(search) ||
        vendor.gst_number?.toLowerCase().includes(search) ||
        vendor.category?.toLowerCase().includes(search) ||
        vendor.contact_person?.toLowerCase().includes(search);

      const matchesCategory = !category ||
        vendor.category?.toLowerCase() === category;

      const vendorStatus =
        vendor.approval_status === 'Pending' ? 'pending' :
        vendor.approval_status === 'Rejected' ? 'rejected' :
        (vendor.status || '').toLowerCase();

      const matchesStatus = !status || vendorStatus === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  searchVendors(): void {
    this.filterVendors();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterVendors();
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
    this.filterVendors();
  }

  loadVendors(): void {
    this.vendorService.getVendors().subscribe({
      next: (response: any[]) => {
        this.vendors = response || [];
        this.filterVendors();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load vendors:', error);
        this.toastService.show('Failed to load vendors.', 'error');
      }
    });
  }

  canRegisterVendor(): boolean {
    // Vendor Management may submit new vendors for Administrator approval.
    return this.auth.hasAnyRole([
      'Administrator',
      'Supply Chain Manager',
      'Vendor Management'
    ]);
  }

  addVendor(): void {
    if (!this.canRegisterVendor()) {
      this.toastService.show('Vendor registration is available to Vendor Management and requires Administrator approval.', 'error');
      return;
    }
    this.router.navigate(['/add-vendor']);
  }

  getCategoryLabel(category: string): string {
    return this.categoryOptions.find(c => c.value === category)?.label || category || 'Uncategorized';
  }

  getVendorStatus(vendor: any): string {
    if (vendor.approval_status === 'Pending') return 'Pending';
    if (vendor.approval_status === 'Rejected') return 'Rejected';
    return vendor.status || 'Active';
  }

  getReliability(vendor: any): number | null {
    const score = Number(vendor.reliability_score ?? vendor.reliability);
    return Number.isFinite(score) ? score : null;
  }

  getOnboardedDate(vendor: any): string {
    const value = vendor.onboarded_date || vendor.created_at;
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  // Existing actions remain available to the procurement/admin screens.
  editVendor(vendor: any): void {
    localStorage.setItem('editVendor', JSON.stringify(vendor));
    this.router.navigate(['/add-vendor']);
  }

  approveVendor(vendor: any): void {
    if (!confirm(`Approve "${vendor.vendor_name}"?`)) return;
    this.vendorService.approveVendor(vendor.id).subscribe({
      next: () => { this.toastService.show('Vendor approved successfully!', 'success'); this.loadVendors(); },
      error: (error) => this.toastService.show(error?.error?.detail || 'Failed to approve vendor.', 'error')
    });
  }

  rejectVendor(vendor: any): void {
    if (!confirm(`Reject "${vendor.vendor_name}"?`)) return;
    this.vendorService.rejectVendor(vendor.id).subscribe({
      next: () => { this.toastService.show('Vendor rejected successfully!', 'success'); this.loadVendors(); },
      error: (error) => this.toastService.show(error?.error?.detail || 'Failed to reject vendor.', 'error')
    });
  }

  activateVendor(vendor: any): void {
    this.updateVendorStatus(vendor, 'Active');
  }

  suspendVendor(vendor: any): void {
    if (!confirm(`Suspend "${vendor.vendor_name}"?`)) return;
    this.updateVendorStatus(vendor, 'Suspended');
  }

  private updateVendorStatus(vendor: any, status: string): void {
    this.vendorService.updateVendorStatus(vendor.id, status).subscribe({
      next: () => { this.toastService.show(`Vendor status changed to ${status}.`, 'success'); this.loadVendors(); },
      error: (error) => this.toastService.show(error?.error?.detail || 'Failed to update vendor status.', 'error')
    });
  }

  deleteVendor(vendor: any): void {
    if (!confirm(`Are you sure you want to delete "${vendor.vendor_name}"?`)) return;
    this.vendorService.deleteVendor(vendor.id).subscribe({
      next: () => { this.toastService.show('Vendor deleted successfully!', 'success'); this.loadVendors(); },
      error: (error) => this.toastService.show(error?.error?.detail || 'Failed to delete vendor.', 'error')
    });
  }
}
