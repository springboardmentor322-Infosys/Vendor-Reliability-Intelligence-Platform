import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { roles, pages } from './dashboard-data';
import { Subscription } from 'rxjs';

import { VendorDirectoryComponent } from './components/vendor-directory/vendor-directory.component';
import { PrDashboardComponent } from './components/pr-dashboard/pr-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { PmDashboardComponent } from './components/pm-dashboard/pm-dashboard.component';
import { ScmDashboardComponent } from './components/scm-dashboard/scm-dashboard.component';
import { FinanceDashboardComponent } from './components/finance-dashboard/finance-dashboard.component';
import { VendorDashboardComponent } from './components/vendor-dashboard/vendor-dashboard.component';
import { AuditorDashboardComponent } from './components/auditor-dashboard/auditor-dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    VendorDirectoryComponent, 
    PrDashboardComponent,
    AdminDashboardComponent,
    PmDashboardComponent,
    ScmDashboardComponent,
    FinanceDashboardComponent,
    VendorDashboardComponent,
    AuditorDashboardComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  userEmail = '';
  currentRoleKey = '';
  roleConfig: any = null;
  currentPage = 'dashboard';
  pageContent: SafeHtml = '';
  authSub?: Subscription;
  dashboardData: any = null;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private sanitizer: DomSanitizer,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.authSub = this.authService.currentUser$.subscribe((user: any) => {
      if (user) {
        this.userEmail = user.email;
        
        const roleMap: Record<string, string> = {
          'Administrator': 'admin',
          'Procurement Manager': 'pm',
          'Supply Chain Manager': 'scm',
          'Finance Officer': 'finance',
          'Auditor': 'auditor',
          'Vendor': 'vendor'
        };
        
        const rawRoleName = user.role?.name || 'Administrator';
        this.currentRoleKey = roleMap[rawRoleName] || 'admin';
        
        this.roleConfig = (roles as any)[this.currentRoleKey] || (roles as any)['admin'];
        this.loadDashboardData();
        this.renderPage();
      }
    });
  }

  loadDashboardData() {
    this.dashboardService.getDashboardSummary().subscribe(data => {
      this.dashboardData = data;
    });
  }
  
  ngOnDestroy() {
    if (this.authSub) this.authSub.unsubscribe();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goTo(pageId: string) {
    if (pageId.includes('contracts')) {
      this.router.navigate(['/contracts']);
      return;
    }
    if (pageId.includes('communication')) {
      this.router.navigate(['/communications']);
      return;
    }
    this.currentPage = pageId;
    this.renderPage();
  }

  getPageLabel(id: string): string {
    if (!this.roleConfig) return id;
    for (const g of this.roleConfig.groups) {
      for (const it of g.items) {
        if (it.id === id) return it.label;
      }
    }
    return id;
  }

  renderPage() {
    if (!this.roleConfig) return;
    
    // Inject global state for the renderer functions
    (window as any).currentRole = this.currentRoleKey;
    (window as any).currentPage = this.currentPage;

    const fn = pages[this.currentPage] || pages['dashboard'];
    if (fn) {
      const htmlStr = fn();
      this.pageContent = this.sanitizer.bypassSecurityTrustHtml(htmlStr);
    }
  }
}
