import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-invoices',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head">
      <div>
        <h1>Invoices & Payments</h1>
        <p>Track your submitted invoices and payment statuses.</p>
      </div>
    </div>
    <div class="card mt-6">
      <div class="card-head">
        <h3>Invoices List</h3>
      </div>
      <div class="card-body overflow-x-auto">
        <table class="w-full text-left" *ngIf="invoices.length > 0; else noData">
          <thead>
            <tr>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">Invoice No</th>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">PO ID</th>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">Amount</th>
              <th class="p-3 border-b text-[var(--slate-2)] font-medium text-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let inv of invoices" class="border-b last:border-0 hover:bg-slate-50">
              <td class="p-3 font-medium">{{ inv.invoice_number }}</td>
              <td class="p-3">{{ inv.po_id || '-' }}</td>
              <td class="p-3">\${{ inv.amount.toLocaleString(undefined, {minimumFractionDigits: 2}) }}</td>
              <td class="p-3">
                <span class="badge" [ngClass]="{
                  'green': inv.status === 'Paid',
                  'amber': inv.status === 'Pending',
                  'red': inv.status === 'Overdue',
                  'slate': !['Paid', 'Pending', 'Overdue'].includes(inv.status)
                }">{{ inv.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #noData>
          <div class="p-6 text-center text-slate-500">No records available</div>
        </ng-template>
      </div>
    </div>
  `
})
export class InvoicesComponent implements OnInit {
    invoices: any[] = [];

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any[]>(`${environment.apiBaseUrl}/procurement/invoices`).subscribe(
            res => this.invoices = res,
            err => console.error('Error fetching invoices', err)
        );
    }
}
