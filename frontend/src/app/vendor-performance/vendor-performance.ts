import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-vendor-performance',
  styleUrl: './vendor-performance.css',
  templateUrl: './vendor-performance.html',
})
export class VendorPerformance implements OnInit {

  performance: any[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
this.api.getVendorPerformance(1).subscribe((data: any) => {
      console.log('VENDOR PERFORMANCE DATA:', data);

    this.performance = data ? [data] : [];

      this.cdr.detectChanges();
    });
  }

}