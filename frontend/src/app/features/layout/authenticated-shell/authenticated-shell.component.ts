import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { roles } from '../../dashboard/dashboard-data';

@Component({
    selector: 'app-authenticated-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    templateUrl: './authenticated-shell.component.html'
})
export class AuthenticatedShellComponent implements OnInit, OnDestroy {
    userEmail = '';
    currentRoleKey = '';
    roleConfig: any = null;
    currentPage = 'dashboard';
    authSub?: Subscription;

    constructor(
        private authService: AuthService,
        private router: Router
    ) {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.updateCurrentPageFromUrl(event.urlAfterRedirects);
        });
    }

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

                const rawRoleName = user.role?.name || user.role_name || null;
                if (!rawRoleName) {
                    console.error('Role cannot be resolved for user:', user);
                    this.logout();
                    return;
                }

                this.currentRoleKey = roleMap[rawRoleName];
                if (!this.currentRoleKey) {
                    console.error('Unrecognized role mapped:', rawRoleName);
                    this.logout();
                    return;
                }

                this.roleConfig = (roles as any)[this.currentRoleKey];
            }
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
        this.currentPage = pageId;

        // Try to find the item in the roleConfig to see if it has a direct route defined
        if (this.roleConfig) {
            for (const group of this.roleConfig.groups) {
                const item = group.items.find((i: any) => i.id === pageId);
                if (item && item.route) {
                    this.router.navigate([item.route]);
                    return;
                }
            }
        }

        // Exact matches mapping page IDs to appropriate Angular Routes
        if (pageId === 'dashboard') {
            this.router.navigate(['/dashboard']);
        } else if (pageId === 'contracts' || pageId === 'pm_contracts' || pageId === 'vendor_contracts' || pageId === 'scm_contracts') {
            this.router.navigate(['/contracts']);
        } else if (pageId === 'communication' || pageId === 'pm_communication' || pageId === 'vendor_communication' || pageId === 'scm_communications') {
            this.router.navigate(['/communications']);
        } else if (pageId === 'invoices' || pageId === 'pm_invoices' || pageId === 'vendor_invoices') {
            this.router.navigate(['/invoices']);
        } else if (pageId === 'reports' || pageId === 'pm_reports_proc' || pageId === 'vendor_reports_perf' || pageId === 'scm_reports_perf' || pageId === 'scm_reports_delivery' || pageId === 'scm_reports_analytics') {
            if (pageId === 'scm_reports_perf') this.router.navigate(['/reports'], { queryParams: { type: 'performance' } });
            else if (pageId === 'scm_reports_delivery') this.router.navigate(['/reports'], { queryParams: { type: 'delivery' } });
            else if (pageId === 'scm_reports_analytics') this.router.navigate(['/reports'], { queryParams: { type: 'analytics' } });
            else if (pageId === 'vendor_reports_perf') this.router.navigate(['/reports'], { queryParams: { type: 'performance' } });
            else this.router.navigate(['/reports']);
        } else if (pageId === 'pm_reports_spend') {
            this.router.navigate(['/spend-analysis']);
        } else if (pageId === 'pm_reports_export' || pageId === 'vendor_reports_export' || pageId === 'scm_reports_export') {
            this.router.navigate(['/exports']);
        } else if (pageId === 'users' || pageId === 'admin_users') {
            this.router.navigate(['/users']);
        } else if (pageId === 'audit') {
            this.router.navigate(['/audit']);
        } else if (pageId === 'pos' || pageId === 'pm_pos' || pageId === 'vendor_pos' || pageId === 'scm_pos') {
            this.router.navigate(['/pos']);
        } else if (pageId === 'prs' || pageId === 'pm_requests') {
            this.router.navigate(['/prs']);
        } else if (pageId === 'vendors' || pageId === 'pm_vendors' || pageId === 'scm_vendors') {
            this.router.navigate(['/vendors']);
        } else if (pageId === 'notifications' || pageId === 'pm_notifications' || pageId === 'vendor_notifications' || pageId === 'scm_notifications') {
            this.router.navigate(['/notifications']);
        } else if (pageId === 'performance' || pageId === 'vendor_performance') {
            this.router.navigate(['/performance']);
        } else if (pageId === 'settings' || pageId === 'vendor_settings' || pageId === 'scm_settings') {
            this.router.navigate(['/settings']);
        } else if (pageId === 'roles-permissions' || pageId === 'roles') {
            this.router.navigate(['/roles']);
        } else if (pageId === 'system-logs' || pageId === 'system_logs') {
            this.router.navigate(['/system-logs']);
        } else if (pageId === 'vendor_profile' || pageId === 'profile') {
            this.router.navigate(['/profile']);
        } else if (pageId === 'vendor_documents' || pageId === 'documents') {
            this.router.navigate(['/documents']);
        } else if (pageId === 'payhistory') {
            this.router.navigate(['/payhistory']);
        } else if (pageId === 'vendor_support' || pageId === 'support' || pageId === 'scm_support') {
            this.router.navigate(['/support']);
        } else if (pageId === 'compliance') {
            this.router.navigate(['/compliance']);
        } else if (pageId === 'reliability') {
            this.router.navigate(['/reliability']);
        } else if (pageId === 'delivery') {
            this.router.navigate(['/delivery']);
        } else if (pageId === 'risk') {
            this.router.navigate(['/risk']);
        } else if (pageId === 'user-management') {
            this.router.navigate(['/users']);
        } else if (pageId === 'system-settings') {
            this.router.navigate(['/settings']);
        } else if (pageId === 'reports-analytics') {
            this.router.navigate(['/reports']);
        } else if (pageId === 'budget-spend') {
            this.router.navigate(['/spend-analysis']);
        } else if (pageId === 'scm_order_tracking' || pageId === 'order-tracking') {
            this.router.navigate(['/delivery']);
        } else if (pageId === 'scm_vendor_performance' || pageId === 'vendor-performance') {
            this.router.navigate(['/performance']);
        } else if (pageId === 'scm_reliability_risk') {
            this.router.navigate(['/reliability']);
        } else if (pageId === 'procurement-requests' || pageId === 'prs') {
            this.router.navigate(['/prs']);
        } else if (pageId === 'procurement' || pageId === 'vendor_pos') {
            this.router.navigate(['/pos']);
        } else if (pageId === 'vendor_performance') {
            this.router.navigate(['/performance']);
        } else if (pageId === 'vendor_contracts') {
            this.router.navigate(['/contracts']);
        } else if (pageId === 'vendor_documents') {
            this.router.navigate(['/documents']);
        } else if (pageId === 'vendor_profile') {
            this.router.navigate(['/profile']);
        } else if (pageId === 'vendor_invoices') {
            this.router.navigate(['/invoices']);
        } else if (pageId === 'vendor_settings') {
            this.router.navigate(['/settings']);
        } else if (pageId === 'vendor_support') {
            this.router.navigate(['/support']);
        } else if (pageId === 'vendor_reports_perf') {
            this.router.navigate(['/reports'], { queryParams: { type: 'performance' } });
        } else if (pageId === 'vendor_reports_order') {
            this.router.navigate(['/reports'], { queryParams: { type: 'order' } });
        } else if (pageId === 'vendor_reports_comp') {
            this.router.navigate(['/reports'], { queryParams: { type: 'compliance' } });
        } else if (pageId === 'vendor_reports_export') {
            this.router.navigate(['/exports']);
        } else if (pageId.startsWith('vendor_reports')) {
            this.router.navigate(['/reports']);
        } else if (pageId === 'scm_contracts') {
            this.router.navigate(['/contracts']);
        } else if (pageId === 'scm_communications') {
            this.router.navigate(['/communications']);
        } else if (pageId === 'scm_reports_perf') {
            this.router.navigate(['/reports'], { queryParams: { type: 'performance' } });
        } else if (pageId === 'scm_reports_delivery') {
            this.router.navigate(['/reports'], { queryParams: { type: 'order' } });
        } else if (pageId === 'scm_reports_analytics') {
            this.router.navigate(['/reports'], { queryParams: { type: 'compliance' } });
        } else if (pageId === 'scm_reports_export') {
            this.router.navigate(['/exports']);
        } else if (pageId === 'procurement') {
            this.router.navigate(['/procurement']);
        } else {
            console.warn(`Unmapped route gracefully recovering to dashboard: ${pageId}`);
            this.router.navigate(['/dashboard']);
        }
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

    private updateCurrentPageFromUrl(url: string) {
        // Dynamic sync for finance routes which match their IDs exactly 
        if (url.startsWith('/finance-')) {
            this.currentPage = url.substring(1);
            return;
        }

        // Fix for specific exact paths prioritizing them over broad `.includes()`
        if (url === '/spend-analysis') {
            this.currentPage = 'budget-spend';
        } else if (url === '/exports') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_reports_export' : 'pm_reports_export';
        } else if (url === '/contracts') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_contracts' : this.currentRoleKey === 'scm' ? 'scm_contracts' : 'contracts';
        } else if (url === '/communications') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_communication' : this.currentRoleKey === 'scm' ? 'scm_communications' : 'communications';
        } else if (url === '/dashboard' || url === '/' || url === '/dashboard/auditor') {
            this.currentPage = 'dashboard';
        } else if (url === '/settings') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_settings' : 'system-settings';
        } else if (url === '/invoices') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_invoices' : 'invoices';
        } else if (url === '/pos') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_pos' : 'pos';
        } else if (url === '/prs') {
            this.currentPage = 'prs';
        } else if (url === '/vendors') {
            this.currentPage = 'vendors';
        } else if (url === '/notifications') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_notifications' : 'notifications';
        } else if (url === '/reports') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_reports_perf' : this.currentRoleKey === 'scm' ? 'scm_reports_perf' : 'reports-analytics';
        } else if (url === '/performance') {
            this.currentPage = this.currentRoleKey === 'vendor' ? 'vendor_performance' : 'vendor-performance';
        } else if (url === '/compliance') {
            this.currentPage = 'compliance';
        } else if (url === '/roles') {
            this.currentPage = 'roles';
        } else if (url === '/system-logs') {
            this.currentPage = 'system_logs';
        } else if (url === '/profile') {
            this.currentPage = 'vendor_profile';
        } else if (url === '/documents') {
            this.currentPage = 'vendor_documents';
        } else if (url === '/payhistory') {
            this.currentPage = 'payhistory';
        } else if (url === '/support') {
            this.currentPage = 'vendor_support';
        } else if (url === '/reliability') {
            this.currentPage = 'reliability';
        } else if (url === '/delivery') {
            this.currentPage = 'order-tracking';
        } else if (url === '/risk') {
            this.currentPage = 'risk';
        } else if (url === '/users') {
            this.currentPage = 'user-management';
        }
    }
}
