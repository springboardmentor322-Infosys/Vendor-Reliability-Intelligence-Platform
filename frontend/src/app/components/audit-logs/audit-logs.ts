import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css'
})
export class AuditLogs implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private apiUrl = 'http://127.0.0.1:8000';

  // =========================================
  // DATA
  // =========================================

  auditLogs: any[] = [];

  totalLogs = 0;
  vendorLogs = 0;
  purchaseOrderLogs = 0;
  latestActivity = '';

  loading = true;


  // =========================================
  // INIT
  // =========================================

  ngOnInit(): void {
    this.loadAuditLogs();
  }


  // =========================================
  // LOAD AUDIT LOGS
  // =========================================

  loadAuditLogs(): void {

    this.loading = true;

    this.http.get<any[]>(
      `${this.apiUrl}/auditlogs/`
    ).subscribe({

      next: (data: any[]) => {

        console.log(
          'AUDIT LOG DATA:',
          data
        );

        this.auditLogs = Array.isArray(data)
          ? data
          : [];

        this.calculateSummary();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'AUDIT LOG ERROR:',
          error
        );

        this.auditLogs = [];

        this.totalLogs = 0;
        this.vendorLogs = 0;
        this.purchaseOrderLogs = 0;
        this.latestActivity = '';

        this.loading = false;

        this.cdr.detectChanges();
      }

    });
  }


  // =========================================
  // SUMMARY
  // =========================================

  calculateSummary(): void {

    this.totalLogs = this.auditLogs.length;

    this.vendorLogs = this.auditLogs.filter(
      (log: any) =>
        this.getEntityType(log) === 'Vendor'
    ).length;

    this.purchaseOrderLogs = this.auditLogs.filter(
      (log: any) =>
        this.getEntityType(log) === 'Purchase Order'
    ).length;


    if (this.auditLogs.length > 0) {

      const dates = this.auditLogs
        .map((log: any) => this.getDateValue(log))
        .filter(
          (date: Date | null): date is Date =>
            date !== null
        )
        .sort(
          (a: Date, b: Date) =>
            b.getTime() - a.getTime()
        );


      if (dates.length > 0) {

        this.latestActivity =
          dates[0].toLocaleDateString(
            'en-IN',
            {
              year: 'numeric',
              month: 'short',
              day: '2-digit'
            }
          );
      }
    }


    console.log(
      'Total:',
      this.totalLogs
    );

    console.log(
      'Vendor:',
      this.vendorLogs
    );

    console.log(
      'Purchase Order:',
      this.purchaseOrderLogs
    );

    console.log(
      'Latest:',
      this.latestActivity
    );
  }


  // =========================================
  // GET ACTION
  // =========================================

  getAction(log: any): string {

    return String(
      log.action ||
      log.event ||
      log.activity ||
      log.operation ||
      log.action_type ||
      'Activity'
    );
  }


  // =========================================
  // GET ENTITY TYPE
  // =========================================

  getEntityType(log: any): string {

    const entity =
      log.entity_type ||
      log.entity ||
      log.resource_type ||
      log.module ||
      log.type ||
      '';

    const value =
      String(entity).toLowerCase();


    if (value.includes('purchase')) {
      return 'Purchase Order';
    }


    if (value.includes('vendor')) {
      return 'Vendor';
    }


    if (value.includes('procurement')) {
      return 'Procurement';
    }


    return entity || 'System';
  }


  // =========================================
  // GET ENTITY ID
  // =========================================

  getEntityId(log: any): string {

    const id =
      log.entity_id ??
      log.resource_id ??
      log.vendor_id ??
      log.purchase_order_id ??
      log.procurement_id ??
      log.id;


    if (
      id === null ||
      id === undefined ||
      id === ''
    ) {
      return '-';
    }


    return String(id);
  }


  // =========================================
  // GET DATE
  // =========================================

  getDate(log: any): string {

    const date =
      log.created_at ||
      log.timestamp ||
      log.date ||
      log.created_date ||
      log.updated_at;


    if (!date) {
      return '-';
    }


    const parsedDate = new Date(date);


    if (isNaN(parsedDate.getTime())) {
      return String(date);
    }


    return parsedDate.toLocaleDateString(
      'en-IN',
      {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }
    );
  }


  // =========================================
  // DATE VALUE
  // =========================================

  getDateValue(log: any): Date | null {

    const date =
      log.created_at ||
      log.timestamp ||
      log.date ||
      log.created_date ||
      log.updated_at;


    if (!date) {
      return null;
    }


    const parsedDate = new Date(date);


    if (isNaN(parsedDate.getTime())) {
      return null;
    }


    return parsedDate;
  }


  // =========================================
  // DESCRIPTION
  // =========================================

  getDescription(log: any): string {

    return String(
      log.description ||
      log.message ||
      log.details ||
      `${this.getAction(log)} performed on ${this.getEntityType(log)}`
    );
  }

}
