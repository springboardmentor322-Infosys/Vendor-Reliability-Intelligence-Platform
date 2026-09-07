import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-finance-vendors',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Vendors — Financial View</h2>
        <p class="text-sm text-gray-500">Committed, realized, invoiced, paid, pending, and overdue amounts per vendor.</p>
      </div>
      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading vendor financials...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>

      <!-- Detail View -->
      <div *ngIf="!loading && selectedId && detail" class="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-gray-900 text-2xl mb-1">{{detail.name}}</h3>
            <p class="text-sm text-gray-600">Category: <strong>{{detail.category || '-'}}</strong> · Status: <span class="text-indigo-700 font-semibold">{{detail.status}}</span></p>
          </div>
          <button (click)="navTo('/finance-vendors')" class="px-3 py-1 bg-white border rounded text-sm text-gray-600 hover:bg-gray-50">Close Details</button>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">PO Value</span><div class="font-bold text-blue-700 text-lg">₹{{formatMillions(detail.po_value)}}</div></div>
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">Invoiced Amount</span><div class="font-bold text-indigo-700 text-lg">₹{{formatMillions(detail.invoiced_amount)}}</div></div>
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">Paid Amount</span><div class="font-bold text-emerald-600 text-lg">₹{{formatMillions(detail.paid_amount)}}</div></div>
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">Outstanding</span><div class="font-bold text-red-600 text-lg">₹{{formatMillions(detail.outstanding_amount)}}</div></div>
        </div>
      </div>

      <!-- List View -->
      <div *ngIf="!selectedId && !loading && vendors?.length" class="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-gray-400 uppercase text-xs border-b bg-gray-50">
            <tr>
              <th class="px-4 py-3">Vendor</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3">Committed</th>
              <th class="px-4 py-3">Realized</th>
              <th class="px-4 py-3">Invoiced</th>
              <th class="px-4 py-3">Paid</th>
              <th class="px-4 py-3">Pending</th>
              <th class="px-4 py-3">Overdue</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let v of vendors" class="hover:bg-gray-50 cursor-pointer" (click)="navTo('/finance-vendors/'+v.id)">
              <td class="px-4 py-3 font-semibold text-gray-800">{{v.name}}</td>
              <td class="px-4 py-3 text-gray-500">{{v.category || '-'}}</td>
              <td class="px-4 py-3 font-medium text-blue-700">₹{{formatMillions(v.committed_spend)}}</td>
              <td class="px-4 py-3 text-gray-700">₹{{formatMillions(v.realized_spend)}}</td>
              <td class="px-4 py-3 text-indigo-700">₹{{formatMillions(v.invoiced_amount)}}</td>
              <td class="px-4 py-3 text-emerald-700 font-semibold">₹{{formatMillions(v.paid_amount)}}</td>
              <td class="px-4 py-3 text-amber-700">₹{{formatMillions(v.pending_amount)}}</td>
              <td class="px-4 py-3 text-red-600 font-semibold">₹{{formatMillions(v.overdue_amount)}}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded-full font-semibold"
                  [ngClass]="v.status==='Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'">
                  {{v.status}}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="!selectedId && !loading && !vendors?.length" class="text-center text-gray-500 py-16">No vendor data available.</div>
    </div>
  `
})
export class FinanceVendorsComponent implements OnInit {
  vendors: any[] = [];
  loading = true;
  error = '';
  selectedId: number | null = null;
  detail: any = null;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.route.paramMap.subscribe(p => {
      const id = p.get('id');
      if (id) { this.selectedId = +id; this.openDetail(+id); }
      else { this.selectedId = null; this.detail = null; }
    });
    this.http.get<any[]>('http://localhost:8000/finance/vendors').subscribe({
      next: d => { this.vendors = d; this.loading = false; },
      error: e => { this.error = e.error?.detail || 'Failed to load vendor data.'; this.loading = false; }
    });
  }

  openDetail(id: number) {
    this.loading = true;
    this.http.get<any>(`http://localhost:8000/finance/vendors/${id}`).subscribe({
      next: d => { this.detail = d; this.loading = false; },
      error: e => { this.error = e.error?.detail || 'Failed to load vendor details.'; this.loading = false; }
    });
  }

  navTo(path: string) { this.router.navigateByUrl(path); }

  formatMillions(n: number): string {
    if (!n) return '0';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return n.toFixed(0);
  }
}
