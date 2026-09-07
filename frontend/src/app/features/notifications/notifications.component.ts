import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head flex flex-col justify-start pb-4">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Notification Center</h1>
      <p class="text-slate-500 font-medium mt-1">Review active system alerts, contract expirations, and procurement workflow events.</p>
    </div>
    
    <div class="card mt-6 border border-slate-100 rounded-xl mb-12">
      <div class="card-head px-6 py-5 border-b bg-slate-50/50 flex justify-between items-center">
        <h3 class="font-bold text-slate-800 text-lg">System Alerts & Workflows</h3>
        <div class="flex space-x-2">
            <button class="text-xs font-bold px-3 py-1.5 rounded" [ngClass]="filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'" (click)="filter = 'all'">All</button>
            <button class="text-xs font-bold px-3 py-1.5 rounded" [ngClass]="filter === 'unread' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'" (click)="filter = 'unread'">Unread Only</button>
        </div>
      </div>
      <div class="card-body p-0 overflow-x-auto" *ngIf="!loading">
        <table class="w-full text-left text-sm whitespace-nowrap" *ngIf="filteredNotifications.length > 0; else noNotifs">
          <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
             <tr>
               <th class="px-6 py-3 w-10">Status</th>
               <th class="px-6 py-3">Alert Message</th>
               <th class="px-6 py-3">Priority / Severity</th>
               <th class="px-6 py-3">Timestamp</th>
               <th class="px-6 py-3 text-right">Actions</th>
             </tr>
          </thead>
          <tbody>
             <tr *ngFor="let notif of filteredNotifications" class="border-b last:border-0 hover:bg-slate-50 transition" [ngClass]="notif.is_read ? 'opacity-70' : 'bg-amber-50/20'">
               <td class="px-6 py-4">
                  <div class="w-2.5 h-2.5 rounded-full" [ngClass]="notif.is_read ? 'bg-slate-300' : 'bg-amber-500'"></div>
               </td>
               <td class="px-6 py-4 font-semibold text-slate-800">{{ notif.message }}</td>
               <td class="px-6 py-4">
                 <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border" 
                       [ngClass]="notif.is_read ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-red-50 text-red-600 border-red-100'">
                    {{notif.is_read ? 'Normal' : 'High Priority'}}
                 </span>
               </td>
               <td class="px-6 py-4 text-slate-500 font-mono text-xs">{{ notif.created_at | date:'medium' }}</td>
               <td class="px-6 py-4 text-right">
                  <button class="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded text-xs shadow-sm hover:bg-indigo-100 transition" 
                          *ngIf="!notif.is_read" (click)="markRead(notif.id)">
                     Mark Read
                  </button>
                  <span class="text-xs text-slate-400 font-bold px-3 py-1.5" *ngIf="notif.is_read">Acknowledged</span>
               </td>
             </tr>
          </tbody>
        </table>
        <ng-template #noNotifs><div class="p-8 text-center text-slate-400 font-medium">No notifications matching criteria.</div></ng-template>
      </div>
      <div class="card-body p-8 text-center text-slate-400 font-medium" *ngIf="loading">
        Connecting to alert stream...
      </div>
    </div>

    <!-- Dashboard Quick Notifications Feed (As specified) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" *ngIf="vendorAnalytics?.notifications">
        <div class="card flex flex-col h-[320px]">
          <div class="card-head px-6 py-5 border-b bg-slate-50/50">
            <h3 class="font-bold text-slate-800 text-lg">Dashboard Notifications Overview</h3>
          </div>
          <div class="card-body overflow-y-auto p-6">
             <div class="space-y-4">
                <div *ngFor="let notif of vendorAnalytics.notifications" class="flex justify-between items-start gap-4 pb-4 border-b border-gray-50 last:border-0">
                   <div class="flex gap-3 items-start">
                     <div class="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center flex-none mt-0.5">
                       <svg class="w-4 h-4 {{notif.icon_color}}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg>
                     </div>
                     <div class="text-sm font-medium text-gray-700 leading-snug">{{notif.title}}</div>
                   </div>
                   <div class="text-[11px] font-bold text-slate-400 whitespace-nowrap pt-1 bg-slate-50 px-2 py-1 rounded">{{notif.time}}</div>
                </div>
             </div>
          </div>
        </div>
    </div>

    <!-- SCM Dashboard Injected Alerts -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6" *ngIf="dashboardMetrics">
      
      <!-- Contract Expiry Alerts -->
      <div class="bg-white shadow-sm border border-red-100 rounded-xl flex flex-col">
          <div class="flex justify-between items-center p-5 border-b border-red-50 bg-red-50/20">
            <h3 class="font-bold text-red-800 flex items-center gap-2">
               <span class="text-xl">⚠️</span> Contract Expiry Alerts
            </h3>
            <span class="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">Compliance</span>
          </div>
          <div class="overflow-x-auto flex-1 p-0">
            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead class="bg-white text-gray-400 uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th class="px-5 py-3">Contract / Vendor</th>
                  <th class="px-5 py-3">Expiry Matrix</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr *ngFor="let alert of dashboardMetrics?.contract_alerts" class="hover:bg-red-50/50 transition">
                  <td class="px-5 py-3">
                     <div class="font-bold text-gray-800 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        {{alert.contract_title}}
                     </div>
                     <div class="text-gray-500 mt-1 pl-4">{{alert.vendor}}</div>
                  </td>
                  <td class="px-5 py-3">
                     <span class="px-2 py-1 bg-red-100 text-red-600 rounded font-bold border border-red-200">
                        {{alert.days_to_expiry}} Days Remaining
                     </span>
                  </td>
                </tr>
                <tr *ngIf="!dashboardMetrics?.contract_alerts?.length">
                  <td colspan="2" class="p-8 text-center text-gray-500">No imminent expirations.</td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
      
      <!-- Upcoming Deliveries -->
      <div class="bg-white shadow-sm border border-emerald-100 rounded-xl flex flex-col">
        <div class="flex justify-between items-center p-5 border-b border-emerald-50 bg-emerald-50/20">
          <h3 class="font-bold text-emerald-800 flex items-center gap-2">
              <span class="text-xl">🚚</span> Upcoming Deliveries
          </h3>
          <span class="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Logistics</span>
        </div>
        <div class="overflow-x-auto flex-1 p-0">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead class="bg-white text-gray-400 uppercase font-semibold border-b border-gray-100">
              <tr>
                <th class="px-5 py-3">PO Number</th>
                <th class="px-5 py-3">T-Minus (Days)</th>
                <th class="px-5 py-3">Risk/Delay</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr *ngFor="let uv of dashboardMetrics?.upcoming_deliveries" class="hover:bg-emerald-50/50 transition">
                <td class="px-5 py-3 font-bold text-indigo-700">{{uv.po_number}}</td>
                <td class="px-5 py-3 text-gray-800 font-semibold">{{uv.days_remaining}} Days</td>
                <td class="px-5 py-3">
                    <span class="px-2 py-0.5 rounded text-white" [ngClass]="uv.days_remaining < 0 ? 'bg-red-500' : (uv.days_remaining <= 3 ? 'bg-amber-500' : 'bg-emerald-500')">
                        {{uv.days_remaining < 0 ? 'Overdue' : (uv.days_remaining <= 3 ? 'High' : 'Normal')}}
                    </span>
                </td>
              </tr>
              <tr *ngIf="!dashboardMetrics?.upcoming_deliveries?.length">
                <td colspan="3" class="p-8 text-center text-gray-500">No scheduled upcoming deliveries.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  filter: 'all' | 'unread' = 'all';
  vendorAnalytics: any = null;
  dashboardMetrics: any = null;

  constructor(private http: HttpClient, private auth: AuthService, private dashboardService: DashboardService) { }

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/notifications/`).subscribe({
      next: (data) => {
        this.notifications = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });

    this.auth.currentUser$.subscribe(u => {
      if (u && (u.role?.name === 'Vendor' || u.role_name === 'Vendor')) {
        this.dashboardService.getRoleDashboard('vendor').subscribe(data => {
          this.vendorAnalytics = data.analytics || data;
        });
      } else {
        let activeRole = 'summary';
        const roleName = localStorage.getItem('role');
        if (roleName === 'Supply Chain Manager') activeRole = 'scm';
        else if (roleName === 'Procurement Manager') activeRole = 'pm';


        const activeAPI = ['scm', 'pm'].includes(activeRole) ? `analytics/dashboard/${activeRole}` : (roleName === 'Auditor' || u.role_name === 'Auditor' ? 'analytics/dashboard/auditor' : 'analytics/dashboard-summary');

        this.http.get<any>(`${environment.apiBaseUrl}/${activeAPI}`).subscribe(res => {
          this.dashboardMetrics = res;
        });
      }
    });
  }

  get filteredNotifications() {
    if (this.filter === 'unread') return this.notifications.filter(n => !n.is_read);
    return this.notifications;
  }

  markRead(id: number) {
    this.http.patch(`${environment.apiBaseUrl}/notifications/${id}/read`, {}).subscribe(() => {
      this.ngOnInit();
    });
  }
}
