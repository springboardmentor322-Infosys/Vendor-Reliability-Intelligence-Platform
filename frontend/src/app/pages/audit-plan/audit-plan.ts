import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-audit-plan',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './audit-plan.html',
  styleUrl: './audit-plan.css'
})
export class AuditPlan implements OnInit {

  // ==========================================
  // SEARCH
  // ==========================================

  searchText = '';

  selectedStatus = 'All';
  selectedPriority = 'All';


  // ==========================================
  // LOADING
  // ==========================================

  loading = signal(false);


  // ==========================================
  // AUDIT PLANS
  // ==========================================

  auditPlans = signal<any[]>([
    {
      id: 'AUD-2026-001',
      title: 'Vendor Compliance Audit',
      vendor: 'National Supplies',
      auditor: 'Auditor',
      auditType: 'Compliance',
      priority: 'High',
      startDate: '05 Sep 2026',
      dueDate: '12 Sep 2026',
      status: 'Scheduled',
      progress: 0,
      scope: 'Contract compliance, certifications and documentation'
    },

    {
      id: 'AUD-2026-002',
      title: 'Procurement Process Audit',
      vendor: 'Western Solutions',
      auditor: 'Auditor',
      auditType: 'Procurement',
      priority: 'Medium',
      startDate: '08 Sep 2026',
      dueDate: '18 Sep 2026',
      status: 'In Progress',
      progress: 55,
      scope: 'Purchase requests, approvals and purchase orders'
    },

    {
      id: 'AUD-2026-003',
      title: 'Vendor Performance Review',
      vendor: 'Apex Logistics',
      auditor: 'Auditor',
      auditType: 'Performance',
      priority: 'Medium',
      startDate: '10 Sep 2026',
      dueDate: '20 Sep 2026',
      status: 'Scheduled',
      progress: 0,
      scope: 'Delivery performance, quality and reliability'
    },

    {
      id: 'AUD-2026-004',
      title: 'Contract Compliance Audit',
      vendor: 'Global Components',
      auditor: 'Auditor',
      auditType: 'Contract',
      priority: 'High',
      startDate: '01 Sep 2026',
      dueDate: '07 Sep 2026',
      status: 'In Progress',
      progress: 70,
      scope: 'Contract terms, renewal status and compliance'
    },

    {
      id: 'AUD-2026-005',
      title: 'Purchase Order Audit',
      vendor: 'Reliable Technologies',
      auditor: 'Auditor',
      auditType: 'Purchase Order',
      priority: 'Low',
      startDate: '15 Aug 2026',
      dueDate: '25 Aug 2026',
      status: 'Completed',
      progress: 100,
      scope: 'Purchase order accuracy and approval workflow'
    },

    {
      id: 'AUD-2026-006',
      title: 'Supplier Risk Assessment',
      vendor: 'Dynamic Supplies',
      auditor: 'Auditor',
      auditType: 'Risk',
      priority: 'High',
      startDate: '20 Sep 2026',
      dueDate: '30 Sep 2026',
      status: 'Planned',
      progress: 0,
      scope: 'Vendor risk profile, operational risks and controls'
    }
  ]);


  // ==========================================
  // SUMMARY
  // ==========================================

  totalAudits = signal(0);

  plannedAudits = signal(0);

  inProgressAudits = signal(0);

  completedAudits = signal(0);

  highPriorityAudits = signal(0);


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.calculateSummary();

  }


  // ==========================================
  // CALCULATE SUMMARY
  // ==========================================

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
        audit =>
          audit.status === 'In Progress'
      ).length
    );

    this.completedAudits.set(
      plans.filter(
        audit =>
          audit.status === 'Completed'
      ).length
    );

    this.highPriorityAudits.set(
      plans.filter(
        audit =>
          audit.priority === 'High'
      ).length
    );

  }


  // ==========================================
  // FILTERED AUDITS
  // ==========================================

  get filteredAudits(): any[] {

    const search =
      this.searchText
        .toLowerCase()
        .trim();

    return this.auditPlans().filter(
      audit => {

        const matchesSearch =
          !search ||
          audit.id
            .toLowerCase()
            .includes(search) ||
          audit.title
            .toLowerCase()
            .includes(search) ||
          audit.vendor
            .toLowerCase()
            .includes(search) ||
          audit.auditType
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

      }
    );

  }


  // ==========================================
  // STATUS FILTER
  // ==========================================

  setStatus(status: string): void {

    this.selectedStatus = status;

  }


  // ==========================================
  // PRIORITY FILTER
  // ==========================================

  setPriority(priority: string): void {

    this.selectedPriority = priority;

  }


  // ==========================================
  // STATUS CLASS
  // ==========================================

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


  // ==========================================
  // PRIORITY CLASS
  // ==========================================

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


  // ==========================================
  // VIEW AUDIT
  // ==========================================

  viewAudit(audit: any): void {

    alert(
      `Audit Plan\n\n` +
      `ID: ${audit.id}\n` +
      `Title: ${audit.title}\n` +
      `Vendor: ${audit.vendor}\n` +
      `Type: ${audit.auditType}\n` +
      `Priority: ${audit.priority}\n` +
      `Status: ${audit.status}\n\n` +
      `Scope:\n${audit.scope}`
    );

  }


  // ==========================================
  // CREATE AUDIT
  // ==========================================

  createAudit(): void {

    alert(
      'Create Audit Plan functionality can be connected to the backend here.'
    );

  }

}