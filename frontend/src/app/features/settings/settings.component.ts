import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head flex flex-col justify-start pb-4">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">System Settings & Management</h1>
      <p class="text-slate-500 font-medium mt-1">Deep operational overview of platform configurations, access controls, and performance telemetry.</p>
    </div>
    
    <!-- Top Configuration Row -->
    <div class="grid lg:grid-cols-2 gap-6 mt-6">
        
       <!-- Admin Account -->
       <div class="card rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div class="card-head px-6 py-4 border-b bg-slate-50/50">
             <h3 class="font-bold text-slate-800">Admin Account Security</h3>
          </div>
          <div class="card-body p-6 flex-grow">
             <div *ngIf="successMsg" class="bg-green-50 text-green-700 p-3 rounded text-sm mb-4 border border-green-100">{{ successMsg }}</div>
             <div *ngIf="errMsg" class="bg-red-50 text-red-700 p-3 rounded text-sm mb-4 border border-red-100">{{ errMsg }}</div>

             <form (ngSubmit)="saveSettings()" class="space-y-4 text-sm">
                <div>
                   <label class="block font-semibold text-slate-600 mb-1">Current Password (Required)</label>
                   <input type="password" [(ngModel)]="model.current_password" name="current_password" required
                          class="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" />
                </div>
                <div>
                   <label class="block font-semibold text-slate-600 mb-1">New Email (Optional)</label>
                   <input type="email" [(ngModel)]="model.new_email" name="new_email"
                          class="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" />
                </div>
                <div>
                   <label class="block font-semibold text-slate-600 mb-1">New Password (Optional)</label>
                   <input type="password" [(ngModel)]="model.new_password" name="new_password"
                          class="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm" />
                </div>
                <div class="pt-2">
                   <button type="submit" [disabled]="!model.current_password"
                           class="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition">
                      Update Security Settings
                   </button>
                </div>
             </form>
          </div>
       </div>

       <!-- System Health & Usage Details -->
       <div class="card rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div class="card-head px-6 py-4 border-b bg-slate-50/50">
             <h3 class="font-bold text-slate-800">Operational System Health</h3>
          </div>
          <div class="card-body p-6 flex-grow space-y-5">
             <div>
                <div class="flex justify-between items-center mb-1">
                   <span class="text-sm font-semibold text-slate-700">Network / API Uptime</span>
                   <span class="text-sm font-bold text-green-600">{{dashboardData?.system_health?.server_uptime || '99.9%'}}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full" style="width: 99.9%"></div></div>
             </div>
             <div>
                <div class="flex justify-between items-center mb-1">
                   <span class="text-sm font-semibold text-slate-700">Storage Utilization</span>
                   <span class="text-sm font-bold text-slate-800">{{dashboardData?.system_health?.storage_used || '45%'}}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width: 45%"></div></div>
             </div>
             
             <div class="grid grid-cols-2 gap-4 mt-6">
                <div class="border rounded-lg bg-slate-50 p-4 text-center">
                   <div class="text-xs text-slate-500 font-bold mb-1">Avg Request Latency</div>
                   <div class="text-xl font-extrabold text-slate-800">{{dashboardData?.system_health?.api_response || '120 ms'}}</div>
                </div>
                <div class="border rounded-lg bg-slate-50 p-4 text-center">
                   <div class="text-xs text-slate-500 font-bold mb-1">Concurrent Sessions</div>
                   <div class="text-xl font-extrabold text-indigo-600">{{dashboardData?.system_health?.active_sessions || 24}}</div>
                </div>
                <div class="border rounded-lg bg-slate-50 p-4 text-center">
                   <div class="text-xs text-slate-500 font-bold mb-1">Database Queries</div>
                   <div class="text-xl font-extrabold text-slate-800">4,192 /hr</div>
                </div>
                <div class="border rounded-lg bg-slate-50 p-4 text-center">
                   <div class="text-xs text-slate-500 font-bold mb-1">Redis Cache Hit</div>
                   <div class="text-xl font-extrabold text-green-600">92.4%</div>
                </div>
             </div>
          </div>
       </div>
    </div>
    
    <div class="grid lg:grid-cols-3 gap-6 mt-6">
       <!-- Roles & Permissions -->
       <div class="card lg:col-span-1 border border-slate-100 rounded-xl">
          <div class="card-head px-6 py-4 border-b bg-slate-50/50">
             <h3 class="font-bold text-slate-800">Role & Permission Policy</h3>
          </div>
          <div class="card-body p-0">
             <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
                   <tr>
                      <th class="px-6 py-3">Security Role</th>
                      <th class="px-6 py-3 text-right">Access Level</th>
                   </tr>
                </thead>
                <tbody>
                   <tr class="border-b hover:bg-slate-50">
                      <td class="px-6 py-3 font-semibold text-slate-800">Administrator</td>
                      <td class="px-6 py-3 text-right"><span class="badge slate">Global</span></td>
                   </tr>
                   <tr class="border-b hover:bg-slate-50">
                      <td class="px-6 py-3 font-semibold text-slate-800">Procurement Manager</td>
                      <td class="px-6 py-3 text-right"><span class="badge blue">Tier 2</span></td>
                   </tr>
                   <tr class="border-b hover:bg-slate-50">
                      <td class="px-6 py-3 font-semibold text-slate-800">Supply Chain Manager</td>
                      <td class="px-6 py-3 text-right"><span class="badge amber">Tier 3</span></td>
                   </tr>
                   <tr class="border-b hover:bg-slate-50">
                      <td class="px-6 py-3 font-semibold text-slate-800">Finance Officer</td>
                      <td class="px-6 py-3 text-right"><span class="badge green">Financial</span></td>
                   </tr>
                   <tr class="border-b hover:bg-slate-50">
                      <td class="px-6 py-3 font-semibold text-slate-800">Auditor</td>
                      <td class="px-6 py-3 text-right"><span class="badge teal">Read-Only</span></td>
                   </tr>
                   <tr class="hover:bg-slate-50">
                      <td class="px-6 py-3 font-semibold text-slate-800">Vendor</td>
                      <td class="px-6 py-3 text-right"><span class="badge red">Restricted</span></td>
                   </tr>
                </tbody>
             </table>
          </div>
       </div>

       <!-- System Activity Log Detail -->
       <div class="card lg:col-span-2 border border-slate-100 rounded-xl mb-12">
          <div class="card-head px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
             <h3 class="font-bold text-slate-800">Detailed System Activity Log</h3>
             <span class="text-xs text-indigo-600 font-bold uppercase tracking-wider cursor-pointer">Export CSV</span>
          </div>
          <div class="card-body p-0 overflow-x-auto h-[350px] overflow-y-auto">
             <table class="w-full text-left text-sm whitespace-nowrap" *ngIf="auditLogs.length > 0; else noLogs">
                <thead class="bg-white border-b-2 text-slate-400 uppercase text-xs font-bold tracking-wider sticky top-0">
                   <tr>
                      <th class="px-6 py-3">Timestamp</th>
                      <th class="px-6 py-3">User Email</th>
                      <th class="px-6 py-3">Action</th>
                      <th class="px-6 py-3">Entity</th>
                   </tr>
                </thead>
                <tbody>
                   <tr *ngFor="let log of auditLogs" class="border-b last:border-0 hover:bg-slate-50">
                      <td class="px-6 py-4 text-slate-500 font-mono text-xs">{{log.timestamp | date:'short'}}</td>
                      <td class="px-6 py-4 font-semibold text-slate-700">{{log.user?.email || 'System'}}</td>
                      <td class="px-6 py-4">
                         <span class="bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-xs">
                           {{log.action}}
                         </span>
                      </td>
                      <td class="px-6 py-4 text-slate-500">{{log.entity_type}} #{{log.entity_id}}</td>
                   </tr>
                </tbody>
             </table>
             <ng-template #noLogs><div class="p-8 text-center text-slate-400 font-medium h-full">No system logs available.</div></ng-template>
          </div>
       </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  model = {
    current_password: '',
    new_email: '',
    new_password: ''
  };

  successMsg = '';
  errMsg = '';
  dashboardData: any = null;
  auditLogs: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.http.get(`${environment.apiBaseUrl}/analytics/dashboard-summary`).subscribe(res => {
      this.dashboardData = res;
    });

    this.http.get<any[]>(`${environment.apiBaseUrl}/audit/logs`).subscribe(res => {
      this.auditLogs = res || [];
    });
  }

  saveSettings() {
    this.successMsg = '';
    this.errMsg = '';

    const payload: any = {
      current_password: this.model.current_password
    };
    if (this.model.new_email) payload.new_email = this.model.new_email;
    if (this.model.new_password) payload.new_password = this.model.new_password;

    this.http.put(`${environment.apiBaseUrl}/auth/settings`, payload).subscribe({
      next: (res: any) => {
        this.successMsg = res.message || 'Security parameters fully updated.';
        this.model.current_password = '';
        this.model.new_password = '';
      },
      error: (err) => {
        this.errMsg = err.error?.detail || 'Failed to authenticate update vector.';
      }
    });
  }
}
