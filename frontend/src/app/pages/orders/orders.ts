import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleDirective } from '../../directives/role.directive';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ToastService } from '../../services/toast';
import { Vendor } from '../../services/vendor';
import { Order } from '../../services/order';


@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RoleDirective
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class Orders implements OnInit {

  // ================================
  // ORDERS
  // ================================

  orders =
    signal<any[]>([]);


  // ================================
  // FILTER
  // ================================

  selectedStatus =
    'All';


  // ================================
  // VENDORS
  // ================================

  vendors: any[] = [];


  // ================================
  // SEARCH
  // ================================

  searchText =
    '';


  // ================================
  // PAGINATION
  // ================================

  currentPage = 1;

  pageSize = 100;

  totalMatchingOrders = 0;


  constructor(
    private orderService: Order,
    private vendorService: Vendor,
    public router: Router,
    private toastService: ToastService
  ) {}


  // ================================
  // INITIALIZE
  // ================================

  ngOnInit(): void {

    this.loadOrders();

    this.loadVendors();

  }


  // ================================
  // LOAD ORDERS
  // ================================

  loadOrders(): void {

    const offset = (this.currentPage - 1) * this.pageSize;

    this.orderService
      .getOrders(
        this.selectedStatus,
        this.searchText,
        this.pageSize,
        offset
      )
      .subscribe({

        next: (response) => {

          this.orders.set(response || []);

        },

        error: (error) => {

          console.error(
            'Failed to load orders:',
            error
          );

          this.orders.set([]);

          this.toastService.show(
            'Failed to load orders.',
            'error'
          );

        }

      });

    this.orderService
      .getOrderCount(
        this.selectedStatus,
        this.searchText
      )
      .subscribe({

        next: (response) => {

          this.totalMatchingOrders = Number(response?.count) || 0;

          const totalPages = this.totalPages;
          if (totalPages > 0 && this.currentPage > totalPages) {
            this.currentPage = totalPages;
            this.loadOrders();
          }

        },

        error: (error) => {

          console.error(
            'Failed to load order count:',
            error
          );

          this.totalMatchingOrders = 0;

        }

      });

  }


  onFilterChange(): void {

    this.currentPage = 1;
    this.loadOrders();

  }


  goToPage(page: number): void {

    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadOrders();

  }


  get totalPages(): number {

    return Math.ceil(this.totalMatchingOrders / this.pageSize);

  }


  // ================================
  // DELETE ORDER
  // ================================

  deleteOrder(
    id: number
  ): void {

    const confirmed =
      confirm(
        'Are you sure you want to delete this order?'
      );


    if (!confirmed) {

      return;

    }


    this.orderService
      .deleteOrder(id)
      .subscribe({

        next: () => {

          this.toastService.show(
            'Order deleted successfully!',
            'success'
          );


          this.loadOrders();

        },


        error: (error) => {

          console.error(
            'Failed to delete order:',
            error
          );


          this.toastService.show(
            error?.error?.detail ||
            'Failed to delete order.',
            'error'
          );

        }

      });

  }


  // ================================
  // EDIT ORDER
  // ================================

  editOrder(
    order: any
  ): void {

    localStorage.setItem(
      'editOrder',
      JSON.stringify(order)
    );


    this.router.navigate([
      '/add-order'
    ]);

  }


  // ================================
  // FILTERED ORDERS
  // ================================

  get filteredOrders(): any[] {

    let result =
      this.orders();


    // ================================
    // STATUS FILTER
    // ================================

    if (
      this.selectedStatus !== 'All'
    ) {

      result =
        result.filter(
          order =>
            order.status ===
            this.selectedStatus
        );

    }


    // ================================
    // SEARCH FILTER
    // ================================

    if (
      this.searchText.trim()
    ) {

      const search =
        this.searchText
          .toLowerCase()
          .trim();


      result =
        result.filter(
          order => {

            const product =
              order.product_name
                ?.toLowerCase() || '';


            const vendor =
              this.getVendorName(
                order.vendor_id
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


  // ================================
  // LOAD VENDORS
  // ================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response) => {

          this.vendors =
            response;

        },


        error: (error) => {

          console.error(
            'Failed to load vendors:',
            error
          );

        }

      });

  }


  // ================================
  // GET VENDOR NAME
  // ================================

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


  // ================================
  // CHECK OVERDUE
  // ================================

  isOverdue(
    order: any
  ): boolean {

    if (
      !order.expected_delivery_date
    ) {

      return false;

    }


    if (
      order.status === 'Delivered' ||
      order.status === 'Completed' ||
      order.status === 'Cancelled'
    ) {

      return false;

    }


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    const deliveryDate =
      new Date(
        order.expected_delivery_date
      );

    deliveryDate.setHours(
      0,
      0,
      0,
      0
    );


    return deliveryDate < today;

  }


  // ================================
  // FORMAT DELIVERY DATE
  // ================================

  formatDeliveryDate(
    date: string | null
  ): string {

    if (!date) {

      return 'Not set';

    }


    const deliveryDate =
      new Date(date);


    if (Number.isNaN(
      deliveryDate.getTime()
    )) {

      return 'Invalid date';

    }


    return deliveryDate.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );

  }


  // ================================
  // GET STATUS CLASS
  // ================================

  getStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'Pending':
        return 'pending';

      case 'Approved':
        return 'approved';

      case 'Ordered':
        return 'ordered';

      case 'Delivered':
        return 'delivered';

      case 'Completed':
        return 'completed';

      case 'Cancelled':
        return 'cancelled';

      default:
        return '';

    }

  }

}