
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private apiUrl = 'http://127.0.0.1:8000';

  notifications: any[] = [];

  unreadCount = 0;
  loading = true;

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;

    this.http.get<any[]>(`${this.apiUrl}/vendors/`).subscribe({
      next: (vendors: any[]) => {

        console.log('NOTIFICATION VENDORS:', vendors);

        const vendorNotifications: any[] = [];

        for (const vendor of vendors) {

          const vendorName = this.getVendorName(vendor);

          const risk =
            String(vendor.risk_level || '').toLowerCase();

          const score =
            Number(vendor.reliability_score || 0);

          if (risk.includes('high')) {

            vendorNotifications.push({
              type: 'critical',
              icon: '!',
              category: 'HIGH RISK',
              title: 'High-Risk Vendor Alert',
              vendor: vendorName,
              description:
                `${vendorName} is currently classified as High Risk.`,
              score: score,
              time: 'Current',
              read: false
            });

          } else if (risk.includes('medium')) {

            vendorNotifications.push({
              type: 'warning',
              icon: '⚠',
              category: 'MEDIUM RISK',
              title: 'Vendor Risk Update',
              vendor: vendorName,
              description:
                `${vendorName} is currently classified as Medium Risk.`,
              score: score,
              time: 'Current',
              read: false
            });

          } else if (
            risk.includes('pending') ||
            risk.includes('review')
          ) {

            vendorNotifications.push({
              type: 'info',
              icon: 'i',
              category: 'VENDOR REVIEW',
              title: 'Vendor Review Pending',
              vendor: vendorName,
              description:
                `${vendorName} is awaiting risk or approval review.`,
              score: score,
              time: 'Current',
              read: false
            });
          }
        }

        this.loadBackendVendorAlerts(
          vendors,
          vendorNotifications
        );
      },

      error: (error: any) => {

        console.error(
          'NOTIFICATION VENDOR ERROR:',
          error
        );

        this.notifications = [];
        this.unreadCount = 0;
        this.loading = false;

        this.cdr.detectChanges();
      }
    });
  }

  loadBackendVendorAlerts(
    vendors: any[],
    vendorNotifications: any[]
  ): void {

    if (vendors.length === 0) {
      this.loadProcurementNotifications(
        vendorNotifications
      );
      return;
    }

    const alertRequests = vendors.map(
      vendor =>
        this.http.get<any[]>(
          `${this.apiUrl}/notifications/vendor/${vendor.id}/alerts`
        )
    );

    let completedRequests = 0;

    for (
      let index = 0;
      index < alertRequests.length;
      index++
    ) {

      alertRequests[index].subscribe({

        next: (alerts: any[]) => {

          if (Array.isArray(alerts)) {

            for (const alert of alerts) {

              if (
                alert.title ===
                'Delivery Delay Alert'
              ) {

                vendorNotifications.push({
                  type: 'critical',
                  icon: '!',
                  category: 'DELIVERY DELAY',
                  title: alert.title,
                  vendor:
                    alert.vendor_name ||
                    'Vendor',
                  description:
                    alert.message ||
                    'Vendor has delayed deliveries.',
                  score: null,
                  time: 'Current',
                  read:
                    alert.status !== 'Unread'
                });
              }
            }
          }
        },

        error: (error: any) => {

          console.error(
            'VENDOR ALERT ERROR:',
            error
          );
        },

        complete: () => {

          completedRequests++;

          if (
            completedRequests ===
            alertRequests.length
          ) {

            this.loadVendorApprovalAlerts(
              vendors,
              vendorNotifications
            );
          }
        }
      });
    }
  }

  loadVendorApprovalAlerts(
    vendors: any[],
    vendorNotifications: any[]
  ): void {

    if (vendors.length === 0) {

      this.loadProcurementNotifications(
        vendorNotifications
      );

      return;
    }

    let completedRequests = 0;

    for (const vendor of vendors) {

      this.http.get<any>(
        `${this.apiUrl}/notifications/vendor/${vendor.id}/approval`
      ).subscribe({

        next: (alert: any) => {

          if (
            alert &&
            alert.title ===
            'Vendor Approved'
          ) {

            vendorNotifications.push({
              type: 'success',
              icon: '✓',
              category: 'VENDOR APPROVAL',
              title: alert.title,
              vendor:
                alert.vendor_name ||
                'Vendor',
              description:
                alert.message ||
                'Vendor has been approved.',
              score: null,
              time: 'Current',
              read:
                alert.status !== 'Unread'
            });
          }
        },

        error: (error: any) => {

          console.error(
            'VENDOR APPROVAL ERROR:',
            error
          );
        },

        complete: () => {

          completedRequests++;

          if (
            completedRequests ===
            vendors.length
          ) {

            this.loadProcurementNotifications(
              vendorNotifications
            );
          }
        }
      });
    }
  }

  loadProcurementNotifications(
    existingNotifications: any[]
  ): void {

    this.http.get<any[]>(
      `${this.apiUrl}/procurements/`
    ).subscribe({

      next: (procurements: any[]) => {

        console.log(
          'NOTIFICATION PROCUREMENTS:',
          procurements
        );

        const procurementNotifications: any[] = [];

        for (const procurement of procurements) {

          const itemName =
            procurement.item_name ||
            procurement.item ||
            procurement.product_name ||
            'Procurement Item';

          procurementNotifications.push({

            type: 'info',

            icon: 'i',

            category: 'PROCUREMENT',

            title:
              procurement.status === 'Approved'
                ? 'Procurement Approved'
                : 'Procurement Request',

            vendor:
              `Procurement #${procurement.id}`,

            description:
              procurement.status === 'Approved'
                ? `${itemName} procurement request has been approved.`
                : `${itemName} procurement request is available.`,

            score: null,

            time:
              this.formatDate(
                procurement.request_date
              ),

            read: false
          });
        }

        this.loadBackendProcurementAlerts(
          procurements,
          [
            ...existingNotifications,
            ...procurementNotifications
          ]
        );
      },

      error: (error: any) => {

        console.error(
          'NOTIFICATION PROCUREMENT ERROR:',
          error
        );

        this.loadPurchaseOrderNotifications(
          existingNotifications
        );
      }
    });
  }

  loadBackendProcurementAlerts(
    procurements: any[],
    existingNotifications: any[]
  ): void {

    if (procurements.length === 0) {

      this.loadPurchaseOrderNotifications(
        existingNotifications
      );

      return;
    }

    let completedRequests = 0;

    for (const procurement of procurements) {

      this.http.get<any>(
        `${this.apiUrl}/notifications/procurement/${procurement.id}/alert`
      ).subscribe({

        next: (alert: any) => {

          if (
            alert &&
            alert.title &&
            alert.message
          ) {

            const alertType =
              alert.title.includes('Approved')
                ? 'success'
                : 'warning';

            const alertIcon =
              alertType === 'success'
                ? '✓'
                : '⚠';

            existingNotifications.push({

              type: alertType,

              icon: alertIcon,

              category:
                'PROCUREMENT ALERT',

              title:
                alert.title,

              vendor:
                `Procurement #${procurement.id}`,

              description:
                alert.message,

              score: null,

              time: 'Current',

              read:
                alert.status !== 'Unread'
            });
          }
        },

        error: (error: any) => {

          console.error(
            'PROCUREMENT ALERT ERROR:',
            error
          );
        },

        complete: () => {

          completedRequests++;

          if (
            completedRequests ===
            procurements.length
          ) {

            this.loadPurchaseOrderNotifications(
              existingNotifications
            );
          }
        }
      });
    }
  }

  loadPurchaseOrderNotifications(
    existingNotifications: any[]
  ): void {

    this.http.get<any[]>(
      `${this.apiUrl}/purchaseorders/`
    ).subscribe({

      next: (purchaseOrders: any[]) => {

        console.log(
          'NOTIFICATION PURCHASE ORDERS:',
          purchaseOrders
        );

        const purchaseOrderNotifications =
          purchaseOrders.map(
            (po: any) => {

              const orderNumber =
                po.order_number ||
                `PO #${po.id}`;

              const status =
                String(
                  po.status || 'Pending'
                );

              let type =
                'success';

              let icon =
                '✓';

              let title =
                'Purchase Order Created';

              if (
                status.toLowerCase() ===
                'rejected'
              ) {

                type = 'critical';

                icon = '!';

                title =
                  'Purchase Order Rejected';

              } else if (
                status.toLowerCase() ===
                'pending'
              ) {

                type = 'warning';

                icon = '⚠';

                title =
                  'Purchase Order Pending';

              } else if (
                status.toLowerCase() ===
                'approved'
              ) {

                type = 'success';

                icon = '✓';

                title =
                  'Purchase Order Approved';
              }

              return {

                type,

                icon,

                category:
                  'PURCHASE ORDER',

                title,

                vendor:
                  orderNumber,

                description:
                  `Purchase order ${orderNumber} is currently ${status}.`,

                score: null,

                time:
                  this.formatDate(
                    po.order_date
                  ),

                read: false
              };
            }
          );

        this.notifications = [
          ...existingNotifications,
          ...purchaseOrderNotifications
        ];

        this.finishLoading();
      },

      error: (error: any) => {

        console.error(
          'NOTIFICATION PURCHASE ORDER ERROR:',
          error
        );

        this.notifications =
          existingNotifications;

        this.finishLoading();
      }
    });
  }

  finishLoading(): void {

    this.notifications =
      [...this.notifications].reverse();

    this.calculateUnreadCount();

    this.loading = false;

    this.cdr.detectChanges();
  }

  getVendorName(vendor: any): string {

    const possibleName =
      vendor.vendor_name ||
      vendor.name ||
      vendor.company_name ||
      vendor.vendor ||
      'Vendor';

    if (
      typeof possibleName !== 'string' ||
      possibleName.trim() === ''
    ) {
      return 'Vendor';
    }

    return possibleName.trim();
  }

  formatDate(date: any): string {

    if (!date) {
      return 'Current';
    }

    const parsedDate =
      new Date(date);

    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {
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

  calculateUnreadCount(): void {

    this.unreadCount =
      this.notifications.filter(
        notification =>
          !notification.read
      ).length;
  }

  markAllAsRead(): void {

    this.notifications =
      this.notifications.map(
        notification => ({
          ...notification,
          read: true
        })
      );

    this.unreadCount = 0;

    this.cdr.detectChanges();
  }

  markAsRead(
    notification: any
  ): void {

    notification.read = true;

    this.calculateUnreadCount();

    this.cdr.detectChanges();
  }
}