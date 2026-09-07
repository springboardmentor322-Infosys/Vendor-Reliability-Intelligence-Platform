import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VendorService } from '../../../../core/services/vendor.service';

@Component({
  selector: 'app-vendor-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-directory.component.html'
})
export class VendorDirectoryComponent implements OnInit {
  vendors: any[] = [];
  categories: any[] = [];
  filteredVendors: any[] = [];
  
  searchQuery = '';
  selectedCategory = '';
  selectedStatus = '';
  
  selectedVendor: any = null;
  showModal = false;

  constructor(private vendorService: VendorService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.vendorService.getCategories().subscribe(res => {
      this.categories = res;
    });
    this.vendorService.getVendors().subscribe(res => {
      this.vendors = res;
      this.filterVendors();
    });
  }

  filterVendors() {
    this.filteredVendors = this.vendors.filter(v => {
      const matchSearch = v.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchCat = this.selectedCategory ? v.category?.id == this.selectedCategory : true;
      const matchStatus = this.selectedStatus ? v.status === this.selectedStatus : true;
      return matchSearch && matchCat && matchStatus;
    });
  }

  openProfile(vendor: any) {
    this.selectedVendor = vendor;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedVendor = null;
  }

  updateStatus(status: string) {
    if (!this.selectedVendor) return;
    this.vendorService.updateVendorStatus(this.selectedVendor.id, status).subscribe(res => {
      this.selectedVendor.status = res.status;
      const idx = this.vendors.findIndex(v => v.id === res.id);
      if (idx !== -1) this.vendors[idx] = res;
      this.filterVendors();
    });
  }
}
