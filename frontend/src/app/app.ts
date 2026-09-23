import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor, NgIf, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  dashboard: any = {};
  risk: any = {};
  procurement: any = {};
  vendors: any[] = [];
  notifications: any[] = [];

  get isVendorPage(): boolean {
  return this.router.url.startsWith('/vendors');
}

get isPurchaseOrderPage(): boolean {
  return this.router.url === '/purchase-orders';
}

get isContractsPage(): boolean {
  return this.router.url === '/contracts';
}

get isCommunicationsPage(): boolean {
  return this.router.url === '/communications';
}

get isVendorPerformancePage(): boolean {
  return this.router.url === '/vendor-performance';
}

get isRiskAnalysisPage(): boolean {
  return this.router.url === '/risk-analysis';
}

get isProcurementAnalyticsPage(): boolean {
  return this.router.url === '/procurement-analytics';
}

get isNotificationsPage(): boolean {
  return this.router.url === '/notifications';
}

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {

    console.log('CURRENT ROUTE:', this.router.url);

    this.api.getDashboardSummary().subscribe((data: any) => {
      console.log("DASHBOARD DATA:", data);
      this.dashboard = data;
    });

    this.api.getRiskSummary().subscribe(data => {
      this.risk = data;
    });

    this.api.getProcurementAnalytics().subscribe(data => {
      this.procurement = data;
    });

    this.api.getVendors().subscribe((data: any) => {
      console.log("VENDORS DATA:", data);
      console.log("FIRST VENDOR:", data.vendors[0]);
      this.vendors = data.vendors || [];
    });

    this.api.getNotifications().subscribe((data: any) => {
      this.notifications = data.notifications || [];
    });

  }
}