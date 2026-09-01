import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RoleDirective } from '../../directives/role.directive';
import { FormsModule } from '@angular/forms';

import { Procurement } from '../../services/procurement';
import { Vendor } from '../../services/vendor';
import { ToastService } from '../../services/toast';


@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RoleDirective
  ],
  templateUrl: './procurement.html',
  styleUrl: './procurement.css'
})
export class ProcurementPage implements OnInit {

  // ==========================================
  // PROCUREMENT REQUESTS
  // ==========================================

  requests: any[] = [];


  // ==========================================
  // VENDORS
  // ==========================================

  vendors: any[] = [];


  // ==========================================
  // FILTERS
  // ==========================================

  selectedStatus = 'All';

  searchText = '';


  // ==========================================
  // LOADING
  // ==========================================

  loading = false;


  // ==========================================
  // FORM
  // ==========================================

  showForm = false;

  editingRequest: any = null;


  form = {

    vendor_id: null as number | null,

    product_name: '',

    quantity: 1,

    estimated_amount: 0

  };


  constructor(
    private procurementService: Procurement,
    private vendorService: Vendor,
    private toastService: ToastService
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadRequests();

    this.loadVendors();

  }


  // ==========================================
  // LOAD REQUESTS
  // ==========================================

  loadRequests(): void {

    this.loading = true;


    this.procurementService
      .getProcurementRequests()
      .subscribe({

        next: (response) => {

          this.requests = response;

          this.loading = false;

        },

        error: (error) => {

          console.error(
            'Failed to load procurement requests:',
            error
          );

          this.requests = [];

          this.loading = false;


          this.toastService.show(
            'Failed to load procurement requests.',
            'error'
          );

        }

      });

  }


  // ==========================================
  // LOAD VENDORS
  // ==========================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response) => {

          this.vendors = response;

        },

        error: (error) => {

          console.error(
            'Failed to load vendors:',
            error
          );

          this.vendors = [];

        }

      });

  }


  // ==========================================
  // OPEN CREATE FORM
  // ==========================================

  openCreateForm(): void {

    this.editingRequest = null;


    this.form = {

      vendor_id: null,

      product_name: '',

      quantity: 1,

      estimated_amount: 0

    };


    this.showForm = true;

  }


  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  editRequest(
    request: any
  ): void {

    this.editingRequest = request;


    this.form = {

      vendor_id: request.vendor_id,

      product_name: request.product_name,

      quantity: request.quantity,

      estimated_amount:
        request.estimated_amount

    };


    this.showForm = true;

  }


  // ==========================================
  // CLOSE FORM
  // ==========================================

  closeForm(): void {

    this.showForm = false;

    this.editingRequest = null;

  }


  // ==========================================
  // SAVE REQUEST
  // ==========================================

  saveRequest(): void {

    if (!this.form.vendor_id) {

      this.toastService.show(
        'Please select a vendor.',
        'error'
      );

      return;

    }


    if (!this.form.product_name.trim()) {

      this.toastService.show(
        'Product name is required.',
        'error'
      );

      return;

    }


    if (this.form.quantity <= 0) {

      this.toastService.show(
        'Quantity must be greater than 0.',
        'error'
      );

      return;

    }


    if (this.form.estimated_amount < 0) {

      this.toastService.show(
        'Estimated amount cannot be negative.',
        'error'
      );

      return;

    }


    const data = {

      vendor_id:
        Number(this.form.vendor_id),

      product_name:
        this.form.product_name.trim(),

      quantity:
        Number(this.form.quantity),

      estimated_amount:
        Number(this.form.estimated_amount)

    };


    // ========================================
    // UPDATE
    // ========================================

    if (this.editingRequest) {

      this.procurementService
        .updateProcurementRequest(
          this.editingRequest.id,
          data
        )
        .subscribe({

          next: () => {

            this.toastService.show(
              'Procurement request updated successfully!',
              'success'
            );

            this.closeForm();

            this.loadRequests();

          },

          error: (error) => {

            console.error(
              'Failed to update procurement request:',
              error
            );

            this.toastService.show(
              error?.error?.detail ||
              'Failed to update procurement request.',
              'error'
            );

          }

        });

      return;

    }


    // ========================================
    // CREATE
    // ========================================

    this.procurementService
      .createProcurementRequest(data)
      .subscribe({

        next: () => {

          this.toastService.show(
            'Procurement request created successfully!',
            'success'
          );

          this.closeForm();

          this.loadRequests();

        },

        error: (error) => {

          console.error(
            'Failed to create procurement request:',
            error
          );

          this.toastService.show(
            error?.error?.detail ||
            'Failed to create procurement request.',
            'error'
          );

        }

      });

  }


  // ==========================================
  // APPROVE REQUEST
  // ==========================================

  approveRequest(
    request: any
  ): void {

    if (request.status !== 'Pending') {

      return;

    }


    const confirmed =
      confirm(
        'Are you sure you want to approve this procurement request?'
      );


    if (!confirmed) {

      return;

    }


    this.procurementService
      .approveProcurementRequest(
        request.id
      )
      .subscribe({

        next: () => {

          this.toastService.show(
            'Procurement request approved!',
            'success'
          );

          this.loadRequests();

        },

        error: (error) => {

          console.error(
            'Failed to approve request:',
            error
          );

          this.toastService.show(
            error?.error?.detail ||
            'Failed to approve request.',
            'error'
          );

        }

      });

  }


  // ==========================================
  // REJECT REQUEST
  // ==========================================

  rejectRequest(
    request: any
  ): void {

    if (request.status !== 'Pending') {

      return;

    }


    const confirmed =
      confirm(
        'Are you sure you want to reject this procurement request?'
      );


    if (!confirmed) {

      return;

    }


    this.procurementService
      .rejectProcurementRequest(
        request.id
      )
      .subscribe({

        next: () => {

          this.toastService.show(
            'Procurement request rejected!',
            'success'
          );

          this.loadRequests();

        },

        error: (error) => {

          console.error(
            'Failed to reject request:',
            error
          );

          this.toastService.show(
            error?.error?.detail ||
            'Failed to reject request.',
            'error'
          );

        }

      });

  }


  // ==========================================
  // CREATE ORDER
  // ==========================================

  createOrder(
    request: any
  ): void {

    if (request.status !== 'Approved') {

      return;

    }


    const confirmed =
      confirm(
        'Create a purchase order from this approved request?'
      );


    if (!confirmed) {

      return;

    }


    this.procurementService
      .createOrderFromProcurement(
        request.id
      )
      .subscribe({

        next: () => {

          this.toastService.show(
            'Purchase order created successfully!',
            'success'
          );

          this.loadRequests();

        },

        error: (error) => {

          console.error(
            'Failed to create purchase order:',
            error
          );

          this.toastService.show(
            error?.error?.detail ||
            'Failed to create purchase order.',
            'error'
          );

        }

      });

  }


  // ==========================================
  // DELETE REQUEST
  // ==========================================

  deleteRequest(
    id: number
  ): void {

    const confirmed =
      confirm(
        'Are you sure you want to delete this procurement request?'
      );


    if (!confirmed) {

      return;

    }


    this.procurementService
      .deleteProcurementRequest(id)
      .subscribe({

        next: () => {

          this.toastService.show(
            'Procurement request deleted successfully!',
            'success'
          );

          this.loadRequests();

        },

        error: (error) => {

          console.error(
            'Failed to delete procurement request:',
            error
          );

          this.toastService.show(
            error?.error?.detail ||
            'Failed to delete procurement request.',
            'error'
          );

        }

      });

  }


  // ==========================================
  // FILTERED REQUESTS
  // ==========================================

  get filteredRequests(): any[] {

    let result =
      [...this.requests];


    // ========================================
    // STATUS FILTER
    // ========================================

    if (
      this.selectedStatus !== 'All'
    ) {

      result =
        result.filter(
          request =>
            request.status ===
            this.selectedStatus
        );

    }


    // ========================================
    // SEARCH FILTER
    // ========================================

    if (
      this.searchText.trim()
    ) {

      const search =
        this.searchText
          .toLowerCase()
          .trim();


      result =
        result.filter(
          request => {

            const product =
              request.product_name
                ?.toLowerCase() || '';


            const vendor =
              this.getVendorName(
                request.vendor_id
              ).toLowerCase();


            return (
              product.includes(search) ||
              vendor.includes(search)
            );

          }
        );

    }


    return result;

  }


  // ==========================================
  // GET VENDOR NAME
  // ==========================================

  getVendorName(
    vendorId: number
  ): string {

    const vendor =
      this.vendors.find(
        v =>
          v.id === vendorId
      );


    return vendor
      ? vendor.vendor_name
      : `Vendor #${vendorId}`;

  }


  // ==========================================
  // GET STATUS CLASS
  // ==========================================

  getStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'Pending':
        return 'pending';

      case 'Approved':
        return 'approved';

      case 'Rejected':
        return 'rejected';

      case 'Ordered':
        return 'ordered';

      default:
        return '';

    }

  }

}
