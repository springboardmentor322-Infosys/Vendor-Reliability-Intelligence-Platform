
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './purchase-orders.html',
  styleUrl: './purchase-orders.css'
})
export class PurchaseOrders implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private apiUrl = 'http://127.0.0.1:8000';

  purchaseOrders: any[] = [];
  vendors: any[] = [];
  procurements: any[] = [];

  loading = false;
  loadingVendors = false;
  loadingProcurements = false;
  submitting = false;

  successMessage = '';
  errorMessage = '';

  purchaseOrder = {
    order_number: '',
    vendor_id: '',
    procurement_id: '',
    order_date: '',
    amount: 0,
    status: 'Pending'
  };


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  ngOnInit(): void {
    this.loadPurchaseOrderData();
  }


  // ============================================================
  // LOAD VENDORS + PROCUREMENT + PURCHASE ORDERS TOGETHER
  // ============================================================

  loadPurchaseOrderData(): void {

    this.loading = true;
    this.loadingVendors = true;
    this.loadingProcurements = true;
    this.errorMessage = '';

    forkJoin({
      vendors: this.http.get<any[]>(
        `${this.apiUrl}/vendors/`
      ),

      procurements: this.http.get<any[]>(
        `${this.apiUrl}/procurements/`
      ),

      purchaseOrders: this.http.get<any[]>(
        `${this.apiUrl}/purchaseorders/`
      )
    }).subscribe({

      next: (response) => {

        console.log(
          'PURCHASE ORDER DATA:',
          response
        );


        // --------------------------------------------------------
        // VENDORS
        // --------------------------------------------------------

        this.vendors =
          Array.isArray(response.vendors)
            ? response.vendors
            : [];

        console.log(
          'VENDORS:',
          this.vendors
        );


        // --------------------------------------------------------
        // PROCUREMENT RECORDS
        // --------------------------------------------------------

        this.procurements =
          Array.isArray(response.procurements)
            ? response.procurements
            : [];

        console.log(
          'PROCUREMENTS:',
          this.procurements
        );


        // --------------------------------------------------------
        // PURCHASE ORDERS
        // --------------------------------------------------------

        const orders =
          Array.isArray(response.purchaseOrders)
            ? response.purchaseOrders
            : [];


        this.purchaseOrders =
          orders.map((po: any) => {

            const vendor =
              this.vendors.find(
                (v: any) =>
                  Number(v.id) ===
                  Number(po.vendor_id)
              );


            const procurement =
              this.procurements.find(
                (p: any) =>
                  Number(p.id) ===
                  Number(po.procurement_id)
              );


            console.log(
              `PO ${po.id} -> Vendor:`,
              vendor
            );

            console.log(
              `PO ${po.id} -> Procurement:`,
              procurement
            );


            return {

              ...po,


              // ------------------------------------------------
              // VENDOR NAME
              // ------------------------------------------------

              vendor_name:
                vendor
                  ? this.getVendorName(vendor)
                  : `Vendor #${po.vendor_id}`,


              // ------------------------------------------------
              // PROCUREMENT NAME
              // ------------------------------------------------

              procurement_name:
                procurement
                  ? (
                      procurement.item_name ||
                      procurement.name ||
                      `Procurement #${po.procurement_id}`
                    )
                  : `Procurement #${po.procurement_id}`
            };

          });


        console.log(
          'FINAL PURCHASE ORDERS:',
          this.purchaseOrders
        );


        this.loading = false;
        this.loadingVendors = false;
        this.loadingProcurements = false;

        this.cdr.detectChanges();
      },


      error: (error: any) => {

        console.error(
          'PURCHASE ORDER DATA ERROR:',
          error
        );

        console.error(
          'BACKEND ERROR:',
          error?.error
        );


        this.purchaseOrders = [];
        this.vendors = [];
        this.procurements = [];

        this.loading = false;
        this.loadingVendors = false;
        this.loadingProcurements = false;


        this.errorMessage =
          this.getErrorMessage(
            error,
            'Unable to load purchase order data.'
          );


        this.cdr.detectChanges();
      }

    });
  }


  // ============================================================
  // CREATE PURCHASE ORDER
  // ============================================================

  addPurchaseOrder(): void {

    this.successMessage = '';
    this.errorMessage = '';


    // ----------------------------------------------------------
    // ORDER NUMBER
    // ----------------------------------------------------------

    if (
      !this.purchaseOrder.order_number.trim()
    ) {

      this.errorMessage =
        'Please enter the purchase order number.';

      return;
    }


    // ----------------------------------------------------------
    // VENDOR
    // ----------------------------------------------------------

    if (
      this.purchaseOrder.vendor_id === '' ||
      this.purchaseOrder.vendor_id === null ||
      this.purchaseOrder.vendor_id === undefined
    ) {

      this.errorMessage =
        'Please select a vendor.';

      return;
    }


    // ----------------------------------------------------------
    // PROCUREMENT
    // ----------------------------------------------------------

    if (
      this.purchaseOrder.procurement_id === '' ||
      this.purchaseOrder.procurement_id === null ||
      this.purchaseOrder.procurement_id === undefined
    ) {

      this.errorMessage =
        'Please select a procurement request.';

      return;
    }


    // ----------------------------------------------------------
    // ORDER DATE
    // ----------------------------------------------------------

    if (!this.purchaseOrder.order_date) {

      this.errorMessage =
        'Please select the order date.';

      return;
    }


    // ----------------------------------------------------------
    // AMOUNT
    // ----------------------------------------------------------

    if (
      Number(this.purchaseOrder.amount) <= 0
    ) {

      this.errorMessage =
        'Order amount must be greater than 0.';

      return;
    }


    this.submitting = true;


    const payload = {

      order_number:
        this.purchaseOrder.order_number.trim(),

      vendor_id:
        Number(this.purchaseOrder.vendor_id),

      procurement_id:
        Number(this.purchaseOrder.procurement_id),

      order_date:
        this.purchaseOrder.order_date,

      amount:
        Number(this.purchaseOrder.amount),

      status:
        this.purchaseOrder.status || 'Pending'
    };


    console.log(
      'PURCHASE ORDER PAYLOAD:',
      payload
    );


    this.http.post(
      `${this.apiUrl}/purchaseorders/`,
      payload
    ).subscribe({

      next: (response: any) => {

        console.log(
          'PURCHASE ORDER CREATED:',
          response
        );


        this.successMessage =
          'Purchase order created successfully.';

        this.errorMessage = '';

        this.submitting = false;


        // ------------------------------------------------------
        // RESET FORM
        // ------------------------------------------------------

        this.purchaseOrder = {

          order_number: '',

          vendor_id: '',

          procurement_id: '',

          order_date: '',

          amount: 0,

          status: 'Pending'
        };


        // ------------------------------------------------------
        // RELOAD ALL DATA
        // ------------------------------------------------------

        this.loadPurchaseOrderData();


        this.cdr.detectChanges();
      },


      error: (error: any) => {

        console.error(
          'PURCHASE ORDER ERROR:',
          error
        );

        console.error(
          'BACKEND ERROR:',
          error?.error
        );

        console.error(
          'BACKEND DETAIL:',
          error?.error?.detail
        );


        this.errorMessage =
          this.getErrorMessage(
            error,
            'Unable to create purchase order.'
          );


        this.successMessage = '';

        this.submitting = false;

        this.cdr.detectChanges();
      }

    });
  }


  // ============================================================
  // GET VENDOR NAME
  // ============================================================

  getVendorName(vendor: any): string {

    const name =
      vendor?.vendor_name ||
      vendor?.name ||
      vendor?.company_name ||
      vendor?.vendor;


    if (
      !name ||
      name === 'string'
    ) {

      return 'Vendor';
    }


    return String(name);
  }


  // ============================================================
  // STATUS CLASS
  // ============================================================

  getStatusClass(status: any): string {

    const value =
      String(
        status || 'Pending'
      ).toLowerCase();


    if (
      value.includes('approved')
    ) {

      return 'approved';
    }


    if (
      value.includes('rejected')
    ) {

      return 'rejected';
    }


    if (
      value.includes('completed')
    ) {

      return 'completed';
    }


    return 'pending';
  }


  // ============================================================
  // ERROR MESSAGE
  // ============================================================

  getErrorMessage(
    error: any,
    defaultMessage: string
  ): string {

    const detail =
      error?.error?.detail;


    if (
      Array.isArray(detail)
    ) {

      return detail
        .map((item: any) => {

          if (
            typeof item === 'string'
          ) {

            return item;
          }


          if (item?.msg) {

            const location =
              Array.isArray(item?.loc)
                ? item.loc.join(' → ')
                : '';


            if (location) {

              return `${location}: ${item.msg}`;
            }


            return item.msg;
          }


          try {

            return JSON.stringify(item);

          } catch {

            return String(item);

          }

        })
        .join(' | ');
    }


    if (
      typeof detail === 'string'
    ) {

      return detail;
    }


    if (
      typeof error?.message === 'string'
    ) {

      return error.message;
    }


    return defaultMessage;
  }

}