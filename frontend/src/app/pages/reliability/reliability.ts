import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({selector:'app-reliability',standalone:true,imports:[CommonModule,MatCardModule,MatIconModule,MatProgressBarModule],templateUrl:'./reliability.html',styleUrl:'./reliability.css'})
export class ReliabilityComponent implements OnInit {
  rows:any[]=[]; summary:any={average_reliability_score:0,low_risk:0,medium_risk:0,high_risk:0};
  constructor(private http:HttpClient){}
  ngOnInit(){
    this.http.get<any[]>('http://127.0.0.1:8000/reliability/').subscribe({next:r=>this.rows=r,error:e=>console.error(e)});
    this.http.get<any>('http://127.0.0.1:8000/reliability/summary').subscribe({next:r=>this.summary=r,error:e=>console.error(e)});
  }
}
