import {
  Component
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';


interface Control {

  id: string;

  control: string;

  category: string;

  vendor: string;

  auditor: string;

  score: number;

  status: string;

}


@Component({

  selector: 'app-control-assessment',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './control-assessment.html',

  styleUrl:
    './control-assessment.css'

})


export class ControlAssessment {


  // ==========================================
  // CONTROL DATA
  // ==========================================

  controls: Control[] = [

    {
      id: 'CTL-2026-001',
      control: 'Vendor Compliance',
      category: 'Compliance',
      vendor: 'National Supplies',
      auditor: 'Sai Subham',
      score: 92,
      status: 'Passed'
    },

    {
      id: 'CTL-2026-002',
      control: 'Purchase Order Approval',
      category: 'Procurement',
      vendor: 'Western Solutions',
      auditor: 'Auditor',
      score: 85,
      status: 'Passed'
    },

    {
      id: 'CTL-2026-003',
      control: 'Contract Compliance',
      category: 'Contracts',
      vendor: 'Global Components',
      auditor: 'Auditor',
      score: 74,
      status: 'Needs Review'
    },

    {
      id: 'CTL-2026-004',
      control: 'Delivery Performance',
      category: 'Supply Chain',
      vendor: 'Reliable Supplies',
      auditor: 'Sai Subham',
      score: 89,
      status: 'Passed'
    },

    {
      id: 'CTL-2026-005',
      control: 'Quality Management',
      category: 'Quality',
      vendor: 'Apex Logistics',
      auditor: 'Auditor',
      score: 68,
      status: 'Needs Review'
    }

  ];


  // ==========================================
  // FILTERS
  // ==========================================

  searchText = '';

  selectedCategory = 'All Categories';

  selectedStatus = 'All Status';


  // ==========================================
  // NEW ASSESSMENT FORM
  // ==========================================

  showForm = false;

  formMode: 'create' | 'view' = 'create';

  selectedControl: Control | null = null;


  form = {

    control: '',

    category: 'Compliance',

    vendor: '',

    auditor: 'Auditor',

    score: 0,

    status: 'Passed'

  };


  // ==========================================
  // SUMMARY
  // ==========================================

  get totalControls(): number {

    return this.controls.length;

  }


  get passedControls(): number {

    return this.controls.filter(
      control =>
        control.status === 'Passed'
    ).length;

  }


  get reviewControls(): number {

    return this.controls.filter(
      control =>
        control.status === 'Needs Review'
    ).length;

  }


  get averageScore(): number {

    if (!this.controls.length) {

      return 0;

    }

    const total =
      this.controls.reduce(
        (sum, control) =>
          sum + Number(control.score),
        0
      );

    return Math.round(
      total / this.controls.length
    );

  }


  // ==========================================
  // FILTERED CONTROLS
  // ==========================================

  get filteredControls(): Control[] {

    let result =
      [...this.controls];


    // SEARCH

    const search =
      this.searchText
        .trim()
        .toLowerCase();


    if (search) {

      result =
        result.filter(
          control =>

            control.id
              .toLowerCase()
              .includes(search)

            ||

            control.control
              .toLowerCase()
              .includes(search)

            ||

            control.vendor
              .toLowerCase()
              .includes(search)

            ||

            control.auditor
              .toLowerCase()
              .includes(search)

        );

    }


    // CATEGORY

    if (
      this.selectedCategory !==
      'All Categories'
    ) {

      result =
        result.filter(
          control =>
            control.category ===
            this.selectedCategory
        );

    }


    // STATUS

    if (
      this.selectedStatus !==
      'All Status'
    ) {

      result =
        result.filter(
          control =>
            control.status ===
            this.selectedStatus
        );

    }


    return result;

  }


  // ==========================================
  // NEW ASSESSMENT
  // ==========================================

  openNewAssessment(): void {

    this.formMode = 'create';

    this.selectedControl = null;


    this.form = {

      control: '',

      category: 'Compliance',

      vendor: '',

      auditor: 'Auditor',

      score: 0,

      status: 'Passed'

    };


    this.showForm = true;

  }


  // ==========================================
  // VIEW ASSESSMENT
  // ==========================================

  viewAssessment(
    control: Control
  ): void {

    this.formMode = 'view';

    this.selectedControl = control;


    this.form = {

      control:
        control.control,

      category:
        control.category,

      vendor:
        control.vendor,

      auditor:
        control.auditor,

      score:
        control.score,

      status:
        control.status

    };


    this.showForm = true;

  }


  // ==========================================
  // CLOSE FORM
  // ==========================================

  closeForm(): void {

    this.showForm = false;

    this.selectedControl = null;

  }


  // ==========================================
  // SAVE NEW ASSESSMENT
  // ==========================================

  saveAssessment(): void {

    if (
      !this.form.control.trim()
    ) {

      alert(
        'Control name is required.'
      );

      return;

    }


    if (
      !this.form.vendor.trim()
    ) {

      alert(
        'Vendor name is required.'
      );

      return;

    }


    if (
      this.form.score < 0 ||
      this.form.score > 100
    ) {

      alert(
        'Score must be between 0 and 100.'
      );

      return;

    }


    const nextNumber =
      this.controls.length + 1;


    const newControl: Control = {

      id:
        `CTL-2026-${String(nextNumber).padStart(3, '0')}`,

      control:
        this.form.control.trim(),

      category:
        this.form.category,

      vendor:
        this.form.vendor.trim(),

      auditor:
        this.form.auditor.trim() ||
        'Auditor',

      score:
        Number(this.form.score),

      status:
        this.form.status

    };


    this.controls = [

      newControl,

      ...this.controls

    ];


    this.closeForm();

  }


  // ==========================================
  // REFRESH
  // ==========================================

  refresh(): void {

    this.searchText = '';

    this.selectedCategory =
      'All Categories';

    this.selectedStatus =
      'All Status';

    this.controls = [
      ...this.controls
    ];

  }

}