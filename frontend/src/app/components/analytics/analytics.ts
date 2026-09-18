
import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class Analytics implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private apiUrl = 'http://127.0.0.1:8000';

  loading = true;

  // =========================================================
  // LOADING STATES
  // =========================================================

  private vendorsLoaded = false;
  private procurementsLoaded = false;
  private purchaseOrdersLoaded = false;

  // HTML uses this property, so it must NOT be private
  supplyChainLoaded = false;

  // =========================================================
  // VENDOR ANALYTICS
  // =========================================================

  vendors: any[] = [];

  totalVendors = 0;
  lowRiskVendors = 0;
  mediumRiskVendors = 0;
  highRiskVendors = 0;
  pendingRiskVendors = 0;
  averageReliability = 0;

  // =========================================================
  // PROCUREMENT ANALYTICS
  // =========================================================

  procurements: any[] = [];

  totalProcurements = 0;
  totalBudget = 0;

  pendingProcurements = 0;
  approvedProcurements = 0;
  orderedProcurements = 0;
  deliveredProcurements = 0;
  completedProcurements = 0;
  cancelledProcurements = 0;

  // =========================================================
  // PURCHASE ORDER ANALYTICS
  // =========================================================

  purchaseOrders: any[] = [];

  totalPurchaseOrders = 0;
  totalOrderValue = 0;

  pendingOrders = 0;
  approvedOrders = 0;
  rejectedOrders = 0;
  completedOrders = 0;

  // =========================================================
  // SUPPLY CHAIN ANALYTICS
  // These names match your analytics.html
  // =========================================================

  totalSupplyChainOrders = 0;
  totalSuppliers = 0;
  totalQuantity = 0;
  totalDefectiveUnits = 0;
  totalPurchaseValue = 0;

  orderStatus: { [key: string]: number } = {};
  supplierOrders: { [key: string]: number } = {};
  categoryOrders: { [key: string]: number } = {};
  compliance: { [key: string]: number } = {};
  defectiveBySupplier: { [key: string]: number } = {};

  orderStatusEntries: any[] = [];
  supplierOrderEntries: any[] = [];
  categoryOrderEntries: any[] = [];
  complianceEntries: any[] = [];
  defectiveSupplierEntries: any[] = [];

  // =========================================================
  // INITIALIZE
  // =========================================================

  ngOnInit(): void {
    this.loadAnalytics();
  }

  // =========================================================
  // LOAD ALL ANALYTICS
  // =========================================================

  loadAnalytics(): void {

    this.loading = true;

    this.vendorsLoaded = false;
    this.procurementsLoaded = false;
    this.purchaseOrdersLoaded = false;
    this.supplyChainLoaded = false;

    this.loadVendors();
    this.loadProcurements();
    this.loadPurchaseOrders();
    this.loadSupplyChainAnalytics();
  }

  // =========================================================
  // VENDORS
  // =========================================================

  private loadVendors(): void {

    this.http.get<any[]>(
      `${this.apiUrl}/vendors/`
    ).subscribe({

      next: (data: any[]) => {

        console.log(
          'ANALYTICS VENDORS:',
          data
        );

        this.vendors =
          Array.isArray(data) ? data : [];

        this.calculateVendorAnalytics();

        this.vendorsLoaded = true;

        this.checkLoading();
      },

      error: (error: any) => {

        console.error(
          'ANALYTICS VENDOR ERROR:',
          error
        );

        this.vendors = [];

        this.calculateVendorAnalytics();

        this.vendorsLoaded = true;

        this.checkLoading();
      }

    });
  }

  private calculateVendorAnalytics(): void {

    this.totalVendors = this.vendors.length;

    this.lowRiskVendors = 0;
    this.mediumRiskVendors = 0;
    this.highRiskVendors = 0;
    this.pendingRiskVendors = 0;

    let totalScore = 0;
    let scoreCount = 0;

    this.vendors.forEach((vendor: any) => {

      const risk =
        String(vendor?.risk_level || '')
          .trim()
          .toLowerCase();

      if (risk.includes('low')) {
        this.lowRiskVendors++;
      }
      else if (risk.includes('medium')) {
        this.mediumRiskVendors++;
      }
      else if (risk.includes('high')) {
        this.highRiskVendors++;
      }
      else {
        this.pendingRiskVendors++;
      }

      const score =
        Number(vendor?.reliability_score);

      if (Number.isFinite(score)) {

        totalScore += score;
        scoreCount++;

      }

    });

    this.averageReliability =
      scoreCount > 0
        ? Number(
            (totalScore / scoreCount).toFixed(2)
          )
        : 0;
  }

  // =========================================================
  // PROCUREMENT
  // =========================================================

  private loadProcurements(): void {

    this.http.get<any[]>(
      `${this.apiUrl}/procurements/`
    ).subscribe({

      next: (data: any[]) => {

        console.log(
          'ANALYTICS PROCUREMENT:',
          data
        );

        this.procurements =
          Array.isArray(data) ? data : [];

        this.calculateProcurementAnalytics();

        this.procurementsLoaded = true;

        this.checkLoading();
      },

      error: (error: any) => {

        console.error(
          'ANALYTICS PROCUREMENT ERROR:',
          error
        );

        this.procurements = [];

        this.calculateProcurementAnalytics();

        this.procurementsLoaded = true;

        this.checkLoading();
      }

    });
  }

  private calculateProcurementAnalytics(): void {

    this.totalProcurements =
      this.procurements.length;

    this.totalBudget = 0;

    this.pendingProcurements = 0;
    this.approvedProcurements = 0;
    this.orderedProcurements = 0;
    this.deliveredProcurements = 0;
    this.completedProcurements = 0;
    this.cancelledProcurements = 0;

    this.procurements.forEach(
      (procurement: any) => {

        const budget =
          Number(procurement?.budget);

        if (Number.isFinite(budget)) {
          this.totalBudget += budget;
        }

        const status =
          String(procurement?.status || '')
            .trim()
            .toLowerCase();

        if (status === 'pending') {
          this.pendingProcurements++;
        }
        else if (status === 'approved') {
          this.approvedProcurements++;
        }
        else if (status.includes('ordered')) {
          this.orderedProcurements++;
        }
        else if (status.includes('delivered')) {
          this.deliveredProcurements++;
        }
        else if (status.includes('completed')) {
          this.completedProcurements++;
        }
        else if (status.includes('cancelled')) {
          this.cancelledProcurements++;
        }

      }
    );
  }

  // =========================================================
  // PURCHASE ORDERS
  // =========================================================

  private loadPurchaseOrders(): void {

    this.http.get<any[]>(
      `${this.apiUrl}/purchaseorders`
    ).subscribe({

      next: (data: any[]) => {

        console.log(
          'ANALYTICS PURCHASE ORDERS:',
          data
        );

        this.purchaseOrders =
          Array.isArray(data) ? data : [];

        this.calculatePurchaseOrderAnalytics();

        this.purchaseOrdersLoaded = true;

        this.checkLoading();
      },

      error: (error: any) => {

        console.error(
          'ANALYTICS PURCHASE ORDER ERROR:',
          error
        );

        this.purchaseOrders = [];

        this.calculatePurchaseOrderAnalytics();

        this.purchaseOrdersLoaded = true;

        this.checkLoading();
      }

    });
  }

  private calculatePurchaseOrderAnalytics(): void {

    this.totalPurchaseOrders =
      this.purchaseOrders.length;

    this.totalOrderValue = 0;

    this.pendingOrders = 0;
    this.approvedOrders = 0;
    this.rejectedOrders = 0;
    this.completedOrders = 0;

    this.purchaseOrders.forEach(
      (order: any) => {

        const amount =
          Number(order?.amount);

        if (Number.isFinite(amount)) {
          this.totalOrderValue += amount;
        }

        const status =
          String(order?.status || '')
            .trim()
            .toLowerCase();

        if (status === 'pending') {
          this.pendingOrders++;
        }
        else if (status === 'approved') {
          this.approvedOrders++;
        }
        else if (status === 'rejected') {
          this.rejectedOrders++;
        }
        else if (status.includes('completed')) {
          this.completedOrders++;
        }

      }
    );
  }

  // =========================================================
  // SUPPLY CHAIN ANALYTICS
  // =========================================================

  private loadSupplyChainAnalytics(): void {

    this.http.get<any>(
      `${this.apiUrl}/supply-chain/analytics`
    ).subscribe({

      next: (data: any) => {

        console.log(
          'ANALYTICS SUPPLY CHAIN:',
          data
        );

        this.processSupplyChainData(data);

        this.supplyChainLoaded = true;

        this.checkLoading();
      },

      error: (error: any) => {

        console.error(
          'ANALYTICS SUPPLY CHAIN ERROR:',
          error
        );

        this.resetSupplyChainAnalytics();

        this.supplyChainLoaded = true;

        this.checkLoading();
      }

    });
  }

  private processSupplyChainData(
    data: any
  ): void {

    this.totalSupplyChainOrders =
      Number(data?.total_orders || 0);

    this.totalSuppliers =
      Number(data?.total_suppliers || 0);

    this.totalQuantity =
      Number(data?.total_quantity || 0);

    this.totalDefectiveUnits =
      Number(
        data?.total_defective_units || 0
      );

    this.totalPurchaseValue =
      Number(
        data?.total_purchase_value || 0
      );

    this.orderStatus =
      data?.order_status || {};

    this.supplierOrders =
      data?.supplier_orders || {};

    this.categoryOrders =
      data?.category_orders || {};

    this.compliance =
      data?.compliance || {};

    this.defectiveBySupplier =
      data?.defective_by_supplier || {};

    // Order Status
    this.orderStatusEntries =
      Object.entries(
        this.orderStatus
      ).map(
        ([name, value]) => ({
          name,
          value: Number(value)
        })
      );

    // Supplier Orders
    this.supplierOrderEntries =
      Object.entries(
        this.supplierOrders
      ).map(
        ([name, value]) => ({
          name,
          value: Number(value)
        })
      );

    // Category Orders
    this.categoryOrderEntries =
      Object.entries(
        this.categoryOrders
      ).map(
        ([name, value]) => ({
          name,
          value: Number(value)
        })
      );

    // Compliance
    this.complianceEntries =
      Object.entries(
        this.compliance
      ).map(
        ([name, value]) => ({
          name,
          value: Number(value)
        })
      );

    // Defective Units
    this.defectiveSupplierEntries =
      Object.entries(
        this.defectiveBySupplier
      ).map(
        ([name, value]) => ({
          name,
          value: Number(value)
        })
      );
  }

  private resetSupplyChainAnalytics(): void {

    this.totalSupplyChainOrders = 0;
    this.totalSuppliers = 0;
    this.totalQuantity = 0;
    this.totalDefectiveUnits = 0;
    this.totalPurchaseValue = 0;

    this.orderStatus = {};
    this.supplierOrders = {};
    this.categoryOrders = {};
    this.compliance = {};
    this.defectiveBySupplier = {};

    this.orderStatusEntries = [];
    this.supplierOrderEntries = [];
    this.categoryOrderEntries = [];
    this.complianceEntries = [];
    this.defectiveSupplierEntries = [];
  }

  // =========================================================
  // LOADING CHECK
  // =========================================================

  private checkLoading(): void {

    if (
      this.vendorsLoaded &&
      this.procurementsLoaded &&
      this.purchaseOrdersLoaded &&
      this.supplyChainLoaded
    ) {

      this.loading = false;

      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // RISK PERCENTAGE
  // =========================================================

  getRiskPercentage(
    count: number
  ): number {

    if (this.totalVendors === 0) {
      return 0;
    }

    return Number(
      (
        (count / this.totalVendors) * 100
      ).toFixed(1)
    );
  }

  // =========================================================
  // PROCUREMENT PERCENTAGE
  // =========================================================

  getProcurementPercentage(
    count: number
  ): number {

    if (this.totalProcurements === 0) {
      return 0;
    }

    return Number(
      (
        (count / this.totalProcurements) * 100
      ).toFixed(1)
    );
  }

  // =========================================================
  // RELIABILITY WIDTH
  // =========================================================

  getReliabilityWidth(): number {

    if (this.averageReliability <= 0) {
      return 0;
    }

    return Math.min(
      this.averageReliability,
      100
    );
  }

  // =========================================================
  // SUPPLY CHAIN PERCENTAGE
  // =========================================================

  getSupplyChainPercentage(
    value: number
  ): number {

    if (this.totalSupplyChainOrders === 0) {
      return 0;
    }

    return Number(
      (
        (value / this.totalSupplyChainOrders) * 100
      ).toFixed(1)
    );
  }

  // =========================================================
  // DEFECTIVE PERCENTAGE
  // =========================================================

  getDefectivePercentage(): number {

    if (this.totalQuantity === 0) {
      return 0;
    }

    return Number(
      (
        (this.totalDefectiveUnits /
          this.totalQuantity) * 100
      ).toFixed(2)
    );
  }

  // =========================================================
  // COMPLIANCE PERCENTAGE
  // =========================================================

  getCompliancePercentage(
    value: number
  ): number {

    if (this.totalSupplyChainOrders === 0) {
      return 0;
    }

    return Number(
      (
        (value / this.totalSupplyChainOrders) * 100
      ).toFixed(1)
    );
  }

  // =========================================================
  // TOP SUPPLIER
  // =========================================================

  getTopSupplier(): string {

    if (
      this.supplierOrderEntries.length === 0
    ) {
      return '-';
    }

    const top =
      this.supplierOrderEntries.reduce(
        (previous: any, current: any) =>
          current.value > previous.value
            ? current
            : previous
      );

    return top.name;
  }

  getTopSupplierOrders(): number {

    if (
      this.supplierOrderEntries.length === 0
    ) {
      return 0;
    }

    const top =
      this.supplierOrderEntries.reduce(
        (previous: any, current: any) =>
          current.value > previous.value
            ? current
            : previous
      );

    return top.value;
  }

  // =========================================================
  // TOP CATEGORY
  // =========================================================

  getTopCategory(): string {

    if (
      this.categoryOrderEntries.length === 0
    ) {
      return '-';
    }

    const top =
      this.categoryOrderEntries.reduce(
        (previous: any, current: any) =>
          current.value > previous.value
            ? current
            : previous
      );

    return top.name;
  }

  // =========================================================
  // NON-COMPLIANT ORDERS
  // =========================================================

  getNonCompliantOrders(): number {

    const nonCompliant =
      this.complianceEntries.find(
        (item: any) =>
          String(item.name)
            .toLowerCase()
            .includes('non-compliant')
      );

    return nonCompliant
      ? Number(nonCompliant.value)
      : 0;
  }

  // =========================================================
  // SUPPLY CHAIN SUMMARY
  // =========================================================

  getSupplyChainSummary(): string {

    if (this.totalSupplyChainOrders === 0) {
      return 'No supply chain data is currently available.';
    }

    return `${this.totalSupplyChainOrders} orders across ${this.totalSuppliers} suppliers are currently being monitored.`;
  }

  // =========================================================
  // QUALITY SUMMARY
  // =========================================================

  getQualitySummary(): string {

    if (this.totalSupplyChainOrders === 0) {
      return 'No quality data is currently available.';
    }

    return `${this.totalDefectiveUnits} defective units were recorded across the supply chain dataset.`;
  }

  // =========================================================
  // RISK SUMMARY
  // =========================================================

  getRiskSummary(): string {

    if (this.totalVendors === 0) {
      return 'No vendor risk data is currently available.';
    }

    return `${this.lowRiskVendors} of ${this.totalVendors} vendors are classified as low risk.`;
  }

  // =========================================================
  // PROCUREMENT SUMMARY
  // =========================================================

  getProcurementSummary(): string {

    if (this.totalProcurements === 0) {
      return 'No procurement activity is currently available.';
    }

    return `${this.pendingProcurements} procurement requests are currently pending.`;
  }

  // =========================================================
  // PURCHASE ORDER SUMMARY
  // =========================================================

  getPurchaseOrderSummary(): string {

    if (this.totalPurchaseOrders === 0) {
      return 'No purchase order activity is currently available.';
    }

    return `${this.pendingOrders} of ${this.totalPurchaseOrders} purchase orders are currently pending.`;
  }

  // =========================================================
  // REFRESH
  // =========================================================

  refreshAnalytics(): void {
    this.loadAnalytics();
  }
}