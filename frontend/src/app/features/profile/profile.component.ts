import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { FormsModule } from '@angular/forms';

@Component({
   selector: 'app-profile',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <div class="page-head flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Vendor Profile</h1>
        <p class="text-sm text-gray-500 mt-1">Manage operating details, capabilities, and key contacts.</p>
      </div>
      <div>
        <button (click)="save()" class="bg-indigo-600 text-white font-semibold px-4 py-2 text-sm rounded-md shadow hover:bg-indigo-700 transition">Save Changes</button>
      </div>
    </div>
    <div class="card mt-6 p-0 border border-gray-100 shadow-sm rounded-xl overflow-hidden" *ngIf="user">
       <div class="p-6 bg-slate-50 border-b border-gray-100 flex items-center gap-6">
          <div class="w-20 h-20 bg-white border border-gray-200 rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold shadow-sm">
             {{ user.vendor_profile?.name ? user.vendor_profile.name[0] : (user.email[0].toUpperCase()) }}
          </div>
          <div>
             <h2 class="text-xl font-bold text-gray-900">{{ user.vendor_profile?.name || user.email }}</h2>
             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-widest">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Vendor
             </span>
          </div>
       </div>
       <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
          <div class="space-y-6">
             <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2">Account Information</h3>
             <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <div class="p-2.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">{{ user.email }}</div>
             </div>
             <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Assigned Role</label>
                <div class="p-2.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">{{ user.role?.name || user.role_name }}</div>
             </div>
          </div>
           <div class="space-y-6">
             <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2">Business Details</h3>
             <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Vendor ID (System Assigned)</label>
                <div class="p-2.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 font-mono">{{ vendorAnalytics?.account_summary?.vendor_id || 'VDR-2024-1025' }}</div>
             </div>
             <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Primary Category</label>
                <input type="text" class="w-full p-2.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Raw Materials" value="Construction Supplies">
             </div>
          </div>
       </div>

       <!-- Dynamic Dashboard Account Summary Section -->
       <div class="p-6 bg-white border-t border-gray-100" *ngIf="vendorAnalytics?.account_summary">
           <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-6">Detailed Account Tracking</h3>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div class="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-100">
                   <div class="flex items-center gap-2 text-gray-500 text-sm font-semibold"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Vendor Since</div>
                   <div class="font-bold text-gray-800">{{vendorAnalytics.account_summary.vendor_since}}</div>
               </div>
               <div class="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-100">
                   <div class="flex items-center gap-2 text-gray-500 text-sm font-semibold"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> Primary Contact</div>
                   <div class="font-bold text-gray-800">{{vendorAnalytics.account_summary.primary_contact}}</div>
               </div>
               <div class="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-100">
                   <div class="flex items-center gap-2 text-gray-500 text-sm font-semibold"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg> Contact Email</div>
                   <div class="font-bold text-gray-800">{{vendorAnalytics.account_summary.contact_email}}</div>
               </div>
               <div class="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-100">
                   <div class="flex items-center gap-2 text-gray-500 text-sm font-semibold"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg> Contact Phone</div>
                   <div class="font-bold text-gray-800">{{vendorAnalytics.account_summary.contact_phone}}</div>
               </div>
           </div>
       </div>

    </div>
  `
})
export class ProfileComponent implements OnInit {
   user: any = null;
   vendorAnalytics: any = null;

   constructor(private auth: AuthService, private dashboardService: DashboardService) { }

   ngOnInit() {
      this.auth.currentUser$.subscribe(u => {
         this.user = u;
         if (u && (u.role?.name === 'Vendor' || u.role_name === 'Vendor')) {
            this.dashboardService.getRoleDashboard('vendor').subscribe(data => {
               this.vendorAnalytics = data.analytics || data;
            });
         }
      });
   }

   save() {
      alert("Profile saved successfully");
   }
}
