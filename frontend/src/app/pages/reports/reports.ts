import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Report } from '../../services/report';
import { Vendor } from '../../services/vendor';


@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {

  // ==========================================
  // ORDERS
  // ==========================================

  orders =
    signal<any[]>([]);


  filteredOrders =
    signal<any[]>([]);


  // ==========================================
  // VENDORS
  // ==========================================

  vendors =
    signal<any[]>([]);


  // ==========================================
  // VENDOR PERFORMANCE
  // ==========================================

  vendorPerformance =
    signal<any[]>([]);


  // ==========================================
  // PROCUREMENT
  // ==========================================

  procurement =
    signal<any[]>([]);


  // ==========================================
  // CONTRACTS
  // ==========================================

  contracts =
    signal<any[]>([]);


  // ==========================================
  // COMPLIANCE
  // ==========================================

  compliance =
    signal<any[]>([]);


  // ==========================================
  // INVOICES
  // ==========================================

  invoices =
    signal<any[]>([]);


  // ==========================================
  // FILTERS
  // ==========================================

  selectedStatus =
    'All';

  selectedVendor =
    'All';


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);


  // ==========================================
  // REPORT SUMMARY
  // ==========================================

  totalRevenue =
    signal(0);

  totalOrders =
    signal(0);

  pendingOrders =
    signal(0);

  approvedOrders =
    signal(0);

  orderedOrders =
    signal(0);

  deliveredOrders =
    signal(0);

  completedOrders =
    signal(0);

  cancelledOrders =
    signal(0);


  // ==========================================
  // SUMMARY DATA
  // ==========================================

  totalVendors =
    signal(0);

  totalProcurementRequests =
    signal(0);

  totalProcurementValue =
    signal(0);

  totalContracts =
    signal(0);

  totalContractValue =
    signal(0);

  totalInvoices =
    signal(0);

  totalInvoiceValue =
    signal(0);


  // ==========================================
  // EXPORT LOADING
  // ==========================================

  exporting =
    signal(false);


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private reportService: Report,
    private vendorService: Vendor
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadReports();

  }


  // ==========================================
  // LOAD ALL REPORT DATA
  // ==========================================

  loadReports(): void {

    this.loading.set(true);


    this.loadVendors();

    this.loadSummary();

    this.loadOrders();

    this.loadOrderStatusSummary();

    this.loadVendorPerformance();

    this.loadProcurement();

    this.loadContracts();

    this.loadCompliance();

    this.loadInvoices();

  }


  // ==========================================
  // LOAD SUMMARY
  // ==========================================

  loadSummary(): void {

    this.reportService
      .getSummary()
      .subscribe({

        next: (response: any) => {

          // ----------------------------------
          // VENDORS
          // ----------------------------------

          this.totalVendors.set(
            Number(
              response?.vendors?.total
            ) || 0
          );


          // ----------------------------------
          // ORDERS
          // ----------------------------------

          this.totalOrders.set(
            Number(
              response?.orders?.total
            ) || 0
          );


          this.totalRevenue.set(
            Number(
              response?.orders?.total_value
            ) || 0
          );


          // ----------------------------------
          // PROCUREMENT
          // ----------------------------------

          this.totalProcurementRequests.set(
            Number(
              response?.procurement?.total_requests
            ) || 0
          );


          this.totalProcurementValue.set(
            Number(
              response?.procurement?.total_value
            ) || 0
          );


          // ----------------------------------
          // CONTRACTS
          // ----------------------------------

          this.totalContracts.set(
            Number(
              response?.contracts?.total
            ) || 0
          );


          this.totalContractValue.set(
            Number(
              response?.contracts?.total_value
            ) || 0
          );


          // ----------------------------------
          // INVOICES
          // ----------------------------------

          this.totalInvoices.set(
            Number(
              response?.invoices?.total
            ) || 0
          );


          this.totalInvoiceValue.set(
            Number(
              response?.invoices?.total_value
            ) || 0
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load report summary:',
            error
          );

        }

      });

  }


  // ==========================================
  // LOAD ORDER STATUS SUMMARY
  // ==========================================

  loadOrderStatusSummary(): void {

    this.reportService
      .getOrderStatusSummary()
      .subscribe({

        next: (response: Record<string, number>) => {

          this.pendingOrders.set(Number(response?.['Pending']) || 0);
          this.approvedOrders.set(Number(response?.['Approved']) || 0);
          this.orderedOrders.set(Number(response?.['Ordered']) || 0);
          this.deliveredOrders.set(Number(response?.['Delivered']) || 0);
          this.completedOrders.set(Number(response?.['Completed']) || 0);
          this.cancelledOrders.set(Number(response?.['Cancelled']) || 0);

        },

        error: (error: any) => {

          console.error(
            'Failed to load order status summary:',
            error
          );

        }

      });

  }


  // ==========================================
  // LOAD ORDERS
  // ==========================================

  loadOrders(): void {

    this.reportService
      .getOrders()
      .subscribe({

        next: (response: any[]) => {

          const data =
            response || [];


          this.orders.set(
            data
          );


          this.filteredOrders.set(
            data
          );


          this.calculateOrderStatusData(
            data
          );


          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load order report:',
            error
          );


          this.orders.set([]);

          this.filteredOrders.set([]);

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
            response || []
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
  // LOAD VENDOR PERFORMANCE
  // ==========================================

  loadVendorPerformance(): void {

    this.reportService
      .getVendorPerformance()
      .subscribe({

        next: (response: any[]) => {

          this.vendorPerformance.set(
            response || []
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load vendor performance:',
            error
          );


          this.vendorPerformance.set([]);

        }

      });

  }


  // ==========================================
  // LOAD PROCUREMENT
  // ==========================================

  loadProcurement(): void {

    this.reportService
      .getProcurement()
      .subscribe({

        next: (response: any[]) => {

          this.procurement.set(
            response || []
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load procurement report:',
            error
          );


          this.procurement.set([]);

        }

      });

  }


  // ==========================================
  // LOAD CONTRACTS
  // ==========================================

  loadContracts(): void {

    this.reportService
      .getContracts()
      .subscribe({

        next: (response: any[]) => {

          this.contracts.set(
            response || []
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load contract report:',
            error
          );


          this.contracts.set([]);

        }

      });

  }


  // ==========================================
  // LOAD COMPLIANCE
  // ==========================================

  loadCompliance(): void {

    this.reportService
      .getCompliance()
      .subscribe({

        next: (response: any[]) => {

          this.compliance.set(
            response || []
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load compliance report:',
            error
          );


          this.compliance.set([]);

        }

      });

  }


  // ==========================================
  // LOAD INVOICES
  // ==========================================

  loadInvoices(): void {

    this.reportService
      .getInvoices()
      .subscribe({

        next: (response: any[]) => {

          this.invoices.set(
            response || []
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load invoice report:',
            error
          );


          this.invoices.set([]);

        }

      });

  }


  // ==========================================
  // FILTER ORDERS
  // ==========================================

  filterOrders(): void {

    const allOrders =
      this.orders();


    let filtered =
      [...allOrders];


    // ----------------------------------------
    // STATUS
    // ----------------------------------------

    if (
      this.selectedStatus !== 'All'
    ) {

      filtered =
        filtered.filter(
          order =>
            order.status ===
            this.selectedStatus
        );

    }


    // ----------------------------------------
    // VENDOR
    // ----------------------------------------

    if (
      this.selectedVendor !== 'All'
    ) {

      filtered =
        filtered.filter(
          order =>
            String(
              order.vendor_id
            ) ===
            String(
              this.selectedVendor
            )
        );

    }


    this.filteredOrders.set(
      filtered
    );


    this.calculateOrderStatusData(
      filtered
    );

  }


  // ==========================================
  // RESET FILTERS
  // ==========================================

  resetFilters(): void {

    this.selectedStatus =
      'All';

    this.selectedVendor =
      'All';


    const allOrders =
      this.orders();


    this.filteredOrders.set(
      allOrders
    );


    this.calculateOrderStatusData(
      allOrders
    );

  }


  // ==========================================
  // CALCULATE ORDER STATUS DATA
  // ==========================================

  calculateOrderStatusData(
    orders: any[]
  ): void {

    let revenue = 0;

    let pending = 0;

    let approved = 0;

    let ordered = 0;

    let delivered = 0;

    let completed = 0;

    let cancelled = 0;


    orders.forEach(
      order => {

        revenue +=
          Number(
            order.amount
          ) || 0;


        switch (
          order.status
        ) {

          case 'Pending':

            pending++;

            break;


          case 'Approved':

            approved++;

            break;


          case 'Ordered':

            ordered++;

            break;


          case 'Delivered':

            delivered++;

            break;


          case 'Completed':

            completed++;

            break;


          case 'Cancelled':

            cancelled++;

            break;

        }

      }
    );


    this.totalRevenue.set(
      revenue
    );


    this.totalOrders.set(
      orders.length
    );


    this.pendingOrders.set(
      pending
    );


    this.approvedOrders.set(
      approved
    );


    this.orderedOrders.set(
      ordered
    );


    this.deliveredOrders.set(
      delivered
    );


    this.completedOrders.set(
      completed
    );


    this.cancelledOrders.set(
      cancelled
    );

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
  // STATUS PERCENTAGE
  // ==========================================

  getStatusPercentage(
    count: number
  ): number {

    const total =
      this.filteredOrders().length;


    if (
      total === 0
    ) {

      return 0;

    }


    return Math.round(
      (
        count /
        total
      ) * 100
    );

  }


  // ==========================================
  // BAR WIDTH
  // ==========================================

  getBarWidth(
    count: number
  ): string {

    const total =
      this.filteredOrders().length;


    if (
      total === 0
    ) {

      return '0%';

    }


    return `${
      (
        count /
        total
      ) * 100
    }%`;

  }


  // ==========================================
  // AVERAGE ORDER VALUE
  // ==========================================

  getAverageOrderValue(): number {

    const total =
      this.totalOrders();


    if (
      total === 0
    ) {

      return 0;

    }


    return (
      this.totalRevenue() /
      total
    );

  }


  // ==========================================
  // EXPORT EXCEL
  // ==========================================

  exportExcel(
    reportType: string
  ): void {

    this.exporting.set(true);


    this.reportService
      .downloadExcel(
        reportType
      )
      .subscribe({

        next: (blob: Blob) => {

          this.downloadFile(
            blob,
            `${reportType}-report.xlsx`
          );


          this.exporting.set(false);

        },

        error: (error: any) => {

          console.error(
            'Excel export failed:',
            error
          );


          this.exporting.set(false);

        }

      });

  }


  // ==========================================
  // EXPORT PDF
  // ==========================================

  exportPdf(
    reportType: string
  ): void {

    this.exporting.set(true);


    this.reportService
      .downloadPdf(
        reportType
      )
      .subscribe({

        next: (blob: Blob) => {

          this.downloadFile(
            blob,
            `${reportType}-report.pdf`
          );


          this.exporting.set(false);

        },

        error: (error: any) => {

          console.error(
            'PDF export failed:',
            error
          );


          this.exporting.set(false);

        }

      });

  }


  // ==========================================
  // DOWNLOAD FILE
  // ==========================================

  private downloadFile(
    blob: Blob,
    filename: string
  ): void {

    const url =
      window.URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    link.href =
      url;


    link.download =
      filename;


    link.click();


    window.URL.revokeObjectURL(
      url
    );

  }

}