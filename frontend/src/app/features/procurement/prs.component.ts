import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-procurement-requests',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head">
      <div>
        <h1>Procurement Requests</h1>
        <p>Manage PRs across departments.</p>
      </div>
    </div>
    
    <div class="card mt-4">
      <div class="card-head">
        <h3>All Procurement Requests</h3>
      </div>
      <div class="card-body" *ngIf="!loading">
        <table class="data-table w-full text-left">
          <thead>
            <tr>
              <th>ID</th>
              <th>Department</th>
              <th>Total Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let pr of prs">
              <td>PR-{{ pr.id }}</td>
              <td>{{ pr.department }}</td>
              <td>{{ pr.total_cost | currency }}</td>
              <td>
                <span class="badge" [ngClass]="{'green': pr.status === 'Approved', 'amber': pr.status === 'Pending', 'red': pr.status === 'Rejected'}">{{ pr.status }}</span>
              </td>
            </tr>
            <tr *ngIf="!prs.length">
              <td colspan="4" class="text-center py-4 text-[var(--slate)]">No procurement requests found.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-body" *ngIf="loading">
        <p class="text-[var(--slate)]">Loading procurement requests...</p>
      </div>
    </div>
  `
})
export class ProcurementRequestsComponent implements OnInit {
    prs: any[] = [];
    loading = true;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any[]>(`${environment.apiBaseUrl}/procurement/requests`).subscribe({
            next: (data) => {
                this.prs = data;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }
}
