import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RoleDirective } from '../../directives/role.directive';
import { FormsModule } from '@angular/forms';

import { Invoice } from '../../services/invoice';
import { Vendor } from '../../services/vendor';
import { Order } from '../../services/order';


@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RoleDirective
  ],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css'
})
export class Invoices implements OnInit {

  // ==========================================
  // INVOICES
  // ==========================================

  invoices =
    signal<any[]>([]);


  // ==========================================
  // VENDORS
  // ==========================================

  vendors =
    signal<any[]>([]);


  // ==========================================
  // ORDERS
  // ==========================================

  orders =
    signal<any[]>([]);


  // ==========================================
  // SUMMARY
  // ==========================================

  totalInvoices =
    signal(0);

  pendingInvoices =
    signal(0);

  paidInvoices =
    signal(0);

  overdueInvoices =
    signal(0);


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);


  // ==========================================
  // FORM
  // ==========================================

  showForm =
    signal(false);


  // ==========================================
  // FORM DATA
  // ==========================================

  invoiceNumber = '';

  selectedOrderId:
    number | null = null;

  selectedVendorId:
    number | null = null;

  amount = 0;

  invoiceDate = '';

  dueDate = '';

  status = 'Pending';


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private invoiceService: Invoice,
    private vendorService: Vendor,
    private orderService: Order
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadInvoices();

    this.loadVendors();

    this.loadOrders();

  }


  // ==========================================
  // LOAD INVOICES
  // ==========================================

  loadInvoices(): void {

    this.loading.set(true);


    this.invoiceService
      .getInvoices()
      .subscribe({

        next: (response: any[]) => {

          this.invoices.set(
            response
          );

          this.calculateSummary(
            response
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load invoices:',
            error
          );

          this.invoices.set([]);

          this.calculateSummary([]);

          this.loading.set(false);

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

        next: (response: any[]) => {

          this.vendors.set(
            response
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load vendors:',
            error
          );

          this.vendors.set([]);

        }

      });

  }


  // ==========================================
  // LOAD ORDERS
  // ==========================================

  loadOrders(): void {

    this.orderService
      .getOrders()
      .subscribe({

        next: (response: any[]) => {

          this.orders.set(
            response
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load orders:',
            error
          );

          this.orders.set([]);

        }

      });

  }


  // ==========================================
  // CALCULATE SUMMARY
  // ==========================================

  calculateSummary(
    invoices: any[]
  ): void {

    let pending = 0;

    let paid = 0;

    let overdue = 0;


    invoices.forEach(
      invoice => {

        switch (
          invoice.status
        ) {

          case 'Pending':

            pending++;

            break;


          case 'Paid':

            paid++;

            break;


          case 'Overdue':

            overdue++;

            break;

        }

      }
    );


    this.totalInvoices.set(
      invoices.length
    );

    this.pendingInvoices.set(
      pending
    );

    this.paidInvoices.set(
      paid
    );

    this.overdueInvoices.set(
      overdue
    );

  }


  // ==========================================
  // OPEN FORM
  // ==========================================

  openAddForm(): void {

    this.resetForm();

    this.showForm.set(true);

  }


  // ==========================================
  // CLOSE FORM
  // ==========================================

  closeForm(): void {

    this.showForm.set(false);

    this.resetForm();

  }


  // ==========================================
  // RESET FORM
  // ==========================================

  resetForm(): void {

    this.invoiceNumber = '';

    this.selectedOrderId = null;

    this.selectedVendorId = null;

    this.amount = 0;

    this.invoiceDate = '';

    this.dueDate = '';

    this.status = 'Pending';

  }


  // ==========================================
  // CREATE INVOICE
  // ==========================================

  saveInvoice(): void {

    // ========================================
    // VALIDATION
    // ========================================

    if (
      !this.invoiceNumber.trim()
    ) {

      alert(
        'Please enter invoice number.'
      );

      return;

    }


    if (
      this.selectedOrderId === null
    ) {

      alert(
        'Please select an order.'
      );

      return;

    }


    if (
      this.selectedVendorId === null
    ) {

      alert(
        'Please select a vendor.'
      );

      return;

    }


    if (
      this.amount < 0
    ) {

      alert(
        'Amount cannot be negative.'
      );

      return;

    }


    if (!this.invoiceDate) {

      alert(
        'Please select invoice date.'
      );

      return;

    }


    if (!this.dueDate) {

      alert(
        'Please select due date.'
      );

      return;

    }


    if (
      this.dueDate <
      this.invoiceDate
    ) {

      alert(
        'Due date cannot be before invoice date.'
      );

      return;

    }


    // ========================================
    // REQUEST DATA
    // ========================================

    const data = {

      invoice_number:
        this.invoiceNumber.trim(),

      order_id:
        this.selectedOrderId,

      vendor_id:
        this.selectedVendorId,

      amount:
        this.amount,

      invoice_date:
        this.invoiceDate,

      due_date:
        this.dueDate

    };


    // ========================================
    // CREATE
    // ========================================

    this.invoiceService
      .createInvoice(data)
      .subscribe({

        next: () => {

          alert(
            'Invoice created successfully.'
          );

          this.closeForm();

          this.loadInvoices();

        },

        error: (error: any) => {

          console.error(
            'Create invoice error:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to create invoice.'
          );

        }

      });

  }


  // ==========================================
  // UPDATE STATUS
  // ==========================================

  updateStatus(
    invoiceId: number,
    newStatus: string
  ): void {

    this.invoiceService
      .updateInvoiceStatus(
        invoiceId,
        {
          status: newStatus
        }
      )
      .subscribe({

        next: () => {

          this.loadInvoices();

        },

        error: (error: any) => {

          console.error(
            'Update invoice status error:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to update invoice status.'
          );

        }

      });

  }


  // ==========================================
  // DELETE INVOICE
  // ==========================================

  deleteInvoice(
    id: number
  ): void {

    const confirmed =
      confirm(
        'Are you sure you want to delete this invoice?'
      );


    if (!confirmed) {

      return;

    }


    this.invoiceService
      .deleteInvoice(id)
      .subscribe({

        next: () => {

          alert(
            'Invoice deleted successfully.'
          );

          this.loadInvoices();

        },

        error: (error: any) => {

          console.error(
            'Delete invoice error:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to delete invoice.'
          );

        }

      });

  }


  // ==========================================
  // GET VENDOR NAME
  // ==========================================

  getVendorName(
    vendorId: number
  ): string {

    const vendor =
      this.vendors().find(
        item =>
          item.id === vendorId
      );


    return vendor
      ? vendor.vendor_name
      : `Vendor #${vendorId}`;

  }


  // ==========================================
  // GET ORDER
  // ==========================================

  getOrder(
    orderId: number
  ): any {

    return this.orders().find(
      order =>
        order.id === orderId
    );

  }


  // ==========================================
  // GET ORDER NAME
  // ==========================================

  getOrderName(
    orderId: number
  ): string {

    const order =
      this.getOrder(orderId);


    return order
      ? `#${order.id} - ${order.product_name}`
      : `Order #${orderId}`;

  }


  // ==========================================
  // FORMAT AMOUNT
  // ==========================================

  formatAmount(
    amount: number
  ): string {

    return Number(
      amount || 0
    ).toLocaleString(
      'en-IN'
    );

  }


  // ==========================================
  // STATUS CLASS
  // ==========================================

  getStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'Paid':

        return 'status-paid';


      case 'Overdue':

        return 'status-overdue';


      case 'Cancelled':

        return 'status-cancelled';


      case 'Pending':

        return 'status-pending';


      default:

        return '';

    }

  }

}