import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-finance-approvals',
    standalone: true,
    imports: [CommonModule, FormsModule],
    providers: [DatePipe],
    template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Invoice Approvals</h2>
      <p class="text-sm text-gray-500 mb-6">Invoices pending Finance Officer review, sorted by due date (most urgent first).</p>

      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading pending approvals...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>
      <div *ngIf="feedback" class="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-700 mb-4">{{feedback}}</div>

      <div *ngIf="!loading && invoices?.length === 0" class="text-center text-gray-500 py-16">
        <div class="text-4xl mb-3">✅</div>
        <p>No invoices pending approval. All clear!</p>
      </div>

      <div *ngIf="!loading && invoices?.length" class="space-y-4">
        <div *ngFor="let inv of invoices"
             class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div class="font-bold text-gray-900 text-base">{{inv.invoice_number}}</div>
              <div class="text-sm text-gray-600 mt-1">
                Vendor: <strong>{{inv.vendor || '-'}}</strong> · PO: {{inv.po_number || '-'}}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xl font-extrabold text-gray-900">₹{{formatMillions(inv.amount)}}</div>
              <div class="text-xs text-gray-500">Due: {{inv.due_date | date:'MMM d, y'}}</div>
            </div>
          </div>

          <!-- Urgency indicator -->
          <div *ngIf="isOverdue(inv)" class="text-xs font-semibold text-red-600 mb-3">
            🔴 OVERDUE — due date has passed
          </div>
          <div *ngIf="isDueSoon(inv) && !isOverdue(inv)" class="text-xs font-semibold text-amber-600 mb-3">
            ⚠️ Due within 3 days
          </div>

          <!-- Action buttons -->
          <div class="flex gap-3 flex-wrap">
            <button (click)="approve(inv.id)"
              class="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-semibold transition">
              ✅ Approve
            </button>
            <button (click)="toggleReject(inv)"
              class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-semibold transition">
              ❌ Reject
            </button>
          </div>

          <!-- Inline reject form -->
          <div *ngIf="rejectingId === inv.id" class="mt-3 bg-red-50 rounded-lg border border-red-100 p-4">
            <label class="text-sm font-semibold text-gray-700 block mb-2">Rejection Reason (required)</label>
            <textarea [(ngModel)]="rejectReason" rows="2"
              class="w-full text-sm border rounded px-3 py-2 mb-2"
              placeholder="Enter reason for rejection..."></textarea>
            <div class="flex gap-2">
              <button (click)="reject(inv.id)"
                class="px-3 py-1 bg-red-600 text-white text-sm rounded font-semibold">Confirm Rejection</button>
              <button (click)="rejectingId=null"
                class="px-3 py-1 bg-gray-200 text-sm rounded">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinanceApprovalsComponent implements OnInit {
    invoices: any[] = [];
    loading = true;
    error = '';
    feedback = '';
    rejectingId: number | null = null;
    rejectReason = '';

    constructor(private http: HttpClient) { }

    ngOnInit() { this.load(); }

    load() {
        this.loading = true;
        this.http.get<any[]>('http://localhost:8000/finance/approvals').subscribe({
            next: d => { this.invoices = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load approval queue.'; this.loading = false; }
        });
    }

    approve(id: number) {
        this.http.patch<any>(`http://localhost:8000/finance/invoices/${id}/approve`, {}).subscribe({
            next: r => { this.feedback = r.message; this.load(); },
            error: e => { this.error = e.error?.detail || 'Failed to approve.'; }
        });
    }

    toggleReject(inv: any) {
        this.rejectingId = this.rejectingId === inv.id ? null : inv.id;
        this.rejectReason = '';
    }

    reject(id: number) {
        if (!this.rejectReason.trim()) { this.error = 'Rejection reason is required.'; return; }
        this.http.patch<any>(`http://localhost:8000/finance/invoices/${id}/reject`, { reason: this.rejectReason }).subscribe({
            next: r => { this.feedback = r.message; this.rejectingId = null; this.load(); },
            error: e => { this.error = e.error?.detail || 'Failed to reject.'; }
        });
    }

    isOverdue(inv: any): boolean {
        return inv.due_date && new Date(inv.due_date) < new Date();
    }

    isDueSoon(inv: any): boolean {
        if (!inv.due_date) return false;
        const diff = (new Date(inv.due_date).getTime() - Date.now()) / 86400000;
        return diff >= 0 && diff <= 3;
    }

        formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }
}
