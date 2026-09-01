import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CertificationService } from '../../services/certification.service';
import { Vendor } from '../../services/vendor';


@Component({
  selector: 'app-certification',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './certification.html',
  styleUrl: './certification.css'
})


export class Certification implements OnInit {


  // ==========================================
  // CERTIFICATION DATA
  // ==========================================

  certifications =
    signal<any[]>([]);


  // ==========================================
  // VENDOR DATA
  // ==========================================

  vendors =
    signal<any[]>([]);


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);


  // ==========================================
  // FORM VISIBILITY
  // ==========================================

  showForm =
    signal(false);


  // ==========================================
  // EDIT MODE
  // ==========================================

  editMode =
    signal(false);

  selectedCertificationId:
    number | null = null;


  // ==========================================
  // FORM DATA
  // ==========================================

  selectedVendorId:
    number | null = null;

  certificationName = '';

  certificateNumber = '';

  issuingAuthority = '';

  issueDate = '';

  expiryDate = '';

  status = 'Active';

  notes = '';


  // ==========================================
  // MESSAGES
  // ==========================================

  successMessage = '';

  errorMessage = '';


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(

    private certificationService:
      CertificationService,

    private vendorService:
      Vendor

  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadVendors();

    this.loadCertifications();

  }


  // ==========================================
  // LOAD VENDORS
  // ==========================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response: any[]) => {

          this.vendors.set(response);

        },

        error: (error: any) => {

          console.error(
            'Failed to load vendors:',
            error
          );

        }

      });

  }


  // ==========================================
  // LOAD CERTIFICATIONS
  // ==========================================

  loadCertifications(): void {

    this.loading.set(true);

    this.certificationService
      .getCertifications()
      .subscribe({

        next: (response: any[]) => {

          this.certifications.set(
            response
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load certifications:',
            error
          );

          this.certifications.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // OPEN ADD FORM
  // ==========================================

  openAddForm(): void {

    this.editMode.set(false);

    this.selectedCertificationId =
      null;

    this.resetForm();

    this.showForm.set(true);

  }


  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  openEditForm(
    certification: any
  ): void {

    this.editMode.set(true);

    this.selectedCertificationId =
      certification.id;

    this.selectedVendorId =
      certification.vendor_id;

    this.certificationName =
      certification.certification_name;

    this.certificateNumber =
      certification.certificate_number;

    this.issuingAuthority =
      certification.issuing_authority || '';

    this.issueDate =
      certification.issue_date;

    this.expiryDate =
      certification.expiry_date;

    this.status =
      certification.status || 'Active';

    this.notes =
      certification.notes || '';

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

    this.selectedVendorId =
      null;

    this.certificationName = '';

    this.certificateNumber = '';

    this.issuingAuthority = '';

    this.issueDate = '';

    this.expiryDate = '';

    this.status = 'Active';

    this.notes = '';

    this.selectedCertificationId =
      null;

  }


  // ==========================================
  // SAVE CERTIFICATION
  // ==========================================

  saveCertification(): void {

    this.successMessage = '';

    this.errorMessage = '';


    if (
      !this.selectedVendorId ||
      !this.certificationName ||
      !this.certificateNumber ||
      !this.issueDate ||
      !this.expiryDate
    ) {

      this.errorMessage =
        'Please fill all required fields.';

      return;

    }


    const data = {

      vendor_id:
        this.selectedVendorId,

      certification_name:
        this.certificationName,

      certificate_number:
        this.certificateNumber,

      issuing_authority:
        this.issuingAuthority || null,

      issue_date:
        this.issueDate,

      expiry_date:
        this.expiryDate,

      status:
        this.status,

      notes:
        this.notes || null

    };


    if (
      this.editMode() &&
      this.selectedCertificationId
    ) {

      this.certificationService
        .updateCertification(
          this.selectedCertificationId,
          data
        )
        .subscribe({

          next: () => {

            this.successMessage =
              'Certification updated successfully.';

            this.closeForm();

            this.loadCertifications();

          },

          error: (error: any) => {

            console.error(
              'Failed to update certification:',
              error
            );

            this.errorMessage =
              error?.error?.detail ||
              'Unable to update certification.';

          }

        });

      return;

    }


    this.certificationService
      .createCertification(data)
      .subscribe({

        next: () => {

          this.successMessage =
            'Certification created successfully.';

          this.closeForm();

          this.loadCertifications();

        },

        error: (error: any) => {

          console.error(
            'Failed to create certification:',
            error
          );

          this.errorMessage =
            error?.error?.detail ||
            'Unable to create certification.';

        }

      });

  }


  // ==========================================
  // DELETE CERTIFICATION
  // ==========================================

  deleteCertification(
    id: number
  ): void {

    if (
      !confirm(
        'Are you sure you want to delete this certification?'
      )
    ) {

      return;

    }


    this.certificationService
      .deleteCertification(id)
      .subscribe({

        next: () => {

          this.successMessage =
            'Certification deleted successfully.';

          this.loadCertifications();

        },

        error: (error: any) => {

          console.error(
            'Failed to delete certification:',
            error
          );

          this.errorMessage =
            error?.error?.detail ||
            'Unable to delete certification.';

        }

      });

  }


  // ==========================================
  // CHECK EXPIRY
  // ==========================================

  getExpiryStatus(
    expiryDate: string
  ): string {

    const today =
      new Date();

    const expiry =
      new Date(expiryDate);


    if (expiry < today) {

      return 'Expired';

    }


    const difference =
      expiry.getTime() -
      today.getTime();


    const days =
      Math.ceil(
        difference /
        (1000 * 60 * 60 * 24)
      );


    if (days <= 30) {

      return 'Expiring Soon';

    }


    return 'Active';

  }


  // ==========================================
  // EXPIRING COUNT
  // ==========================================

  getExpiringCount(): number {

    return this.certifications()
      .filter(
        certification =>
          this.getExpiryStatus(
            certification.expiry_date
          ) === 'Expiring Soon'
      )
      .length;

  }


  // ==========================================
  // EXPIRED COUNT
  // ==========================================

  getExpiredCount(): number {

    return this.certifications()
      .filter(
        certification =>
          this.getExpiryStatus(
            certification.expiry_date
          ) === 'Expired'
      )
      .length;

  }

}