import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

interface DashboardStats { total_vendors:number; active_vendors:number; inactive_vendors:number; total_procurement_requests:number; pending_procurement_requests:number; total_purchase_orders:number; approved_purchase_orders:number; completed_purchase_orders:number; total_vendor_performance:number; }
@Component({selector:'app-dashboard',standalone:true,imports:[CommonModule,RouterLink,MatIconModule],templateUrl:'./dashboard.html',styleUrl:'./dashboard.css'})
export class DashboardComponent implements OnInit {
  stats: DashboardStats|null=null;
  topVendors=[{name:'Global Steel Corp',category:'Raw Materials',score:92},{name:'TechSupply Ltd',category:'IT Equipment',score:88},{name:'QuickLogistics',category:'Logistics',score:85},{name:'BuildRight Services',category:'Construction',score:79},{name:'OfficeMart Commerce',category:'Office Supplies',score:76}];
  recentOrders=[{id:'PO-2024-1021',vendor:'Global Steel Corp',amount:'$85,000',status:'Delivered',class:'delivered',order:'28 May 2024',delivery:'30 May 2024'},{id:'PO-2024-1027',vendor:'TechSupply Ltd',amount:'$41,500',status:'In Transit',class:'transit',order:'27 May 2024',delivery:'02 Jun 2024'},{id:'PO-2024-1034',vendor:'QuickLogistics',amount:'$24,300',status:'Pending',class:'pending',order:'26 May 2024',delivery:'04 Jun 2024'},{id:'PO-2024-1039',vendor:'BuildRight Services',amount:'$68,750',status:'Approved',class:'approved',order:'25 May 2024',delivery:'08 Jun 2024'},{id:'PO-2024-1042',vendor:'OfficeMart Commerce',amount:'$18,600',status:'Pending',class:'pending',order:'24 May 2024',delivery:'10 Jun 2024'}];
  activities=[{title:'Purchase order #PO-2024-1021 marked Delivered',time:'5 mins ago'},{title:'Contract CTR-2024-0084 is expiring in 10 days',time:'1 hour ago'},{title:'New vendor application received',time:'3 hours ago'},{title:'User role updated by Admin',time:'5 hours ago'}];
  health=[{name:'Backend Services',icon:'dns'},{name:'Database',icon:'storage'},{name:'API Gateway',icon:'api'},{name:'Email Service',icon:'mail'},{name:'File Storage',icon:'folder'}];
  constructor(private http:HttpClient){}
  ngOnInit(){this.http.get<DashboardStats>(`${environment.apiUrl}/dashboard/`).subscribe({next:d=>this.stats=d,error:()=>{}});}
}

