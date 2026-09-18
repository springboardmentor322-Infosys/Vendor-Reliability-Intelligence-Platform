import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private apiUrl = 'http://127.0.0.1:8000';

  vendors: any[] = [];
  procurements: any[] = [];
  purchaseOrders: any[] = [];

  loading = true;

  totalVendors = 0;
  totalProcurements = 0;
  totalPurchaseOrders = 0;

  exportingExcel = false;
  exportingPdf = false;

  // Vendor ID -> Vendor Name
  vendorNames: { [key: number]: string } = {
    1: 'Tech Solutions Pvt Ltd',
    2: 'Global Office Supplies',
    3: 'ABC Technologies',
    9: 'Sri Lakshmi Industries',
    10: 'Prime Solutions',
    12: 'Reliable IT Solutions',
    16: 'Bharat Tech Supplies'
  };

  // =========================================
  // INIT
  // =========================================

  ngOnInit(): void {
    this.loadReports();
  }

  // =========================================
  // LOAD REPORTS
  // =========================================

  loadReports(): void {

    this.loading = true;

    // =========================================
    // LOAD VENDORS
    // =========================================

    this.http.get<any[]>(
      `${this.apiUrl}/vendors/`
    ).subscribe({

      next: (data: any[]) => {

        console.log(
          'VENDOR REPORT:',
          data
        );

        this.vendors = Array.isArray(data)
          ? data
          : [];

        this.totalVendors =
          this.vendors.length;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'VENDOR REPORT ERROR:',
          error
        );

        this.vendors = [];
        this.totalVendors = 0;

        this.cdr.detectChanges();
      }

    });

    // =========================================
    // LOAD PROCUREMENTS
    // =========================================

    this.http.get<any[]>(
      `${this.apiUrl}/procurements/`
    ).subscribe({

      next: (data: any[]) => {

        console.log(
          'PROCUREMENT REPORT:',
          data
        );

        this.procurements =
          Array.isArray(data)
            ? data
            : [];

        this.totalProcurements =
          this.procurements.length;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'PROCUREMENT REPORT ERROR:',
          error
        );

        this.procurements = [];
        this.totalProcurements = 0;

        this.cdr.detectChanges();
      }

    });

    // =========================================
    // LOAD PURCHASE ORDERS
    // =========================================

    this.http.get<any[]>(
      `${this.apiUrl}/purchaseorders/`
    ).subscribe({

      next: (data: any[]) => {

        console.log(
          'PURCHASE ORDER REPORT:',
          data
        );

        this.purchaseOrders =
          Array.isArray(data)
            ? data
            : [];

        this.totalPurchaseOrders =
          this.purchaseOrders.length;

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'PURCHASE ORDER REPORT ERROR:',
          error
        );

        this.purchaseOrders = [];

        this.totalPurchaseOrders = 0;

        this.loading = false;

        this.cdr.detectChanges();
      }

    });

  }

  // =========================================
  // DOWNLOAD EXCEL REPORT
  // =========================================

  downloadExcelReport(): void {

    if (this.exportingExcel) {
      return;
    }

    this.exportingExcel = true;

    console.log(
      'Downloading Excel report...'
    );

    this.http.get(
      `${this.apiUrl}/export/vendor-performance`,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: (blob: Blob) => {

        console.log(
          'Excel report received:',
          blob
        );

        if (
          !blob ||
          blob.size === 0
        ) {

          console.error(
            'Excel report is empty.'
          );

          this.exportingExcel = false;

          return;
        }

        this.downloadFile(
          blob,
          'vendor_performance_report.xlsx'
        );

        this.exportingExcel = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'EXCEL REPORT ERROR:',
          error
        );

        this.exportingExcel = false;

        this.cdr.detectChanges();
      }

    });

  }

  // =========================================
  // DOWNLOAD PDF REPORT
  // =========================================

  downloadPdfReport(): void {

    if (this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;

    console.log(
      'Downloading PDF report...'
    );

    this.http.get(
      `${this.apiUrl}/export/vendor-performance/pdf`,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: (blob: Blob) => {

        console.log(
          'PDF report received:',
          blob
        );

        if (
          !blob ||
          blob.size === 0
        ) {

          console.error(
            'PDF report is empty.'
          );

          this.exportingPdf = false;

          return;
        }

        this.downloadFile(
          blob,
          'vendor_performance_report.pdf'
        );

        this.exportingPdf = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'PDF REPORT ERROR:',
          error
        );

        this.exportingPdf = false;

        this.cdr.detectChanges();
      }

    });

  }

  // =========================================
  // DOWNLOAD FILE
  // =========================================

  private downloadFile(
    blob: Blob,
    fileName: string
  ): void {

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);

  }

  // =========================================
  // GET VENDOR NAME
  // =========================================

  getVendorName(
    vendor: any
  ): string {

    // If complete vendor object is provided
    const directName =
      vendor?.vendor_name ||
      vendor?.name ||
      vendor?.company_name ||
      vendor?.vendor;

    if (
      directName &&
      directName !== 'string'
    ) {

      return String(directName).trim();

    }

    // If only vendor ID is provided
    const vendorId =
      Number(
        vendor?.vendor_id ??
        vendor?.id
      );

    if (
      this.vendorNames[vendorId]
    ) {

      return this.vendorNames[vendorId];

    }

    return `Vendor ID ${vendorId}`;
  }

  // =========================================
  // GET PROCUREMENT VENDOR NAME
  // =========================================

  getProcurementVendorName(
    procurement: any
  ): string {

    const vendorId =
      Number(procurement?.vendor_id);

    return (
      this.vendorNames[vendorId] ||
      `Vendor ID ${vendorId}`
    );
  }

  // =========================================
  // GET PURCHASE ORDER VENDOR NAME
  // =========================================

  getPurchaseOrderVendorName(
    order: any
  ): string {

    const vendorId =
      Number(order?.vendor_id);

    return (
      this.vendorNames[vendorId] ||
      `Vendor ID ${vendorId}`
    );
  }

  // =========================================
  // RISK CLASS
  // =========================================

  getRiskClass(
    risk: any
  ): string {

    const value =
      String(
        risk || ''
      ).toLowerCase();

    if (
      value.includes('high')
    ) {

      return 'risk-high';

    }

    if (
      value.includes('medium')
    ) {

      return 'risk-medium';

    }

    if (
      value.includes('low')
    ) {

      return 'risk-low';

    }

    if (
      value.includes('pending') ||
      value.includes('review')
    ) {

      return 'risk-pending';

    }

    return 'risk-pending';
  }

}
