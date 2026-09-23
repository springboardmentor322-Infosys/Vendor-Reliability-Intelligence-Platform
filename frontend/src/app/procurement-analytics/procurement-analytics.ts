import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-procurement-analytics',
  styleUrl: './procurement-analytics.css',
  templateUrl: './procurement-analytics.html',
})
export class ProcurementAnalytics implements OnInit {

  procurement: any = null;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getProcurementAnalytics().subscribe((data: any) => {

      console.log('PROCUREMENT ANALYTICS DATA:', data);

      this.procurement = data;

      this.cdr.detectChanges();
    });
  }
}