import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { QualityInspectionService } from '../../services/quality-inspection.service';


@Component({
  selector: 'app-quality-inspection',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './quality-inspection.html',
  styleUrl: './quality-inspection.css'
})
export class QualityInspection implements OnInit {

  inspections: any[] = [];

  loading = false;

  errorMessage = '';

  successMessage = '';

  showForm = false;


  newInspection: any = {

    order_id: null,

    vendor_id: null,

    inspection_date: '',

    inspector_name: '',

    quality_score: null,

    result: 'Passed',

    defect_count: 0,

    notes: ''

  };


  constructor(
    private qualityService: QualityInspectionService
  ) {}


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  ngOnInit(): void {

    this.loadInspections();

  }


  // ==========================================
  // LOAD INSPECTIONS
  // ==========================================

  loadInspections(): void {

    this.loading = true;

    this.errorMessage = '';


    this.qualityService
      .getInspections()
      .subscribe({

        next: (data: any[]) => {

          this.inspections = data;

          this.loading = false;

        },

        error: (error: any) => {

          console.error(
            'Error loading quality inspections:',
            error
          );

          this.errorMessage =
            error?.error?.detail ||
            'Unable to load quality inspections.';

          this.loading = false;

        }

      });

  }


  // ==========================================
  // OPEN FORM
  // ==========================================

  openForm(): void {

    this.showForm = true;

    this.errorMessage = '';

    this.successMessage = '';

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

    this.newInspection = {

      order_id: null,

      vendor_id: null,

      inspection_date: '',

      inspector_name: '',

      quality_score: null,

      result: 'Passed',

      defect_count: 0,

      notes: ''

    };

  }


  // ==========================================
  // CREATE INSPECTION
  // ==========================================

  createInspection(): void {

    this.errorMessage = '';

    this.successMessage = '';


    if (
      !this.newInspection.order_id ||
      !this.newInspection.vendor_id ||
      !this.newInspection.inspection_date ||
      !this.newInspection.inspector_name ||
      this.newInspection.quality_score === null
    ) {

      this.errorMessage =
        'Please fill all required fields.';

      return;

    }


    if (
      this.newInspection.quality_score < 0 ||
      this.newInspection.quality_score > 5
    ) {

      this.errorMessage =
        'Quality score must be between 0 and 5.';

      return;

    }


    if (this.newInspection.defect_count < 0) {

      this.errorMessage =
        'Defect count cannot be negative.';

      return;

    }


    this.qualityService
      .createInspection(
        this.newInspection
      )
      .subscribe({

        next: (data: any[]) => {

          this.successMessage =
            'Quality inspection created successfully.';

          this.showForm = false;

          this.resetForm();

          this.loadInspections();

        },

        error: (error: any) => {

          console.error(
            'Error creating quality inspection:',
            error
          );

          this.errorMessage =
            error?.error?.detail ||
            'Unable to create quality inspection.';

        }

      });

  }


  // ==========================================
  // DELETE INSPECTION
  // ==========================================

  deleteInspection(
    inspection: any
  ): void {

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this quality inspection?'
      );


    if (!confirmed) {

      return;

    }


    this.qualityService
      .deleteInspection(
        inspection.id
      )
      .subscribe({

        next: (data: any[]) => {

          this.successMessage =
            'Quality inspection deleted successfully.';

          this.loadInspections();

        },

        error: (error: any) => {

          console.error(
            'Error deleting quality inspection:',
            error
          );

          this.errorMessage =
            error?.error?.detail ||
            'Unable to delete quality inspection.';

        }

      });

  }


  // ==========================================
  // RESULT CLASS
  // ==========================================

  getResultClass(
    result: string
  ): string {

    if (result === 'Passed') {

      return 'result-passed';

    }

    return 'result-failed';

  }


  // ==========================================
  // QUALITY CLASS
  // ==========================================

  getQualityClass(
    score: number
  ): string {

    if (score >= 4) {

      return 'quality-good';

    }

    if (score >= 2.5) {

      return 'quality-average';

    }

    return 'quality-poor';

  }

}