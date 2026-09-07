import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="page-head pb-4 border-b border-gray-200">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
        <p class="text-sm text-gray-500 mt-1">Manage platform users, roles, and access.</p>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
       <div class="bg-white p-5 shadow-sm border border-gray-100 rounded-xl flex items-center">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex justify-center items-center text-xl text-blue-600 mr-4">👥</div>
          <div><div class="text-xs font-semibold text-gray-500 uppercase">Total Users</div><div class="text-2xl font-bold">{{users.length}}</div></div>
       </div>
       <div class="bg-white p-5 shadow-sm border border-gray-100 rounded-xl flex items-center">
          <div class="w-12 h-12 bg-emerald-100 rounded-full flex justify-center items-center text-xl text-emerald-600 mr-4">🟢</div>
          <div><div class="text-xs font-semibold text-gray-500 uppercase">Active Users</div><div class="text-2xl font-bold">{{activeUsers}}</div></div>
       </div>
       <div class="bg-white p-5 shadow-sm border border-gray-100 rounded-xl flex flex-col justify-center items-center" *ngIf="rolesChart">
          <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Role Distribution</div>
          <apx-chart
            [series]="rolesChart.series"
            [chart]="rolesChart.chart"
            [labels]="rolesChart.labels"
            [colors]="rolesChart.colors"
            [dataLabels]="{enabled:false}"
            [stroke]="{width: 0}"
            [legend]="{show:false}">
          </apx-chart>
       </div>
    </div>

    <div class="card mt-6 border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
      <div class="card-head p-5 border-b border-gray-100">
        <h3 class="font-bold text-gray-800">System Users List</h3>
      </div>
      <div class="card-body overflow-x-auto p-0">
        <table class="w-full text-left text-sm" *ngIf="users.length > 0; else noData">
          <thead class="bg-slate-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th class="px-5 py-3 border-b">Email</th>
              <th class="px-5 py-3 border-b">Role</th>
              <th class="px-5 py-3 border-b">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let u of users" class="hover:bg-gray-50 transition-colors">
              <td class="px-5 py-4 font-medium text-gray-700">{{ u.email }}</td>
              <td class="px-5 py-4 text-gray-600 font-medium">{{ u.role_name }}</td>
              <td class="px-5 py-4">
                <span class="px-2 py-1 text-xs font-semibold rounded-lg" [ngClass]="u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'">
                  {{ u.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #noData>
          <div class="p-8 text-center text-gray-500">No records available</div>
        </ng-template>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  activeUsers = 0;
  rolesChart: any;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/auth/users`).subscribe(
      res => {
        this.users = res;
        this.activeUsers = this.users.filter(u => u.is_active).length;
        this.calculateRoleStats();
      },
      err => console.error('Error fetching users', err)
    );
  }

  calculateRoleStats() {
    const counts: Record<string, number> = {};
    this.users.forEach(u => {
      counts[u.role_name] = (counts[u.role_name] || 0) + 1;
    });

    this.rolesChart = {
      series: Object.values(counts),
      labels: Object.keys(counts),
      chart: { type: 'donut', height: 100, sparkline: { enabled: true } },
      colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#64748b', '#ef4444']
    };
  }
}
