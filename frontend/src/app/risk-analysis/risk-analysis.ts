import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-risk-analysis',
  styleUrl: './risk-analysis.css',
  templateUrl: './risk-analysis.html',
})
export class RiskAnalysis implements OnInit {

  risk: any = null;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getRiskSummary().subscribe((data: any) => {

      console.log('RISK DATA:', data);

      this.risk = data;

      this.cdr.detectChanges();
    });
  }
}