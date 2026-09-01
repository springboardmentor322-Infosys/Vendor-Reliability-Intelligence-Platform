import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Vendor } from '../../services/vendor';
import { ToastService } from '../../services/toast';


@Component({
  selector: 'app-add-vendor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-vendor.html',
  styleUrl: './add-vendor.css'
})
export class AddVendor implements OnInit {

  // ================================
  // VENDOR ID
  // ================================

  vendorId: number | null = null;


  // ================================
  // VENDOR DETAILS
  // ================================

  vendor_name = '';

  email = '';

  phone = '';

  address = '';

  gst_number = '';

  category = '';

  contact_person = '';


  // ================================
  // CATEGORY OPTIONS
  // ================================

  categories = [

    'Raw Material Supplier',

    'Equipment Vendor',

    'IT Vendor',

    'Service Provider',

    'Logistics Partner',

    'Maintenance Vendor'

  ];


  // ================================
  // LOADING
  // ================================

  loading = false;


  constructor(
    private vendorService: Vendor,
    private router: Router,
    private toastService: ToastService
  ) {}


  // ================================
  // INITIALIZE FORM
  // ================================

  ngOnInit(): void {

    const storedVendor =
      localStorage.getItem('editVendor');


    if (!storedVendor) {

      return;

    }


    try {

      const vendor =
        JSON.parse(storedVendor);


      // ==============================
      // LOAD VENDOR ID
      // ==============================

      this.vendorId =
        vendor.id;


      // ==============================
      // LOAD VENDOR DETAILS
      // ==============================

      this.vendor_name =
        vendor.vendor_name || '';


      this.email =
        vendor.email || '';


      this.phone =
        vendor.phone || '';


      this.address =
        vendor.address || '';


      this.gst_number =
        vendor.gst_number || '';


      this.category =
        vendor.category || '';


      this.contact_person =
        vendor.contact_person || '';


      // ==============================
      // REMOVE TEMPORARY DATA
      // ==============================

      localStorage.removeItem(
        'editVendor'
      );

    }

    catch (error) {

      console.error(
        'Error loading vendor:',
        error
      );


      localStorage.removeItem(
        'editVendor'
      );

    }

  }


  // ================================
  // CANCEL
  // ================================

  cancel(): void {

    localStorage.removeItem(
      'editVendor'
    );


    this.router.navigate([
      '/vendors'
    ]);

  }


  // ================================
  // SAVE / UPDATE VENDOR
  // ================================

  saveVendor(): void {

    // ================================
    // VALIDATION
    // ================================

    if (
      !this.vendor_name.trim() ||
      !this.email.trim() ||
      !this.phone.trim() ||
      !this.address.trim() ||
      !this.gst_number.trim() ||
      !this.category.trim() ||
      !this.contact_person.trim()
    ) {

      this.toastService.show(
        'Please fill all vendor details.',
        'error'
      );

      return;

    }


    // ================================
    // PREVENT DOUBLE SUBMISSION
    // ================================

    if (this.loading) {

      return;

    }


    // ================================
    // REQUEST DATA
    // ================================

    const data = {

      vendor_name:
        this.vendor_name.trim(),

      email:
        this.email.trim(),

      phone:
        this.phone.trim(),

      address:
        this.address.trim(),

      gst_number:
        this.gst_number.trim(),

      category:
        this.category.trim(),

      contact_person:
        this.contact_person.trim()

    };


    this.loading = true;


    // ================================
    // UPDATE VENDOR
    // ================================

    if (this.vendorId !== null) {

      this.vendorService
        .updateVendor(
          this.vendorId,
          data
        )
        .subscribe({

          next: () => {

            this.loading = false;


            this.toastService.show(
              'Vendor updated successfully!',
              'success'
            );


            setTimeout(() => {

              this.router.navigate([
                '/vendors'
              ]);

            }, 500);

          },


          error: (error) => {

            console.error(
              'UPDATE VENDOR ERROR:',
              error
            );


            this.loading = false;


            this.toastService.show(
              error?.error?.detail ||
              'Failed to update vendor.',
              'error'
            );

          }

        });


      return;

    }


    // ================================
    // CREATE VENDOR
    // ================================

    this.vendorService
      .createVendor(data)
      .subscribe({

        next: () => {

          this.loading = false;


          this.toastService.show(
            'Vendor added successfully!',
            'success'
          );


          setTimeout(() => {

            this.router.navigate([
              '/vendors'
            ]);

          }, 500);

        },


        error: (error) => {

          console.error(
            'CREATE VENDOR ERROR:',
            error
          );


          this.loading = false;


          this.toastService.show(
            error?.error?.detail ||
            'Failed to add vendor.',
            'error'
          );

        }

      });

  }

}