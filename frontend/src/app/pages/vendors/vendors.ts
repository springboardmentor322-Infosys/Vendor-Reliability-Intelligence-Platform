import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RoleDirective } from '../../directives/role.directive';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastService } from '../../services/toast';
import { Vendor } from '../../services/vendor';


@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RoleDirective
  ],
  templateUrl: './vendors.html',
  styleUrl: './vendors.css'
})
export class Vendors implements OnInit {

  vendors: any[] = [];

  filteredVendors: any[] = [];

  searchText = '';


  constructor(
    private vendorService: Vendor,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService
  ) {}


  // ================================
  // INITIALIZE
  // ================================

  ngOnInit(): void {

    this.loadVendors();

  }


  // ================================
  // SEARCH VENDORS
  // ================================

  searchVendors(): void {

    const search =
      this.searchText
        .toLowerCase()
        .trim();


    if (!search) {

      this.filteredVendors =
        this.vendors;

      return;

    }


    this.filteredVendors =
      this.vendors.filter(
        vendor =>

          vendor.vendor_name
            ?.toLowerCase()
            .includes(search)

          ||

          vendor.email
            ?.toLowerCase()
            .includes(search)

          ||

          vendor.phone
            ?.toLowerCase()
            .includes(search)

          ||

          vendor.gst_number
            ?.toLowerCase()
            .includes(search)

          ||

          vendor.category
            ?.toLowerCase()
            .includes(search)

          ||

          vendor.contact_person
            ?.toLowerCase()
            .includes(search)

          ||

          vendor.approval_status
            ?.toLowerCase()
            .includes(search)

          ||

          vendor.status
            ?.toLowerCase()
            .includes(search)
      );

  }


  // ================================
  // LOAD VENDORS
  // ================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response: any[]) => {

          console.log(
            'Vendors API:',
            response
          );


          this.vendors =
            response;


          this.filteredVendors =
            response;


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Failed to load vendors:',
            error
          );


          this.toastService.show(
            'Failed to load vendors.',
            'error'
          );

        }

      });

  }


  // ================================
  // ADD VENDOR
  // ================================

  addVendor(): void {

    this.router.navigate([
      '/add-vendor'
    ]);

  }


  // ================================
  // EDIT VENDOR
  // ================================

  editVendor(
    vendor: any
  ): void {

    localStorage.setItem(
      'editVendor',
      JSON.stringify(vendor)
    );


    this.router.navigate([
      '/add-vendor'
    ]);

  }


  // ================================
  // APPROVE VENDOR
  // ================================

  approveVendor(
    vendor: any
  ): void {

    const confirmed =
      confirm(
        `Approve "${vendor.vendor_name}"?`
      );


    if (!confirmed) {

      return;

    }


    this.vendorService
      .approveVendor(vendor.id)
      .subscribe({

        next: () => {

          this.toastService.show(
            'Vendor approved successfully!',
            'success'
          );


          this.loadVendors();

        },


        error: (error) => {

          console.error(
            'Failed to approve vendor:',
            error
          );


          this.toastService.show(
            error?.error?.detail ||
            'Failed to approve vendor.',
            'error'
          );

        }

      });

  }


  // ================================
  // REJECT VENDOR
  // ================================

  rejectVendor(
    vendor: any
  ): void {

    const confirmed =
      confirm(
        `Reject "${vendor.vendor_name}"?`
      );


    if (!confirmed) {

      return;

    }


    this.vendorService
      .rejectVendor(vendor.id)
      .subscribe({

        next: () => {

          this.toastService.show(
            'Vendor rejected successfully!',
            'success'
          );


          this.loadVendors();

        },


        error: (error) => {

          console.error(
            'Failed to reject vendor:',
            error
          );


          this.toastService.show(
            error?.error?.detail ||
            'Failed to reject vendor.',
            'error'
          );

        }

      });

  }


  // ================================
  // ACTIVATE VENDOR
  // ================================

  activateVendor(
    vendor: any
  ): void {

    this.updateVendorStatus(
      vendor,
      'Active'
    );

  }


  // ================================
  // SUSPEND VENDOR
  // ================================

  suspendVendor(
    vendor: any
  ): void {

    const confirmed =
      confirm(
        `Suspend "${vendor.vendor_name}"?`
      );


    if (!confirmed) {

      return;

    }


    this.updateVendorStatus(
      vendor,
      'Suspended'
    );

  }


  // ================================
  // UPDATE VENDOR STATUS
  // ================================

  private updateVendorStatus(
    vendor: any,
    status: string
  ): void {

    this.vendorService
      .updateVendorStatus(
        vendor.id,
        status
      )
      .subscribe({

        next: () => {

          this.toastService.show(
            `Vendor status changed to ${status}.`,
            'success'
          );


          this.loadVendors();

        },


        error: (error) => {

          console.error(
            'Failed to update vendor status:',
            error
          );


          this.toastService.show(
            error?.error?.detail ||
            'Failed to update vendor status.',
            'error'
          );

        }

      });

  }


  // ================================
  // DELETE VENDOR
  // ================================

  deleteVendor(
    vendor: any
  ): void {

    const confirmed =
      confirm(
        `Are you sure you want to delete "${vendor.vendor_name}"?`
      );


    if (!confirmed) {

      return;

    }


    this.vendorService
      .deleteVendor(vendor.id)
      .subscribe({

        next: () => {

          this.toastService.show(
            'Vendor deleted successfully!',
            'success'
          );


          this.loadVendors();

        },


        error: (error) => {

          console.error(
            'Failed to delete vendor:',
            error
          );


          this.toastService.show(
            error?.error?.detail ||
            'Failed to delete vendor.',
            'error'
          );

        }

      });

  }

}