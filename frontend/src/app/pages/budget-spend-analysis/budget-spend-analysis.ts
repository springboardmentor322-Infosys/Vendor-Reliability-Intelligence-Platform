import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Order } from '../../services/order';
import { Vendor } from '../../services/vendor';
import { RoleDirective } from '../../directives/role.directive';
import { ToastService } from '../../services/toast';


@Component({
  selector: 'app-budget-spend-analysis',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './budget-spend-analysis.html',

  styleUrl: './budget-spend-analysis.css'
})


export class BudgetSpendAnalysis implements OnInit {


  // ==========================================
  // DATA
  // ==========================================

  orders = signal<any[]>([]);

  vendors = signal<any[]>([]);


  // ==========================================
  // FILTERS
  // ==========================================

  selectedVendor = 'All';

  selectedStatus = 'All';

  searchText = '';


  // ==========================================
  // BUDGET
  // ==========================================

  // Default budget for analysis.
  // This is configurable from the page.

  budget = 40000000;


  // ==========================================
  // LOADING
  // ==========================================

  loading = signal(false);


  constructor(
    private orderService: Order,
    private vendorService: Vendor,
    private toastService: ToastService
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadOrders();

    this.loadVendors();

  }


  // ==========================================
  // LOAD ORDERS
  // ==========================================

  loadOrders(): void {

    this.loading.set(true);

    this.orderService
      .getOrders()
      .subscribe({

        next: (response: any[]) => {

          this.orders.set(response || []);

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load orders:',
            error
          );

          this.orders.set([]);

          this.loading.set(false);

          this.toastService.show(
            'Failed to load order data.',
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

        next: (response: any[]) => {

          this.vendors.set(response || []);

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
  // REFRESH
  // ==========================================

  refresh(): void {

    this.loadOrders();

    this.loadVendors();

  }


  // ==========================================
  // FILTERED ORDERS
  // ==========================================

  get filteredOrders(): any[] {

    const search =
      this.searchText
        .toLowerCase()
        .trim();


    return this.orders().filter(order => {

      const vendorName =
        this.getVendorName(
          order.vendor_id
        ).toLowerCase();


      const matchesVendor =
        this.selectedVendor === 'All' ||
        String(order.vendor_id) ===
        String(this.selectedVendor);


      const matchesStatus =
        this.selectedStatus === 'All' ||
        order.status === this.selectedStatus;


      const matchesSearch =
        !search ||
        vendorName.includes(search) ||
        String(order.product_name || '')
          .toLowerCase()
          .includes(search);


      return (
        matchesVendor &&
        matchesStatus &&
        matchesSearch
      );

    });

  }


  // ==========================================
  // TOTAL SPEND
  // ==========================================

  get totalSpend(): number {

    return this.filteredOrders.reduce(
      (total, order) =>
        total + Number(order.amount || 0),
      0
    );

  }


  // ==========================================
  // REMAINING BUDGET
  // ==========================================

  get remainingBudget(): number {

    return Math.max(
      this.budget - this.totalSpend,
      0
    );

  }


  // ==========================================
  // BUDGET UTILIZATION
  // ==========================================

  get budgetUtilization(): number {

    if (!this.budget) {
      return 0;
    }

    return Math.min(
      (this.totalSpend / this.budget) * 100,
      100
    );

  }


  // ==========================================
  // TOTAL ORDERS
  // ==========================================

  get totalOrders(): number {

    return this.filteredOrders.length;

  }


  // ==========================================
  // AVERAGE ORDER VALUE
  // ==========================================

  get averageOrderValue(): number {

    if (!this.totalOrders) {
      return 0;
    }

    return this.totalSpend /
      this.totalOrders;

  }


  // ==========================================
  // COMPLETED SPEND
  // ==========================================

  get completedSpend(): number {

    return this.filteredOrders

      .filter(
        order =>
          order.status === 'Completed'
      )

      .reduce(
        (total, order) =>
          total + Number(order.amount || 0),
        0
      );

  }


  // ==========================================
  // PENDING SPEND
  // ==========================================

  get pendingSpend(): number {

    return this.filteredOrders

      .filter(
        order =>
          order.status === 'Pending'
      )

      .reduce(
        (total, order) =>
          total + Number(order.amount || 0),
        0
      );

  }


  // ==========================================
  // ORDERED SPEND
  // ==========================================

  get orderedSpend(): number {

    return this.filteredOrders

      .filter(
        order =>
          order.status === 'Ordered'
      )

      .reduce(
        (total, order) =>
          total + Number(order.amount || 0),
        0
      );

  }


  // ==========================================
  // APPROVED SPEND
  // ==========================================

  get approvedSpend(): number {

    return this.filteredOrders

      .filter(
        order =>
          order.status === 'Approved'
      )

      .reduce(
        (total, order) =>
          total + Number(order.amount || 0),
        0
      );

  }


  // ==========================================
  // VENDOR SPEND
  // ==========================================

  get vendorSpend(): any[] {

    const map =
      new Map<
        number,
        {
          vendorId: number;
          vendorName: string;
          orders: number;
          spend: number;
        }
      >();


    this.filteredOrders.forEach(order => {

      const vendorId =
        Number(order.vendor_id);

      const existing =
        map.get(vendorId);


      if (existing) {

        existing.orders += 1;

        existing.spend +=
          Number(order.amount || 0);

      }

      else {

        map.set(
          vendorId,
          {
            vendorId,

            vendorName:
              this.getVendorName(
                vendorId
              ),

            orders: 1,

            spend:
              Number(order.amount || 0)
          }
        );

      }

    });


    const total =
      this.totalSpend || 1;


    return Array.from(
      map.values()
    )

      .map(item => ({

        ...item,

        percentage:
          (item.spend / total) * 100

      }))

      .sort(
        (a, b) =>
          b.spend - a.spend
      );

  }


  // ==========================================
  // TOP VENDORS
  // ==========================================

  get topVendors(): any[] {

    return this.vendorSpend
      .slice(0, 5);

  }


  // ==========================================
  // STATUS SPEND
  // ==========================================

  getStatusSpend(
    status: string
  ): number {

    return this.filteredOrders

      .filter(
        order =>
          order.status === status
      )

      .reduce(
        (total, order) =>
          total + Number(order.amount || 0),
        0
      );

  }


  // ==========================================
  // STATUS PERCENTAGE
  // ==========================================

  getStatusPercentage(
    status: string
  ): number {

    if (!this.totalSpend) {
      return 0;
    }

    return (
      this.getStatusSpend(status) /
      this.totalSpend
    ) * 100;

  }


  // ==========================================
  // VENDOR NAME
  // ==========================================

  getVendorName(
    vendorId: number
  ): string {

    const vendor =
      this.vendors().find(
        item =>
          Number(item.id) ===
          Number(vendorId)
      );


    return vendor
      ? vendor.vendor_name
      : `Vendor #${vendorId}`;

  }


  // ==========================================
  // FORMAT CURRENCY
  // ==========================================

  formatCurrency(
    amount: number
  ): string {

    return Number(
      amount || 0
    ).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2
      }
    );

  }


  // ==========================================
  // BUDGET STATUS
  // ==========================================

  getBudgetStatus(): string {

    const percentage =
      this.budgetUtilization;


    if (percentage >= 90) {
      return 'Critical';
    }


    if (percentage >= 75) {
      return 'Attention';
    }


    return 'Healthy';

  }


  // ==========================================
  // BUDGET STATUS CLASS
  // ==========================================

  getBudgetStatusClass(): string {

    const percentage =
      this.budgetUtilization;


    if (percentage >= 90) {
      return 'critical';
    }


    if (percentage >= 75) {
      return 'attention';
    }


    return 'healthy';

  }


  // ==========================================
  // SET BUDGET
  // ==========================================

  updateBudget(
    value: any
  ): void {

    const newBudget =
      Number(value);


    if (
      !newBudget ||
      newBudget < 0
    ) {

      return;

    }


    this.budget =
      newBudget;

  }


}