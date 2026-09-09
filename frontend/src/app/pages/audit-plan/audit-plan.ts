import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuditPlanService } from '../../services/audit-plan';
import { Vendor } from '../../services/vendor';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-audit-plan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-plan.html',
  styleUrl: './audit-plan.css'
})
export class AuditPlan implements OnInit {

  searchText = '';
  selectedStatus = 'All';
  selectedPriority = 'All';

  loading = signal(false);
  saving = signal(false);

  // IMPORTANT: use signal for form visibility
  showForm = signal(false);

  selectedAudit: any = null;
  vendors: any[] = [];

  form: any = {
    title: '',
    vendor_id: null,
    auditor: 'Auditor',
    audit_type: 'Compliance',
    priority: 'Medium',
    start_date: '',
    due_date: '',
    status: 'Planned',
    progress: 0,
    scope: ''
  };

  auditPlans = signal<any[]>([]);

  totalAudits = signal(0);
  plannedAudits = signal(0);
  inProgressAudits = signal(0);
  completedAudits = signal(0);
  highPriorityAudits = signal(0);

  constructor(
    private auditPlanService: AuditPlanService,
    private vendorService: Vendor,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAuditPlans();
    this.loadVendors();
  }

  loadAuditPlans(): void {

    this.loading.set(true);

    this.auditPlanService.getAuditPlans().subscribe({

      next: (data) => {

        this.auditPlans.set(data || []);

        this.calculateSummary();

        this.loading.set(false);

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error('Failed to load audit plans:', error);

        this.auditPlans.set([]);

        this.loading.set(false);

        this.toastService.show(
          'Unable to load audit plans.',
          'error'
        );

        this.cdr.detectChanges();

      }

    });

  }

  loadVendors(): void {

    this.vendorService.getVendors().subscribe({

      next: (data) => {

        this.vendors = data || [];

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Failed to load vendors:',
          error
        );

      }

    });

  }

  calculateSummary(): void {

    const plans = this.auditPlans();

    this.totalAudits.set(plans.length);

    this.plannedAudits.set(
      plans.filter(
        audit =>
          audit.status === 'Planned' ||
          audit.status === 'Scheduled'
      ).length
    );

    this.inProgressAudits.set(
      plans.filter(
        audit => audit.status === 'In Progress'
      ).length
    );

    this.completedAudits.set(
      plans.filter(
        audit => audit.status === 'Completed'
      ).length
    );

    this.highPriorityAudits.set(
      plans.filter(
        audit => audit.priority === 'High'
      ).length
    );

  }

  get filteredAudits(): any[] {

    const search =
      this.searchText
        .toLowerCase()
        .trim();

    return this.auditPlans().filter(audit => {

      const matchesSearch =
        !search ||

        String(
          audit.audit_id ||
          audit.id ||
          ''
        )
          .toLowerCase()
          .includes(search) ||

        String(
          audit.title || ''
        )
          .toLowerCase()
          .includes(search) ||

        String(
          audit.vendor || ''
        )
          .toLowerCase()
          .includes(search) ||

        String(
          audit.audit_type ||
          audit.auditType ||
          ''
        )
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        this.selectedStatus === 'All' ||
        audit.status === this.selectedStatus;

      const matchesPriority =
        this.selectedPriority === 'All' ||
        audit.priority === this.selectedPriority;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );

    });

  }

  setStatus(status: string): void {
    this.selectedStatus = status;
  }

  setPriority(priority: string): void {
    this.selectedPriority = priority;
  }

  getStatusClass(status: string): string {

    switch (status) {

      case 'Completed':
        return 'status-completed';

      case 'In Progress':
        return 'status-progress';

      case 'Scheduled':
        return 'status-scheduled';

      case 'Planned':
        return 'status-planned';

      default:
        return '';

    }

  }

  getPriorityClass(priority: string): string {

    switch (priority) {

      case 'High':
        return 'priority-high';

      case 'Medium':
        return 'priority-medium';

      case 'Low':
        return 'priority-low';

      default:
        return '';

    }

  }

  // ================================
  // CREATE AUDIT
  // ================================

  createAudit(): void {

    console.log('Create Audit Plan button clicked');

    this.selectedAudit = null;

    this.form = {

      title: '',
      vendor_id: null,
      auditor: 'Auditor',
      audit_type: 'Compliance',
      priority: 'Medium',
      start_date: '',
      due_date: '',
      status: 'Planned',
      progress: 0,
      scope: ''

    };

    this.showForm.set(true);

    this.cdr.detectChanges();

  }

  // ================================
  // EDIT AUDIT
  // ================================

  editAudit(audit: any): void {

    this.selectedAudit = audit;

    this.form = {

      title: audit.title || '',

      vendor_id:
        audit.vendor_id || null,

      auditor:
        audit.auditor || 'Auditor',

      audit_type:
        audit.audit_type ||
        audit.auditType ||
        'Compliance',

      priority:
        audit.priority ||
        'Medium',

      start_date:
        audit.start_date ||
        audit.startDate ||
        '',

      due_date:
        audit.due_date ||
        audit.dueDate ||
        '',

      status:
        audit.status ||
        'Planned',

      progress:
        audit.progress ?? 0,

      scope:
        audit.scope || ''

    };

    this.showForm.set(true);

    this.cdr.detectChanges();

  }

  // ================================
  // CLOSE FORM
  // ================================

  closeForm(): void {

    this.showForm.set(false);

    this.selectedAudit = null;

    this.cdr.detectChanges();

  }

  // ================================
  // SAVE AUDIT
  // ================================

  saveAudit(): void {

    if (!this.form.title?.trim()) {

      this.toastService.show(
        'Please enter an audit title.',
        'error'
      );

      return;

    }

    if (!this.form.audit_type) {

      this.toastService.show(
        'Please select an audit type.',
        'error'
      );

      return;

    }

    if (!this.form.start_date) {

      this.toastService.show(
        'Please select a start date.',
        'error'
      );

      return;

    }

    if (!this.form.due_date) {

      this.toastService.show(
        'Please select a due date.',
        'error'
      );

      return;

    }

    if (
      this.form.start_date >
      this.form.due_date
    ) {

      this.toastService.show(
        'Due date cannot be before the start date.',
        'error'
      );

      return;

    }

    const payload = {

      title:
        this.form.title.trim(),

      vendor_id:
        this.form.vendor_id
          ? Number(this.form.vendor_id)
          : null,

      auditor:
        this.form.auditor?.trim() ||
        'Auditor',

      audit_type:
        this.form.audit_type,

      priority:
        this.form.priority,

      start_date:
        this.form.start_date,

      due_date:
        this.form.due_date,

      status:
        this.form.status,

      progress:
        Number(this.form.progress || 0),

      scope:
        this.form.scope?.trim() ||
        null

    };

    this.saving.set(true);

    const request = this.selectedAudit

      ? this.auditPlanService.updateAuditPlan(
          this.selectedAudit.id,
          payload
        )

      : this.auditPlanService.createAuditPlan(
          payload
        );

    request.subscribe({

      next: () => {

        const wasEditing =
          !!this.selectedAudit;

        this.saving.set(false);

        this.closeForm();

        this.loadAuditPlans();

        this.toastService.show(

          wasEditing
            ? 'Audit plan updated successfully.'
            : 'Audit plan created successfully.',

          'success'

        );

      },

      error: (error) => {

        console.error(
          'Failed to save audit plan:',
          error
        );

        this.saving.set(false);

        this.toastService.show(

          error?.error?.detail ||
          'Unable to save audit plan.',

          'error'

        );

        this.cdr.detectChanges();

      }

    });

  }

  // ================================
  // VIEW AUDIT
  // ================================

  viewAudit(audit: any): void {

    alert(

      `Audit Plan\n\n` +

      `ID: ${
        audit.audit_id ||
        audit.id
      }\n` +

      `Title: ${
        audit.title
      }\n` +

      `Vendor: ${
        audit.vendor ||
        '—'
      }\n` +

      `Type: ${
        audit.audit_type ||
        audit.auditType ||
        '—'
      }\n` +

      `Priority: ${
        audit.priority
      }\n` +

      `Status: ${
        audit.status
      }\n\n` +

      `Scope:\n${
        audit.scope ||
        '—'
      }`

    );

  }

  // ================================
  // DELETE AUDIT
  // ================================

  deleteAudit(audit: any): void {

    const auditId =
      audit.audit_id ||
      audit.id;

    if (
      !confirm(
        `Delete ${auditId}?`
      )
    ) {

      return;

    }

    this.auditPlanService
      .deleteAuditPlan(audit.id)
      .subscribe({

        next: () => {

          this.loadAuditPlans();

          this.toastService.show(
            'Audit plan deleted successfully.',
            'success'
          );

        },

        error: (error) => {

          console.error(
            'Failed to delete audit plan:',
            error
          );

          this.toastService.show(
            'Unable to delete audit plan.',
            'error'
          );

        }

      });

  }

}