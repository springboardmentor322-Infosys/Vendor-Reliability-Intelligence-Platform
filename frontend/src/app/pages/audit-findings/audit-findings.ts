import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuditFindingService } from '../../services/audit-finding';
import { Vendor } from '../../services/vendor';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-audit-findings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-findings.html',
  styleUrl: './audit-findings.css'
})
export class AuditFindings implements OnInit {

  findings: any[] = [];
  vendors: any[] = [];
  filteredFindings: any[] = [];

  loading = false;
  saving = false;
  showForm = false;

  selectedFinding: any = null;

  searchTerm = '';
  severityFilter = 'All Severity';
  statusFilter = 'All Status';

  form: any = {
    finding: '',
    description: '',
    vendor_id: null,
    audit: '',
    severity: 'Medium',
    status: 'Open',
    evidence_url: '',
    due_date: ''
  };

  constructor(
    private auditFindingService: AuditFindingService,
    private vendorService: Vendor,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFindings();
    this.loadVendors();
  }

  // ==========================================================
  // LOAD FINDINGS
  // ==========================================================

  loadFindings(): void {

    this.loading = true;

    this.auditFindingService.getFindings().subscribe({

      next: (data) => {

        this.findings = data || [];

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Failed to load audit findings',
          error
        );

        this.loading = false;

        this.cdr.detectChanges();

        this.toastService.show(
          'Unable to load audit findings.',
          'error'
        );
      }

    });
  }

  // ==========================================================
  // LOAD VENDORS
  // ==========================================================

  loadVendors(): void {

    this.vendorService.getVendors().subscribe({

      next: (data: any) => {

        console.log('Vendors loaded:', data);

        if (Array.isArray(data)) {
          this.vendors = data;
        }
        else if (Array.isArray(data?.vendors)) {
          this.vendors = data.vendors;
        }
        else {
          this.vendors = [];
        }

        console.log(
          'Vendor dropdown options:',
          this.vendors
        );
      },

      error: (error) => {

        console.error(
          'Failed to load vendors',
          error
        );

        this.vendors = [];

        this.toastService.show(
          'Unable to load vendors.',
          'error'
        );
      }

    });
  }

  // ==========================================================
  // CREATE FORM
  // ==========================================================

  openCreateForm(): void {

    this.selectedFinding = null;

    this.form = {
      finding: '',
      description: '',
      vendor_id: null,
      audit: '',
      severity: 'Medium',
      status: 'Open',
      evidence_url: '',
      due_date: ''
    };

    this.showForm = true;
  }

  // ==========================================================
  // CLOSE FORM
  // ==========================================================

  closeForm(): void {

    this.showForm = false;
    this.selectedFinding = null;
  }

  // ==========================================================
  // EDIT FINDING
  // ==========================================================

  editFinding(finding: any): void {

    this.selectedFinding = finding;

    this.form = {
      finding: finding.finding || '',
      description: finding.description || '',
      vendor_id: finding.vendor_id || null,
      audit: finding.audit || '',
      severity: finding.severity || 'Medium',
      status: finding.status || 'Open',
      evidence_url: finding.evidence_url || '',
      due_date: finding.due_date || ''
    };

    this.showForm = true;
  }

  // ==========================================================
  // SAVE FINDING
  // ==========================================================

  saveFinding(): void {

    if (
      !this.form.finding ||
      !this.form.finding.trim() ||
      !this.form.audit ||
      !this.form.audit.trim()
    ) {

      this.toastService.show(
        'Please enter the finding and audit name.',
        'error'
      );

      return;
    }

    const isEditing = !!this.selectedFinding;

    const payload = {

      finding:
        this.form.finding.trim(),

      description:
        this.form.description?.trim() || null,

      vendor_id:
        this.form.vendor_id
          ? Number(this.form.vendor_id)
          : null,

      audit:
        this.form.audit.trim(),

      severity:
        this.form.severity,

      status:
        this.form.status,

      evidence_url:
        this.form.evidence_url?.trim() || null,

      due_date:
        this.form.due_date || null
    };

    this.saving = true;

    const request = isEditing

      ? this.auditFindingService.updateFinding(
          this.selectedFinding.id,
          payload
        )

      : this.auditFindingService.createFinding(
          payload
        );

    request.subscribe({

      next: () => {

        this.saving = false;

        this.closeForm();

        this.loadFindings();

        this.toastService.show(

          isEditing
            ? 'Audit finding updated successfully.'
            : 'Audit finding created successfully.',

          'success'
        );
      },

      error: (error) => {

        console.error(
          'Failed to save audit finding',
          error
        );

        this.saving = false;

        this.toastService.show(

          error?.error?.detail ||
          'Unable to save audit finding.',

          'error'
        );
      }

    });
  }

  // ==========================================================
  // DELETE FINDING
  // ==========================================================

  deleteFinding(finding: any): void {

    if (
      !confirm(
        `Delete ${finding.finding_id}?`
      )
    ) {
      return;
    }

    this.auditFindingService
      .deleteFinding(finding.id)
      .subscribe({

        next: () => {

          this.loadFindings();

          this.toastService.show(
            'Audit finding deleted successfully.',
            'success'
          );
        },

        error: (error) => {

          console.error(
            'Failed to delete audit finding',
            error
          );

          this.toastService.show(
            'Unable to delete audit finding.',
            'error'
          );
        }

      });
  }

  // ==========================================================
  // VIEW FINDING
  // ==========================================================

  viewFinding(finding: any): void {

    this.editFinding(finding);
  }

  // ==========================================================
  // FILTERS
  // ==========================================================

  applyFilters(): void {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();

    this.filteredFindings =
      this.findings.filter(item => {

        const matchesSearch =
          !term ||
          [
            item.finding_id,
            item.finding,
            item.vendor,
            item.audit
          ].some(value =>
            String(value || '')
              .toLowerCase()
              .includes(term)
          );

        const matchesSeverity =
          this.severityFilter === 'All Severity' ||
          item.severity === this.severityFilter;

        const matchesStatus =
          this.statusFilter === 'All Status' ||
          item.status === this.statusFilter;

        return (
          matchesSearch &&
          matchesSeverity &&
          matchesStatus
        );
      });
  }

  // ==========================================================
  // SUMMARY COUNTS
  // ==========================================================

  get totalFindings(): number {

    return this.findings.length;
  }

  get criticalFindings(): number {

    return this.findings.filter(
      item => item.severity === 'Critical'
    ).length;
  }

  get openFindings(): number {

    return this.findings.filter(
      item =>
        item.status === 'Open' ||
        item.status === 'In Progress'
    ).length;
  }

  get resolvedFindings(): number {

    return this.findings.filter(
      item => item.status === 'Resolved'
    ).length;
  }
}