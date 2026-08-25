import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({selector:'app-reports',standalone:true,imports:[CommonModule,MatCardModule,MatButtonModule,MatIconModule],templateUrl:'./reports.html',styleUrl:'./reports.css'})
export class ReportsComponent {
  reports=[
    {name:'Vendor Performance Reports',key:'vendor-performance'},
    {name:'Procurement Reports',key:'procurement'},
    {name:'Purchase Order Reports',key:'purchase-orders'},
    {name:'Compliance Reports',key:'compliance'},
    {name:'Contract Reports',key:'contracts'}
  ];
  export(key:string,ext:string){window.open(`https://vendor-reliability-intelligence-platform-2h9h.onrender.com/reports/${key}.${ext}`,'_blank');}
}

