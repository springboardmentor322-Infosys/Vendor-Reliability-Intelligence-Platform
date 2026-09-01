import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Vendor } from '../../services/vendor';
import { Order } from '../../services/order';
import { Auth } from '../../services/auth';

import {
  Dashboard as DashboardService
} from '../../services/dashboard';

import {
  Communication
} from '../../services/communication';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  user: any = null;

  role = '';
  Math = Math;
  Number = Number;

  get isProcurementManager(): boolean { return this.role === 'Procurement Manager'; }
  get isSupplyChainManager(): boolean { return this.role === 'Supply Chain Manager'; }
  get isVendor(): boolean { return this.role === 'Vendor'; }
  get isFinanceOfficer(): boolean { return this.role === 'Finance Officer'; }
  get isAuditor(): boolean { return this.role === 'Auditor'; }
  get isAdministrator(): boolean { return this.role === 'Administrator'; }


  // ==========================================
  // BASIC STATISTICS
  // ==========================================

  vendorCount = signal(0);

  pendingOrders = signal(0);

  totalOrders = signal(0);

  revenue = signal(0);

  revenueAnalytics =
  signal<any[]>([]);


  // ==========================================
  // CONTRACT STATISTICS
  // ==========================================

  activeContracts = signal(0);

  totalContracts = signal(0);


  // ==========================================
  // RELIABILITY STATISTICS
  // ==========================================

  averageReliability = signal(0);

  lowRiskVendors = signal(0);

  mediumRiskVendors = signal(0);

  highRiskVendors = signal(0);


  // ==========================================
  // PROCUREMENT ANALYTICS
  // ==========================================

  procurementValue = signal(0);

  averageOrderValue = signal(0);

  highestOrderValue = signal(0);


  // ==========================================
  // COMMUNICATION ANALYTICS
  // ==========================================

  totalCommunications = signal(0);

  vendorMessages = signal(0);

  procurementDiscussions = signal(0);

  activityLogs = signal(0);


  // ==========================================
  // ANALYTICS DATA
  // ==========================================

  vendorReliability =
    signal<any[]>([]);

  highRiskVendorList =
    signal<any[]>([]);

  contractExpiryAlerts =
    signal<any[]>([]);


  // ==========================================
  // ORDER STATUS
  // ==========================================

  orderStatusSummary =
    signal<Record<string, number>>({});


  // ==========================================
  // RECENT ORDERS
  // ==========================================

  recentOrders =
    signal<any[]>([]);


  vendors: any[] = [];


  loading = signal(false);


  constructor(
    private auth: Auth,
    private vendorService: Vendor,
    private orderService: Order,
    private dashboardService: DashboardService,
    private communicationService: Communication,
    private router: Router
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.user = this.auth.getCurrentUser();
    this.role = this.user?.role || 'Vendor';

    this.loadDashboard();

    this.loadVendors();

    this.loadRevenueAnalytics();

    this.loadRecentOrders();

    this.loadVendorReliability();

    this.loadContractAlerts();

    this.loadCommunicationAnalytics();

  }


  // ==========================================
  // DASHBOARD SUMMARY
  // ==========================================

  loadDashboard(): void {

    this.loading.set(true);


    this.dashboardService
      .getDashboardSummary()
      .subscribe({

        next: (response: any) => {

          this.vendorCount.set(
            response?.vendors?.total || 0
          );


          this.totalOrders.set(
            response?.orders?.total || 0
          );


          this.pendingOrders.set(
            response?.orders?.pending || 0
          );


          this.revenue.set(
            response?.orders?.revenue || 0
          );


          this.totalContracts.set(
            response?.contracts?.total || 0
          );


          this.activeContracts.set(
            response?.contracts?.active || 0
          );


          this.averageReliability.set(
            response?.reliability?.average_score || 0
          );


          this.lowRiskVendors.set(
            response?.reliability?.low_risk || 0
          );


          this.mediumRiskVendors.set(
            response?.reliability?.medium_risk || 0
          );


          this.highRiskVendors.set(
            response?.reliability?.high_risk || 0
          );


          this.loading.set(false);

        },


        error: (error: any) => {

          console.error(
            'Dashboard summary error:',
            error
          );

          this.loading.set(false);

        }

      });


    // ========================================
    // ORDER STATUS
    // ========================================

    this.dashboardService
      .getOrderStatus()
      .subscribe({

        next: (response: any[]) => {

          const summary:
            Record<string, number> = {};


          response.forEach(
            item => {

              summary[item.status] =
                item.count;

            }
          );


          this.orderStatusSummary.set(
            summary
          );

        },


        error: (error: any) => {

          console.error(
            'Order status error:',
            error
          );

        }

      });

  }


  // ==========================================
  // VENDOR RELIABILITY
  // ==========================================

  loadVendorReliability(): void {

    this.dashboardService
      .getVendorReliability()
      .subscribe({

        next: (response: any[]) => {

          this.vendorReliability.set(
            response
          );


          const highRisk =
            response.filter(
              vendor =>
                vendor.risk_level ===
                'High Risk'
            );


          this.highRiskVendorList.set(
            highRisk
          );

        },


        error: (error: any) => {

          console.error(
            'Vendor reliability error:',
            error
          );

        }

      });

  }


  // ==========================================
  // CONTRACT EXPIRY ALERTS
  // ==========================================

  loadContractAlerts(): void {

    this.dashboardService
      .getContractExpiryAlerts()
      .subscribe({

        next: (response: any[]) => {

          this.contractExpiryAlerts.set(
            response
          );

        },


        error: (error: any) => {

          console.error(
            'Contract expiry error:',
            error
          );

        }

      });

  }


  // ==========================================
  // LOAD VENDORS
  // ==========================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response: any[]) => {

          this.vendors = response;

        },


        error: (error: any) => {

          console.error(
            'Vendor loading error:',
            error
          );

        }

      });

  }


  // ==========================================
  // LOAD RECENT ORDERS
  // ==========================================

  loadRecentOrders(): void {

    this.orderService
      .getOrders()
      .subscribe({

        next: (response: any[]) => {

          // ====================================
          // PROCUREMENT ANALYTICS
          // ====================================

          let totalValue = 0;

          let highestValue = 0;


          response.forEach(
            order => {

              const amount =
                Number(order.amount) || 0;


              totalValue += amount;


              if (
                amount >
                highestValue
              ) {

                highestValue =
                  amount;

              }

            }
          );


          const averageValue =
            response.length > 0
              ? totalValue / response.length
              : 0;


          this.procurementValue.set(
            totalValue
          );


          this.averageOrderValue.set(
            averageValue
          );


          this.highestOrderValue.set(
            highestValue
          );


          // ====================================
          // LATEST 5 ORDERS
          // ====================================

          const latest =
            [...response]
              .reverse()
              .slice(0, 5);


          this.recentOrders.set(
            latest
          );

        },


        error: (error: any) => {

          console.error(
            'Recent orders error:',
            error
          );

        }

      });

  }


  // ==========================================
  // COMMUNICATION ANALYTICS
  // ==========================================

  loadCommunicationAnalytics(): void {

    this.communicationService
      .getCommunications()
      .subscribe({

        next: (response: any[]) => {

          let vendorCount = 0;

          let procurementCount = 0;

          let activityCount = 0;


          response.forEach(
            communication => {

              switch (
                communication.communication_type
              ) {

                case 'Vendor Message':

                  vendorCount++;

                  break;


                case 'Procurement Discussion':

                  procurementCount++;

                  break;


                case 'Activity Log':

                  activityCount++;

                  break;

              }

            }
          );


          this.totalCommunications.set(
            response.length
          );


          this.vendorMessages.set(
            vendorCount
          );


          this.procurementDiscussions.set(
            procurementCount
          );


          this.activityLogs.set(
            activityCount
          );

        },


        error: (error: any) => {

          console.error(
            'Communication analytics error:',
            error
          );

        }

      });

  }


  // ==========================================
  // GET VENDOR NAME
  // ==========================================

  getVendorName(
    vendorId: number
  ): string {

    const vendor =
      this.vendors.find(
        item =>
          item.id === vendorId
      );


    return vendor
      ? vendor.vendor_name
      : `Vendor #${vendorId}`;

  }


  // ==========================================
  // VIEW ORDERS
  // ==========================================

  viewAllOrders(): void {

    this.router.navigate([
      '/orders'
    ]);

  }


  // ==========================================
  // VIEW CONTRACTS
  // ==========================================

  viewContracts(): void {

    this.router.navigate([
      '/contracts'
    ]);

  }


  // ==========================================
  // RELIABILITY CLASS
  // ==========================================

  getReliabilityClass(
    score: number
  ): string {

    if (score >= 80) {

      return 'reliability-good';

    }


    if (score >= 60) {

      return 'reliability-medium';

    }


    return 'reliability-danger';

  }


  // ==========================================
  // REVENUE BAR WIDTH
  // ==========================================

  getRevenuePercentage(revenue: number): number {

    const values = this.revenueAnalytics().map(
      item => Number(item.revenue) || 0
    );

    const maxRevenue = values.length
      ? Math.max(...values)
      : 0;

    if (maxRevenue <= 0) {
      return 0;
    }

    return Math.max(4, Math.round((Number(revenue) / maxRevenue) * 100));
  }


  // ==========================================
  // RISK CLASS
  // ==========================================

  getRiskClass(
    risk: string
  ): string {

    if (risk === 'Low Risk') {

      return 'risk-low';

    }


    if (risk === 'Medium Risk') {

      return 'risk-medium';

    }


    return 'risk-high';

  }

  // ==========================================
  // REVENUE ANALYTICS
  // ==========================================

  loadRevenueAnalytics(): void {

    this.dashboardService
      .getRevenueAnalytics()
      .subscribe({

        next: (response: any[]) => {

          this.revenueAnalytics.set(
            response || []
          );

        },

        error: (error: any) => {

          console.error(
            'Revenue analytics error:',
            error
          );

          this.revenueAnalytics.set([]);

        }

      });

  }

}