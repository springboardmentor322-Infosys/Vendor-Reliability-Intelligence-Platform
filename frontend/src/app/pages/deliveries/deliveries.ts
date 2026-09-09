import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Delivery } from '../../services/delivery';


@Component({
  selector: 'app-deliveries',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './deliveries.html',

  styleUrl: './deliveries.css'
})


export class Deliveries implements OnInit {

  Math = Math;


  // ==========================================
  // DELIVERY DATA
  // ==========================================

  deliveries: any[] = [];

  allDeliveries: any[] = [];

  delayedDeliveries: any[] = [];


  // ==========================================
  // SUMMARY
  // ==========================================

  totalDeliveries = 0;

  pendingDeliveries = 0;

  inTransitDeliveries = 0;

  delayedCount = 0;

  deliveredDeliveries = 0;


  // ==========================================
  // PAGINATION
  // ==========================================

  currentPage = 1;

  pageSize = 50;

  totalPages = 1;

  totalRecords = 0;


  // ==========================================
  // SEARCH
  // ==========================================

  searchTerm = '';

  isSearching = false;


  // ==========================================
  // LOADING
  // ==========================================

  loading = false;

  summaryLoading = false;


  // ==========================================
  // MESSAGES
  // ==========================================

  errorMessage = '';

  successMessage = '';


  // ==========================================
  // CREATE DELIVERY FORM
  // ==========================================

  showForm = false;


  newDelivery: any = {

    order_id: null,


    expected_delivery_date: '',

    actual_delivery_date: null,

    status: 'Pending',

    tracking_number: '',

    notes: ''

  };


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private deliveryService: Delivery,
    private cdr: ChangeDetectorRef
  ) {}


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  ngOnInit(): void {

    // Load everything automatically
    // when the page opens.

    this.loadDeliveries();

    this.loadSummary();

  }


  // ==========================================
  // LOAD DELIVERIES
  // ==========================================

  loadDeliveries(): void {

    this.loading = true;

    this.errorMessage = '';


    this.deliveryService
      .getDeliveries(
        this.currentPage,
        this.pageSize
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Deliveries response:',
            response
          );


          /*
           * Support both:
           *
           * {
           *   items: [],
           *   total: 367,
           *   page: 1,
           *   total_pages: 8
           * }
           *
           * and a direct array.
           */

          if (Array.isArray(response)) {

            this.allDeliveries = response;

            this.totalRecords =
              response.length;

            this.totalPages =
              Math.max(
                1,
                Math.ceil(
                  response.length /
                  this.pageSize
                )
              );

          } else {

            this.allDeliveries =
              response?.items || [];

            this.totalRecords =
              response?.total ??
              this.allDeliveries.length;

            this.totalPages =
              response?.total_pages ??
              Math.max(
                1,
                Math.ceil(
                  this.totalRecords /
                  this.pageSize
                )
              );

            this.currentPage =
              response?.page ??
              this.currentPage;

          }


          // Apply search after data arrives.

          this.applySearch();


          // Stop loading.

          this.loading = false;

          // Force Angular to update the UI.

          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Error loading deliveries:',
            error
          );


          this.errorMessage =
            error?.error?.detail ||
            'Unable to load deliveries.';


          this.allDeliveries = [];

          this.deliveries = [];

          this.totalRecords = 0;

          this.totalPages = 1;


          // Stop loading even when request fails.

          this.loading = false;

          // Force Angular to update the UI.

          this.cdr.detectChanges();

        }

      });

  }


  // ==========================================
  // APPLY SEARCH
  // ==========================================

  applySearch(): void {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();


    if (!term) {

      this.deliveries =
        [...this.allDeliveries];

      return;

    }


    this.deliveries =
      this.allDeliveries.filter(
        (delivery: any) => {

          const order =
            String(
              delivery.order_id ?? ''
            ).toLowerCase();


          const vendor =
            String(
              delivery.vendor_id ?? ''
            ).toLowerCase();


          const tracking =
            String(
              delivery.tracking_number ?? ''
            ).toLowerCase();


          const status =
            String(
              delivery.status ?? ''
            ).toLowerCase();


          const id =
            String(
              delivery.id ?? ''
            ).toLowerCase();


          return (

            order.includes(term) ||

            vendor.includes(term) ||

            tracking.includes(term) ||

            status.includes(term) ||

            id.includes(term)

          );

        }

      );

  }


  // ==========================================
  // SEARCH
  // ==========================================

  onSearch(): void {

    this.currentPage = 1;

    this.isSearching = true;

    this.applySearch();

    this.isSearching = false;

  }


  // ==========================================
  // CLEAR SEARCH
  // ==========================================

  clearSearch(): void {

    this.searchTerm = '';

    this.currentPage = 1;

    this.applySearch();

  }


  // ==========================================
  // LOAD SUMMARY
  // ==========================================

  loadSummary(): void {

    this.summaryLoading = true;


    this.deliveryService
      .getDeliverySummary()
      .subscribe({

        next: (summary: any) => {

          this.totalDeliveries =
            summary?.total_deliveries || 0;


          this.pendingDeliveries =
            summary?.pending_deliveries || 0;


          this.inTransitDeliveries =
            summary?.in_transit_deliveries || 0;


          this.delayedCount =
            summary?.delayed_deliveries || 0;


          this.deliveredDeliveries =
            summary?.delivered_deliveries || 0;


          this.summaryLoading = false;

          // Force Angular to update summary cards.

          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Error loading delivery summary:',
            error
          );


          this.summaryLoading = false;

          // Force Angular to update summary cards.

          this.cdr.detectChanges();

        }

      });

  }


  // ==========================================
  // REFRESH
  // ==========================================

  refreshData(): void {

    this.loadDeliveries();

    this.loadSummary();

  }


  // ==========================================
  // NEXT PAGE
  // ==========================================

  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

      this.loadDeliveries();

    }

  }


  // ==========================================
  // PREVIOUS PAGE
  // ==========================================

  previousPage(): void {

    if (
      this.currentPage > 1
    ) {

      this.currentPage--;

      this.loadDeliveries();

    }

  }


  // ==========================================
  // GO TO PAGE
  // ==========================================

  goToPage(
    page: number
  ): void {

    if (
      page < 1 ||
      page > this.totalPages
    ) {

      return;

    }


    this.currentPage = page;

    this.loadDeliveries();

  }


  // ==========================================
  // PAGE NUMBERS
  // ==========================================

  getPageNumbers(): number[] {

    const pages: number[] = [];


    const start =
      Math.max(
        1,
        this.currentPage - 2
      );


    const end =
      Math.min(
        this.totalPages,
        this.currentPage + 2
      );


    for (
      let i = start;
      i <= end;
      i++
    ) {

      pages.push(i);

    }


    return pages;

  }


  // ==========================================
  // SHOW FORM
  // ==========================================

  openForm(): void {

    this.showForm = true;

    this.successMessage = '';

    this.errorMessage = '';

    this.cdr.detectChanges();

  }


  // ==========================================
  // CLOSE FORM
  // ==========================================

  closeForm(): void {

    this.showForm = false;

    this.resetForm();

  }


  // ==========================================
  // RESET FORM
  // ==========================================

  resetForm(): void {

    this.newDelivery = {

      order_id: null,

  
      expected_delivery_date: '',

      actual_delivery_date: null,

      status: 'Pending',

      tracking_number: '',

      notes: ''

    };

  }


  // ==========================================
  // CREATE DELIVERY
  // ==========================================

  createDelivery(): void {

    this.errorMessage = '';

    this.successMessage = '';


    if (
      !this.newDelivery.order_id ||
      !this.newDelivery.expected_delivery_date
    ) {

      this.errorMessage =
        'Order ID and Expected Delivery Date are required.';

      return;

    }


    this.deliveryService
      .createDelivery(
        this.newDelivery
      )
      .subscribe({

        next: () => {

          this.successMessage =
            'Delivery created successfully.';


          this.showForm = false;

          this.resetForm();

          this.currentPage = 1;


          // Reload automatically.

          this.loadDeliveries();

          this.loadSummary();

        },


        error: (error) => {

          console.error(
            'Error creating delivery:',
            error
          );


          this.errorMessage =
            error?.error?.detail ||
            'Unable to create delivery.';

        }

      });

  }


  // ==========================================
  // MARK AS DELIVERED
  // ==========================================

  markDelivered(
    delivery: any
  ): void {

    const today =
      new Date()
        .toISOString()
        .split('T')[0];


    const data = {

      actual_delivery_date:
        today,

      status:
        'Delivered'

    };


    this.deliveryService
      .updateDelivery(
        delivery.id,
        data
      )
      .subscribe({

        next: () => {

          this.successMessage =
            'Delivery marked as delivered.';


          // Update immediately on screen.

          delivery.status =
            'Delivered';

          delivery.actual_delivery_date =
            today;


          this.loadDeliveries();

          this.loadSummary();

        },


        error: (error) => {

          console.error(
            'Error updating delivery:',
            error
          );


          this.errorMessage =
            error?.error?.detail ||
            'Unable to update delivery.';

        }

      });

  }


  // ==========================================
  // DELETE DELIVERY
  // ==========================================

  deleteDelivery(
    delivery: any
  ): void {

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this delivery?'
      );


    if (!confirmed) {

      return;

    }


    this.deliveryService
      .deleteDelivery(
        delivery.id
      )
      .subscribe({

        next: () => {

          this.successMessage =
            'Delivery deleted successfully.';


          if (
            this.deliveries.length === 1 &&
            this.currentPage > 1
          ) {

            this.currentPage--;

          }


          this.loadDeliveries();

          this.loadSummary();

        },


        error: (error) => {

          console.error(
            'Error deleting delivery:',
            error
          );


          this.errorMessage =
            error?.error?.detail ||
            'Unable to delete delivery.';

        }

      });

  }


  // ==========================================
  // STATUS CLASS
  // ==========================================

  getStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'Delivered':

      case 'Completed':

        return 'status-success';


      case 'In Transit':

        return 'status-progress';


      case 'Cancelled':

        return 'status-danger';


      default:

        return 'status-pending';

    }

  }


  // ==========================================
  // CHECK DELAY
  // ==========================================

  isDelayed(
    delivery: any
  ): boolean {

    if (
      !delivery.expected_delivery_date
    ) {

      return false;

    }


    if (
      delivery.status === 'Delivered' ||
      delivery.status === 'Completed' ||
      delivery.status === 'Cancelled'
    ) {

      return false;

    }


    const expectedDate =
      new Date(
        delivery.expected_delivery_date
      );


    const today =
      new Date();


    expectedDate.setHours(
      0,
      0,
      0,
      0
    );


    today.setHours(
      0,
      0,
      0,
      0
    );


    return expectedDate < today;

  }

}