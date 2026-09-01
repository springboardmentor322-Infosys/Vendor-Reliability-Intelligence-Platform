import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RoleDirective } from '../../directives/role.directive';
import { FormsModule } from '@angular/forms';

import { Performance } from '../../services/performance';
import { Vendor } from '../../services/vendor';


@Component({
  selector: 'app-vendor-performance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RoleDirective
  ],
  templateUrl: './vendor-performance.html',
  styleUrl: './vendor-performance.css'
})
export class VendorPerformance implements OnInit {

  // ==========================================
  // PERFORMANCE RECORDS
  // ==========================================

  performanceRecords =
    signal<any[]>([]);


  // ==========================================
  // RELIABILITY
  // ==========================================

  reliabilityRecords =
    signal<any[]>([]);


  // ==========================================
  // VENDORS
  // ==========================================

  vendors =
    signal<any[]>([]);


  // ==========================================
  // TREND
  // ==========================================

  trendRecords =
    signal<any[]>([]);

  selectedTrendVendorId:
    number | null = null;

  trendLoading =
    signal(false);


  // ==========================================
  // COMPARISON
  // ==========================================

  selectedComparisonVendorAId:
    number | null = null;

  selectedComparisonVendorBId:
    number | null = null;

  comparisonData =
    signal<any | null>(null);

  comparisonLoading =
    signal(false);


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);

  reliabilityLoading =
    signal(false);


  // ==========================================
  // FORM
  // ==========================================

  showForm =
    signal(false);

  selectedVendorId:
    number | null = null;

  onTimeDeliveries = 0;

  delayedDeliveries = 0;

  qualityRating = 0;

  responseTime = 0;

  issueResolutionTime = 0;

  orderCompletionRate = 0;

  serviceRating = 0;

  performanceDate = '';


  constructor(
    private performanceService: Performance,
    private vendorService: Vendor
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadVendors();

    this.loadPerformance();

    this.loadReliability();

  }


  // ==========================================
  // LOAD VENDORS
  // ==========================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response: any[]) => {

          this.vendors.set(response);

        },

        error: (error: any) => {

          console.error(
            'Failed to load vendors:',
            error
          );

        }

      });

  }


  // ==========================================
  // LOAD PERFORMANCE
  // ==========================================

  loadPerformance(): void {

    this.loading.set(true);

    this.performanceService
      .getPerformance()
      .subscribe({

        next: (response: any[]) => {

          this.performanceRecords.set(
            response
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load performance:',
            error
          );

          this.performanceRecords.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // LOAD RELIABILITY
  // ==========================================

  loadReliability(): void {

    this.reliabilityLoading.set(true);

    this.performanceService
      .getVendorReliability()
      .subscribe({

        next: (response: any[]) => {

          this.reliabilityRecords.set(
            response
          );

          this.reliabilityLoading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load reliability:',
            error
          );

          this.reliabilityRecords.set([]);

          this.reliabilityLoading.set(false);

        }

      });

  }


  // ==========================================
  // LOAD TREND
  // ==========================================

  loadPerformanceTrend(): void {

    if (
      this.selectedTrendVendorId === null
    ) {

      this.trendRecords.set([]);

      return;

    }


    this.trendLoading.set(true);

    this.performanceService
      .getPerformanceTrend(
        this.selectedTrendVendorId
      )
      .subscribe({

        next: (response: any[]) => {

          this.trendRecords.set(
            response
          );

          this.trendLoading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load performance trend:',
            error
          );

          this.trendRecords.set([]);

          this.trendLoading.set(false);

        }

      });

  }


  // ==========================================
  // SELECT TREND VENDOR
  // ==========================================

  selectTrendVendor(
    vendorId: number
  ): void {

    this.selectedTrendVendorId =
      vendorId;

    this.loadPerformanceTrend();

  }


  // ==========================================
  // COMPARE VENDORS
  // ==========================================

  compareVendors(): void {

    if (
      this.selectedComparisonVendorAId === null ||
      this.selectedComparisonVendorBId === null
    ) {

      alert(
        'Please select two vendors.'
      );

      return;

    }


    if (
      this.selectedComparisonVendorAId ===
      this.selectedComparisonVendorBId
    ) {

      alert(
        'Please select two different vendors.'
      );

      return;

    }


    this.comparisonLoading.set(true);

    this.comparisonData.set(null);


    this.performanceService
      .compareVendors(
        this.selectedComparisonVendorAId,
        this.selectedComparisonVendorBId
      )
      .subscribe({

        next: (response: any) => {

          this.comparisonData.set(
            response
          );

          this.comparisonLoading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to compare vendors:',
            error
          );

          this.comparisonData.set(null);

          this.comparisonLoading.set(false);

          alert(
            error?.error?.detail ||
            'Failed to compare vendors.'
          );

        }

      });

  }


  // ==========================================
  // RESET COMPARISON
  // ==========================================

  resetComparison(): void {

    this.selectedComparisonVendorAId =
      null;

    this.selectedComparisonVendorBId =
      null;

    this.comparisonData.set(null);

  }


  // ==========================================
  // GET COMPARISON VENDOR
  // ==========================================

  getComparisonVendor(
    side: 'a' | 'b'
  ): any {

    const comparison =
      this.comparisonData();

    if (!comparison) {

      return null;

    }


    return side === 'a'
      ? comparison.vendor_a
      : comparison.vendor_b;

  }


  // ==========================================
  // COMPARISON DELIVERY %
  // ==========================================

  getComparisonDeliveryPercentage(
    side: 'a' | 'b'
  ): number {

    const vendor =
      this.getComparisonVendor(side);

    if (!vendor) {

      return 0;

    }


    // If backend already provides it

    if (
      vendor.delivery_percentage !==
      undefined &&
      vendor.delivery_percentage !== null
    ) {

      return Number(
        vendor.delivery_percentage
      );

    }


    // Otherwise calculate it

    return this.getOnTimePercentage(
      vendor
    );

  }


  // ==========================================
  // CHECK HIGHER VALUE
  // ==========================================

  isHigher(
    side: 'a' | 'b',
    metric: string
  ): boolean {

    const vendor =
      this.getComparisonVendor(side);

    const otherVendor =
      this.getComparisonVendor(
        side === 'a' ? 'b' : 'a'
      );


    if (
      !vendor ||
      !otherVendor
    ) {

      return false;

    }


    if (
      metric === 'delivery_percentage'
    ) {

      return (
        this.getComparisonDeliveryPercentage(side) >
        this.getComparisonDeliveryPercentage(
          side === 'a' ? 'b' : 'a'
        )
      );

    }


    return (
      Number(vendor[metric] ?? 0) >
      Number(otherVendor[metric] ?? 0)
    );

  }


  // ==========================================
  // CHECK LOWER VALUE
  // ==========================================

  isLower(
    side: 'a' | 'b',
    metric: string
  ): boolean {

    const vendor =
      this.getComparisonVendor(side);

    const otherVendor =
      this.getComparisonVendor(
        side === 'a' ? 'b' : 'a'
      );


    if (
      !vendor ||
      !otherVendor
    ) {

      return false;

    }


    return (
      Number(vendor[metric] ?? 0) <
      Number(otherVendor[metric] ?? 0)
    );

  }


  // ==========================================
  // TREND DELIVERY
  // ==========================================

  getTrendDelivery(
    record: any
  ): number {

    return this.getOnTimePercentage(
      record
    );

  }


  // ==========================================
  // TREND QUALITY
  // ==========================================

  getTrendQuality(
    record: any
  ): number {

    const rating =
      Number(
        record?.quality_rating || 0
      );

    return Math.round(
      (rating / 5) * 100
    );

  }


  // ==========================================
  // TREND SERVICE
  // ==========================================

  getTrendService(
    record: any
  ): number {

    const rating =
      Number(
        record?.service_rating || 0
      );

    return Math.round(
      (rating / 5) * 100
    );

  }


  // ==========================================
  // TREND AVERAGE
  // ==========================================

  getTrendAverage(
    record: any
  ): number {

    if (!record) {

      return 0;

    }


    const delivery =
      this.getTrendDelivery(record);

    const quality =
      this.getTrendQuality(record);

    const completion =
      Number(
        record?.order_completion_rate || 0
      );

    const service =
      this.getTrendService(record);


    return Math.round(
      (
        delivery +
        quality +
        completion +
        service
      ) / 4
    );

  }


  // ==========================================
  // TREND POINT X
  // ==========================================

  getTrendPointX(
    index: number
  ): number {

    const records =
      this.trendRecords();

    if (records.length <= 1) {

      return 50;

    }


    const width = 760;

    const left = 40;

    const right = 20;


    return (
      left +
      (
        index /
        (records.length - 1)
      ) *
      (width - left - right)
    );

  }


  // ==========================================
  // TREND POINT Y
  // ==========================================

  getTrendPointY(
    record: any
  ): number {

    const height = 220;

    const top = 20;

    const bottom = 30;

    const score =
      this.getTrendAverage(record);


    return (
      top +
      (
        (100 - score) /
        100
      ) *
      (height - top - bottom)
    );

  }


  // ==========================================
  // TREND DATE
  // ==========================================

  getTrendDate(
    record: any
  ): string {

    if (!record?.performance_date) {

      return '';

    }


    const date =
      new Date(
        record.performance_date
      );


    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );

  }


  // ==========================================
  // TREND SMOOTH PATH
  // ==========================================

  getTrendSmoothPath(): string {

    const records =
      this.trendRecords();


    if (records.length === 0) {

      return '';

    }


    if (records.length === 1) {

      const x =
        this.getTrendPointX(0);

      const y =
        this.getTrendPointY(
          records[0]
        );

      return `M ${x} ${y}`;

    }


    let path = '';


    for (
      let i = 0;
      i < records.length;
      i++
    ) {

      const x =
        this.getTrendPointX(i);

      const y =
        this.getTrendPointY(
          records[i]
        );


      if (i === 0) {

        path =
          `M ${x} ${y}`;

        continue;

      }


      const previousX =
        this.getTrendPointX(
          i - 1
        );

      const previousY =
        this.getTrendPointY(
          records[i - 1]
        );


      const controlX =
        (previousX + x) / 2;


      path +=
        ` C ${controlX} ${previousY},` +
        ` ${controlX} ${y},` +
        ` ${x} ${y}`;

    }


    return path;

  }


  // ==========================================
  // TREND TOOLTIP
  // ==========================================

  getTrendTooltip(
    record: any
  ): string {

    const score =
      this.getTrendAverage(record);

    const delivery =
      this.getTrendDelivery(record);

    const quality =
      this.formatRating(
        record.quality_rating
      );

    const completion =
      record.order_completion_rate;

    const service =
      this.formatRating(
        record.service_rating
      );


    return (
      `Date: ${this.getTrendDate(record)}\n` +
      `Performance: ${score}%\n` +
      `Delivery: ${delivery}%\n` +
      `Quality: ${quality}/5\n` +
      `Completion: ${completion}%\n` +
      `Service: ${service}/5`
    );

  }


  // ==========================================
  // OPEN FORM
  // ==========================================

  openForm(): void {

    this.resetForm();

    this.showForm.set(true);

  }


  // ==========================================
  // CLOSE FORM
  // ==========================================

  closeForm(): void {

    this.showForm.set(false);

  }


  // ==========================================
  // RESET FORM
  // ==========================================

  resetForm(): void {

    this.selectedVendorId = null;

    this.onTimeDeliveries = 0;

    this.delayedDeliveries = 0;

    this.qualityRating = 0;

    this.responseTime = 0;

    this.issueResolutionTime = 0;

    this.orderCompletionRate = 0;

    this.serviceRating = 0;

    this.performanceDate = '';

  }


  // ==========================================
  // SAVE PERFORMANCE
  // ==========================================

  savePerformance(): void {

    if (
      this.selectedVendorId === null
    ) {

      alert(
        'Please select a vendor.'
      );

      return;

    }


    if (!this.performanceDate) {

      alert(
        'Please select a performance date.'
      );

      return;

    }


    if (
      this.onTimeDeliveries < 0 ||
      this.delayedDeliveries < 0
    ) {

      alert(
        'Delivery values cannot be negative.'
      );

      return;

    }


    if (
      this.qualityRating < 0 ||
      this.qualityRating > 5
    ) {

      alert(
        'Quality rating must be between 0 and 5.'
      );

      return;

    }


    if (
      this.serviceRating < 0 ||
      this.serviceRating > 5
    ) {

      alert(
        'Service rating must be between 0 and 5.'
      );

      return;

    }


    if (
      this.responseTime < 0 ||
      this.issueResolutionTime < 0
    ) {

      alert(
        'Time values cannot be negative.'
      );

      return;

    }


    if (
      this.orderCompletionRate < 0 ||
      this.orderCompletionRate > 100
    ) {

      alert(
        'Completion rate must be between 0 and 100.'
      );

      return;

    }


    const data = {

      vendor_id:
        this.selectedVendorId,

      on_time_deliveries:
        this.onTimeDeliveries,

      delayed_deliveries:
        this.delayedDeliveries,

      quality_rating:
        this.qualityRating,

      response_time:
        this.responseTime,

      issue_resolution_time:
        this.issueResolutionTime,

      order_completion_rate:
        this.orderCompletionRate,

      service_rating:
        this.serviceRating,

      performance_date:
        this.performanceDate

    };


    this.performanceService
      .createPerformance(data)
      .subscribe({

        next: () => {

          const vendorId =
            this.selectedVendorId;

          this.closeForm();

          this.loadPerformance();

          this.loadReliability();


          if (
            this.selectedTrendVendorId !== null &&
            this.selectedTrendVendorId ===
            vendorId
          ) {

            this.loadPerformanceTrend();

          }

        },

        error: (error: any) => {

          console.error(
            'Failed to create performance:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to create performance record.'
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
      this.vendors().find(
        vendor =>
          vendor.id === vendorId
      );


    return vendor
      ? vendor.vendor_name
      : `Vendor #${vendorId}`;

  }


  // ==========================================
  // DELIVERY TOTAL
  // ==========================================

  getDeliveryTotal(
    record: any
  ): number {

    return (
      Number(record?.on_time_deliveries || 0) +
      Number(record?.delayed_deliveries || 0)
    );

  }


  // ==========================================
  // ON-TIME DELIVERY %
  // ==========================================

  getOnTimePercentage(
    record: any
  ): number {

    const total =
      this.getDeliveryTotal(record);


    if (total === 0) {

      return 0;

    }


    return Math.round(
      (
        Number(
          record?.on_time_deliveries || 0
        ) /
        total
      ) * 100
    );

  }


  // ==========================================
  // FORMAT RATING
  // ==========================================

  formatRating(
    rating: number
  ): string {

    return Number(
      rating || 0
    ).toFixed(1);

  }

}