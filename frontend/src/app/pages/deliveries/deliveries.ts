import {
  Component,
  OnInit
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

  templateUrl:
    './deliveries.html',

  styleUrl:
    './deliveries.css'
})


export class Deliveries
  implements OnInit {

  Math = Math;
  // ==========================================
  // DELIVERY DATA
  // ==========================================

  deliveries: any[] = [];

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

    vendor_id: null,

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
    private deliveryService: Delivery
  ) {}


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  ngOnInit(): void {

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

        next: (response) => {

          this.deliveries =
            response?.items || [];

          this.totalRecords =
            response?.total || 0;

          this.totalPages =
            response?.total_pages || 1;

          this.currentPage =
            response?.page ||
            this.currentPage;

          this.loading = false;

        },


        error: (error) => {

          console.error(
            'Error loading deliveries:',
            error
          );

          this.errorMessage =
            error?.error?.detail ||
            'Unable to load deliveries.';

          this.deliveries = [];

          this.loading = false;

        }

      });

  }


  // ==========================================
  // LOAD SUMMARY
  // ==========================================

  loadSummary(): void {

    this.summaryLoading = true;


    this.deliveryService
      .getDeliverySummary()
      .subscribe({

        next: (summary) => {

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

        },


        error: (error) => {

          console.error(
            'Error loading delivery summary:',
            error
          );

          this.summaryLoading = false;

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

    const start = Math.max(
      1,
      this.currentPage - 2
    );

    const end = Math.min(
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

      vendor_id: null,

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
      !this.newDelivery.vendor_id ||
      !this.newDelivery.expected_delivery_date
    ) {

      this.errorMessage =
        'Order ID, Vendor ID and Expected Delivery Date are required.';

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