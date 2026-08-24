import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, UserProfile } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
@Component({selector:'app-vendor-dashboard',standalone:true,imports:[CommonModule,RouterLink,MatIconModule],templateUrl:'./vendor-dashboard.html',styleUrl:'./vendor-dashboard.css'})
export class VendorDashboardComponent implements OnInit{
 user:UserProfile|null=null; vendorName=''; totalOrders=0; activeContracts=0; performanceScore=0;
 recentOrders=[{id:'PO-2024-1025',vendor:'Steel & Co.',status:'Delivered',date:'20 May 2024'},{id:'PO-2024-1024',vendor:'TechSupply',status:'In Transit',date:'18 May 2024'},{id:'PO-2024-0987',vendor:'General Store',status:'Pending',date:'10 May 2024'},{id:'PO-2024-0974',vendor:'PVC Pipes',status:'Delivered',date:'05 May 2024'}];
 constructor(private auth:AuthService,private http:HttpClient){}
 ngOnInit(){this.user=this.auth.currentUser(); if(this.user)this.loadDashboard(this.user.email); else this.auth.loadProfile().subscribe({next:p=>{this.user=p;this.loadDashboard(p.email)}})}
 loadDashboard(email:string){this.http.get<any[]>(`${environment.apiUrl}/vendors/`).subscribe({next:vendors=>{const v=vendors.find(x=>x.email===email);if(v){this.vendorName=v.vendor_name;this.loadOrders(v.vendor_name);this.loadContracts(v.vendor_name);this.loadPerformance(v.vendor_name)}}});}
 loadOrders(name:string){this.http.get<any[]>(`${environment.apiUrl}/purchase-orders/`).subscribe({next:d=>this.totalOrders=d.filter(x=>x.vendor_name===name).length})}
 loadContracts(name:string){this.http.get<any[]>(`${environment.apiUrl}/contracts/`).subscribe({next:d=>this.activeContracts=d.filter(x=>x.vendor_name===name).length})}
 loadPerformance(name:string){this.http.get<any[]>(`${environment.apiUrl}/performance/`).subscribe({next:d=>{const p=d.find(x=>x.vendor_name===name);if(p)this.performanceScore=p.overall_score}})}
}
