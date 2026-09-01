import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AuditTrail {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  description: string;
  status: 'Success' | 'Warning' | 'Failed';
}

@Component({
  selector: 'app-audit-trails',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-trails.html',
  styleUrl: './audit-trails.css'
})
export class AuditTrails {

  searchTerm = '';
  selectedModule = 'All Modules';
  selectedStatus = 'All Status';

  auditTrails: AuditTrail[] = [
    {
      id: 'LOG-2026-001',
      timestamp: '01 Sep 2026, 10:42 AM',
      user: 'Sai Subham',
      role: 'Auditor',
      action: 'Viewed Audit Plan',
      module: 'Audit Plan',
      description: 'Reviewed scheduled vendor audit AUD-2026-001',
      status: 'Success'
    },
    {
      id: 'LOG-2026-002',
      timestamp: '01 Sep 2026, 10:35 AM',
      user: 'Auditor',
      role: 'Auditor',
      action: 'Updated Finding',
      module: 'Audit Findings',
      description: 'Updated status of finding FND-2026-002',
      status: 'Success'
    },
    {
      id: 'LOG-2026-003',
      timestamp: '01 Sep 2026, 09:58 AM',
      user: 'Procurement Manager',
      role: 'Procurement Manager',
      action: 'Approved Purchase Order',
      module: 'Purchase Orders',
      description: 'Approved purchase order #65753',
      status: 'Success'
    },
    {
      id: 'LOG-2026-004',
      timestamp: '01 Sep 2026, 09:41 AM',
      user: 'Auditor',
      role: 'Auditor',
      action: 'Viewed Vendor',
      module: 'Vendors',
      description: 'Viewed vendor profile for National Supplies',
      status: 'Success'
    },
    {
      id: 'LOG-2026-005',
      timestamp: '01 Sep 2026, 09:25 AM',
      user: 'Auditor',
      role: 'Auditor',
      action: 'Created Finding',
      module: 'Audit Findings',
      description: 'Created finding FND-2026-003',
      status: 'Success'
    },
    {
      id: 'LOG-2026-006',
      timestamp: '31 Aug 2026, 05:16 PM',
      user: 'Procurement Manager',
      role: 'Procurement Manager',
      action: 'Rejected Request',
      module: 'Procurement',
      description: 'Rejected procurement request #3',
      status: 'Warning'
    },
    {
      id: 'LOG-2026-007',
      timestamp: '31 Aug 2026, 04:48 PM',
      user: 'Auditor',
      role: 'Auditor',
      action: 'Viewed Contract',
      module: 'Contracts',
      description: 'Reviewed contract CNT-2026-0006',
      status: 'Success'
    },
    {
      id: 'LOG-2026-008',
      timestamp: '31 Aug 2026, 03:22 PM',
      user: 'System',
      role: 'System',
      action: 'Renewal Reminder',
      module: 'Contracts',
      description: 'Contract renewal reminder generated',
      status: 'Warning'
    },
    {
      id: 'LOG-2026-009',
      timestamp: '31 Aug 2026, 02:54 PM',
      user: 'Auditor',
      role: 'Auditor',
      action: 'Completed Audit',
      module: 'Audit Plan',
      description: 'Completed audit AUD-2026-005',
      status: 'Success'
    },
    {
      id: 'LOG-2026-010',
      timestamp: '31 Aug 2026, 01:36 PM',
      user: 'Administrator',
      role: 'Administrator',
      action: 'Updated User',
      module: 'User Management',
      description: 'Updated user access permissions',
      status: 'Success'
    }
  ];

  get filteredTrails(): AuditTrail[] {
    return this.auditTrails.filter(log => {

      const search = this.searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        log.id.toLowerCase().includes(search) ||
        log.user.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.module.toLowerCase().includes(search) ||
        log.description.toLowerCase().includes(search);

      const matchesModule =
        this.selectedModule === 'All Modules' ||
        log.module === this.selectedModule;

      const matchesStatus =
        this.selectedStatus === 'All Status' ||
        log.status === this.selectedStatus;

      return matchesSearch && matchesModule && matchesStatus;
    });
  }

  get totalActivities(): number {
    return this.auditTrails.length;
  }

  get successfulActivities(): number {
    return this.auditTrails.filter(x => x.status === 'Success').length;
  }

  get warningActivities(): number {
    return this.auditTrails.filter(x => x.status === 'Warning').length;
  }

  get failedActivities(): number {
    return this.auditTrails.filter(x => x.status === 'Failed').length;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedModule = 'All Modules';
    this.selectedStatus = 'All Status';
  }
}