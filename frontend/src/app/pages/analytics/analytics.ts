import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartType } from 'chart.js';
Chart.register(...registerables);
@Component({selector:'app-analytics',standalone:true,imports:[CommonModule,MatCardModule,BaseChartDirective],templateUrl:'./analytics.html',styleUrl:'./analytics.css'})
export class AnalyticsComponent implements OnInit {
  stats:any={total_vendors:0,total_procurement_requests:0,total_purchase_orders:0,total_spend:0,average_vendor_performance:0,completed_orders:0,delivery_status:{delivered:0,pending:0,in_progress:0}};
  vendorChartType:ChartType='bar'; qualityDeliveryChartType:ChartType='bar'; performanceTrendType:ChartType='line';
  vendorChartData:ChartConfiguration['data']={labels:[],datasets:[{data:[],label:'Reliability Score'}]};
  qualityDeliveryChartData:ChartConfiguration['data']={labels:[],datasets:[{data:[],label:'Quality Score'},{data:[],label:'Delivery Score'}]};
  performanceTrendData:ChartConfiguration['data']={labels:[],datasets:[{data:[],label:'Performance Trend',tension:.4,fill:true}]};
  constructor(private http:HttpClient){}
  ngOnInit(){this.http.get<any>('http://127.0.0.1:8000/analytics/').subscribe({next:d=>this.stats=d});this.http.get<any[]>('http://127.0.0.1:8000/performance/').subscribe({next:data=>{const rows=(data||[]).sort((a,b)=>b.overall_score-a.overall_score).slice(0,10);const labels=rows.map(r=>r.vendor_name);this.vendorChartData={labels,datasets:[{data:rows.map(r=>r.overall_score),label:'Reliability Score'}]};this.qualityDeliveryChartData={labels,datasets:[{data:rows.map(r=>r.quality_score),label:'Quality Score'},{data:rows.map(r=>r.delivery_score),label:'Delivery Score'}]};this.performanceTrendData={labels,datasets:[{data:rows.map(r=>r.overall_score),label:'Performance Trend',tension:.4,fill:true}]}}});}
}
