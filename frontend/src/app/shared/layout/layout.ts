import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../core/auth.service';

interface NavItem { label: string; route: string; icon: string; }

@Component({
  selector: 'app-layout', standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule],
  templateUrl: './layout.html', styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit {
  sidenavOpened = signal(true);
  isMobile = signal(false);

  adminNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Profile', route: '/profile', icon: 'person' },
    { label: 'Users', route: '/users', icon: 'group' },
    { label: 'Vendors', route: '/vendors', icon: 'store' },
    { label: 'Procurement', route: '/procurement', icon: 'inventory_2' },
    { label: 'Purchase Orders', route: '/purchase-orders', icon: 'shopping_cart' },
    { label: 'Contracts', route: '/contracts', icon: 'description' },
    { label: 'Performance', route: '/performance', icon: 'trending_up' },
    { label: 'Analytics', route: '/analytics', icon: 'analytics' },
    { label: 'Reports', route: '/reports', icon: 'assessment' },
    { label: 'Reliability', route: '/reliability', icon: 'verified' },
    { label: 'Communication', route: '/communication', icon: 'forum' },
    { label: 'Invoices', route: '/invoices', icon: 'receipt_long' },
    { label: 'Compliance', route: '/compliance', icon: 'verified_user' },
    { label: 'Notifications', route: '/notifications', icon: 'notifications' }
  ];

  vendorNavItems: NavItem[] = [
    { label: 'Vendor Dashboard', route: '/vendor-dashboard', icon: 'dashboard' },
    { label: 'My Profile', route: '/vendor-profile', icon: 'person' },
    { label: 'My Orders', route: '/vendor-orders', icon: 'shopping_cart' },
    { label: 'My Contracts', route: '/vendor-contracts', icon: 'description' },
    { label: 'My Performance', route: '/vendor-performance', icon: 'trending_up' },
    { label: 'Reliability', route: '/reliability', icon: 'verified' },
    { label: 'Communication', route: '/communication', icon: 'forum' },
    { label: 'Invoices', route: '/invoices', icon: 'receipt_long' },
    { label: 'Compliance', route: '/compliance', icon: 'verified_user' },
    { label: 'Notifications', route: '/notifications', icon: 'notifications' }
  ];

  constructor(public auth: AuthService, private router: Router, private breakpoint: BreakpointObserver) {}

  ngOnInit(): void {
    this.breakpoint.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe(result => {
      this.isMobile.set(result.matches);
      this.sidenavOpened.set(!result.matches);
    });
    if (this.auth.isLoggedIn() && !this.auth.currentUser()) {
      this.auth.loadProfile().subscribe({ error: () => this.auth.logout() });
    }
  }

  get navItems(): NavItem[] {
    return this.auth.currentUser()?.role === 'Vendor' ? this.vendorNavItems : this.adminNavItems;
  }

  get roleLabel(): string {
    const role = this.auth.currentUser()?.role;
    switch (role) {
      case 'Administrator': case 'Admin': case 'admin': return 'Administrator';
      case 'Procurement Manager': case 'procurement_manager': return 'Procurement Manager';
      case 'Supply Chain Manager': case 'supply_chain_manager': return 'Supply Chain Manager';
      case 'Vendor': case 'vendor': return 'Vendor';
      case 'Finance Officer': case 'finance_officer': return 'Finance Officer';
      case 'Auditor': case 'auditor': return 'Auditor';
      default: return 'User';
    }
  }

  get pageTitle(): string {
    const url = this.router.url;
    const titles: Record<string, string> = {
      'vendor-dashboard': 'Vendor Dashboard', 'vendor-profile': 'My Profile', 'vendor-orders': 'My Orders',
      'vendor-contracts': 'My Contracts', 'vendor-performance': 'My Performance', 'users':'User Management', 'vendors': 'Vendor Management',
      'procurement': 'Procurement', 'purchase-orders': 'Purchase Orders', 'contracts': 'Contracts',
      'performance': 'Performance', 'analytics': 'Analytics', 'reports': 'Reports', 'notifications': 'Notifications', 'communication':'Communication', 'compliance':'Contracts & Compliance', 'invoices':'Invoice Management', 'profile':'Profile Management', 'reliability':'Vendor Reliability'
    };
    const match = Object.keys(titles).find(key => url.includes(key));
    return match ? titles[match] : 'Dashboard';
  }

  toggleSidenav(): void { this.sidenavOpened.update(v => !v); }
  logout(): void { this.auth.logout(); }
}
