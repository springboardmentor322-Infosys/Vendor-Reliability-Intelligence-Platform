import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastService } from '../../services/toast';
import { Order } from '../../services/order';
import { Vendor } from '../../services/vendor';


@Component({
  selector: 'app-add-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './add-order.html',
  styleUrl: './add-order.css'
})
export class AddOrder implements OnInit {

  // ================================
  // VENDORS
  // ================================

  vendors: any[] = [];


  // ================================
  // ORDER
  // ================================

  orderId: number | null = null;

  vendor_id: number | null = null;

  product_name = '';

  quantity = 1;

  unit_price = 0;

  amount = 0;

  status = 'Pending';

  expected_delivery_date = '';


  constructor(
    private orderService: Order,
    private vendorService: Vendor,
    private router: Router,
    private toastService: ToastService
  ) {}


  // ================================
  // INITIALIZE
  // ================================

  ngOnInit(): void {

    this.loadVendors();


    const storedOrder =
      localStorage.getItem('editOrder');


    if (storedOrder) {

      try {

        const order =
          JSON.parse(storedOrder);


        this.orderId =
          order.id;


        this.vendor_id =
          order.vendor_id;


        this.product_name =
          order.product_name || '';


        this.quantity =
          order.quantity || 1;


        this.amount =
          order.amount || 0;


        // Existing orders only store the total amount, so derive the
        // unit price when opening an order for editing.
        this.unit_price =
          this.quantity > 0
            ? this.amount / this.quantity
            : 0;

        this.calculateTotalAmount();


        this.status =
          order.status || 'Pending';


        this.expected_delivery_date =
          order.expected_delivery_date || '';


        localStorage.removeItem(
          'editOrder'
        );

      }

      catch (error) {

        console.error(
          'Error loading order:',
          error
        );


        localStorage.removeItem(
          'editOrder'
        );

      }

    }

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


          this.toastService.show(
            'Failed to load vendors.',
            'error'
          );

        }

      });

  }


  // ================================
  // CALCULATE TOTAL AMOUNT
  // ================================

  calculateTotalAmount(): void {

    const quantity = Number(this.quantity) || 0;
    const unitPrice = Number(this.unit_price) || 0;

    this.amount = Number((quantity * unitPrice).toFixed(2));

  }


  // ================================
  // SAVE / UPDATE ORDER
  // ================================

  saveOrder(): void {

    // ================================
    // VALIDATE VENDOR
    // ================================

    if (this.vendor_id === null) {

      this.toastService.show(
        'Please select a vendor.',
        'error'
      );

      return;

    }


    // ================================
    // VALIDATE PRODUCT
    // ================================

    if (!this.product_name.trim()) {

      this.toastService.show(
        'Please enter a product name.',
        'error'
      );

      return;

    }


    // ================================
    // VALIDATE QUANTITY
    // ================================

    if (
      this.quantity <= 0 ||
      !Number.isFinite(this.quantity)
    ) {

      this.toastService.show(
        'Quantity must be greater than 0.',
        'error'
      );

      return;

    }


    // ================================
    // VALIDATE UNIT PRICE
    // ================================

    if (
      this.unit_price < 0 ||
      !Number.isFinite(this.unit_price)
    ) {

      this.toastService.show(
        'Unit price cannot be negative.',
        'error'
      );

      return;

    }


    // Always calculate the total from quantity and unit price
    // before sending the order to the backend.
    this.calculateTotalAmount();


    // ================================
    // PREPARE DATA
    // ================================

    const data: any = {

      vendor_id:
        this.vendor_id,

      product_name:
        this.product_name.trim(),

      quantity:
        this.quantity,

      amount:
        this.amount,

      status:
        this.status,

      expected_delivery_date:
        this.expected_delivery_date || null

    };


    // ================================
    // UPDATE ORDER
    // ================================

    if (this.orderId !== null) {

      this.orderService
        .updateOrder(
          this.orderId,
          data
        )
        .subscribe({

          next: () => {

            this.toastService.show(
              'Order updated successfully!',
              'success'
            );


            this.router.navigate([
              '/orders'
            ]);

          },


          error: (error) => {

            console.error(
              'Failed to update order:',
              error
            );


            this.toastService.show(
              error?.error?.detail ||
              'Failed to update order.',
              'error'
            );

          }

        });


      return;

    }


    // ================================
    // CREATE ORDER
    // ================================

    this.orderService
      .createOrder(data)
      .subscribe({

        next: () => {

          this.toastService.show(
            'Order added successfully!',
            'success'
          );


          this.router.navigate([
            '/orders'
          ]);

        },


        error: (error) => {

          console.error(
            'Failed to create order:',
            error
          );


          this.toastService.show(
            error?.error?.detail ||
            'Failed to add order.',
            'error'
          );

        }

      });

  }


  // ================================
  // CANCEL
  // ================================

  cancel(): void {

    localStorage.removeItem(
      'editOrder'
    );


    this.router.navigate([
      '/orders'
    ]);

  }

}