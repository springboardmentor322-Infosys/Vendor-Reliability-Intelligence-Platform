import { environment } from '../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatProgressBarModule, MatIconModule],
  templateUrl: './performance.html',
  styleUrls: ['./performance.css']
})
export class PerformanceComponent implements OnInit {
  records: any[] = [];
  totalVendors = 0;
  averageScore = 0;
  averageServiceRating = 0;
  averageResponseTime = 0;
  averageResolutionTime = 0;
  averageCompletion = 0;
  topVendor = '';
  loading = true;

  columns = [
    'vendor_name', 'delivery_score', 'delayed_deliveries', 'quality_score',
    'response_time_hours', 'issue_resolution_time_hours', 'service_rating',
    'order_completion_rate', 'overall_score', 'action'
  ];

  private apiUrl = `${environment.apiUrl}/performance`;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void { this.loadPerformance(); }

  loadPerformance(): void {
    this.http.get<any[]>(`${this.apiUrl}/`).subscribe({
      next: data => {
        this.records = data || [];
        this.totalVendors = this.records.length;
        if (this.records.length) {
          this.averageScore = Math.round(this.records.reduce((s, r) => s + (r.overall_score || 0), 0) / this.records.length);
          this.averageServiceRating = Math.round(this.records.reduce((s, r) => s + (r.service_rating || 0), 0) / this.records.length);
          this.averageResponseTime = Math.round(this.records.reduce((s, r) => s + (r.response_time_hours || 0), 0) / this.records.length);
          this.averageResolutionTime = Math.round(this.records.reduce((s, r) => s + (r.issue_resolution_time_hours || 0), 0) / this.records.length);
          this.averageCompletion = Math.round(this.records.reduce((s, r) => s + (r.order_completion_rate || 0), 0) / this.records.length);
          this.topVendor = [...this.records].sort((a, b) => b.overall_score - a.overall_score)[0]?.vendor_name || '-';
        }
        this.loading = false;
      },
      error: err => { console.error('Performance API Error:', err); this.loading = false; }
    });
  }

  addPerformance(): void { this.router.navigate(['/add-performance']); }
  editPerformance(id: number): void { this.router.navigate(['/edit-performance', id]); }

  deletePerformance(id: number): void {
    if (!confirm('Delete this performance record?')) return;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => this.loadPerformance(),
      error: err => alert(err.error?.detail || 'Unable to delete performance record')
    });
  }
}
