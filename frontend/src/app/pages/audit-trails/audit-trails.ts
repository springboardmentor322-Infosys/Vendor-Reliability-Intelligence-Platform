import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface AuditTrail {
  id: number;
  log_id: string;
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
export class AuditTrails implements OnInit {

  private apiUrl = 'http://127.0.0.1:8000';

  searchTerm = '';
  selectedModule = 'All Modules';
  selectedStatus = 'All Status';

  auditTrails: AuditTrail[] = [];

  loading = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAuditTrails();
  }

  // ==========================================
  // LOAD AUDIT TRAILS
  // ==========================================

  loadAuditTrails(): void {

    this.loading = true;

    this.http.get<any[]>(
      `${this.apiUrl}/audit-trails/`
    ).subscribe({

      next: (data) => {

        this.auditTrails = (data || []).map(
          item => ({
            id: item.id,
            log_id: item.log_id,
            timestamp: this.formatTimestamp(
              item.created_at
            ),
            user: item.user || 'Unknown',
            role: item.role || 'System',
            action: item.action || '',
            module: item.module || '',
            description: item.description || '',
            status: item.status || 'Success'
          })
        );

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Failed to load audit trails:',
          error
        );

        this.auditTrails = [];

        this.loading = false;

        this.cdr.detectChanges();
      }

    });
  }


  // ==========================================
  // FORMAT DATE / TIME
  // ==========================================

  formatTimestamp(value: string | null): string {

    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }
    );
  }


  // ==========================================
  // FILTERED AUDIT TRAILS
  // ==========================================

  get filteredTrails(): AuditTrail[] {

    return this.auditTrails.filter(log => {

      const search =
        this.searchTerm
          .trim()
          .toLowerCase();

      const matchesSearch =
        !search ||
        log.log_id
          .toLowerCase()
          .includes(search) ||

        log.user
          .toLowerCase()
          .includes(search) ||

        log.action
          .toLowerCase()
          .includes(search) ||

        log.module
          .toLowerCase()
          .includes(search) ||

        log.description
          .toLowerCase()
          .includes(search);

      const matchesModule =
        this.selectedModule === 'All Modules' ||
        log.module === this.selectedModule;

      const matchesStatus =
        this.selectedStatus === 'All Status' ||
        log.status === this.selectedStatus;

      return (
        matchesSearch &&
        matchesModule &&
        matchesStatus
      );
    });
  }


  // ==========================================
  // SUMMARY CARDS
  // ==========================================

  get totalActivities(): number {

    return this.auditTrails.length;
  }


  get successfulActivities(): number {

    return this.auditTrails.filter(
      x => x.status === 'Success'
    ).length;
  }


  get warningActivities(): number {

    return this.auditTrails.filter(
      x => x.status === 'Warning'
    ).length;
  }


  get failedActivities(): number {

    return this.auditTrails.filter(
      x => x.status === 'Failed'
    ).length;
  }


  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  clearFilters(): void {

    this.searchTerm = '';

    this.selectedModule =
      'All Modules';

    this.selectedStatus =
      'All Status';
  }

}