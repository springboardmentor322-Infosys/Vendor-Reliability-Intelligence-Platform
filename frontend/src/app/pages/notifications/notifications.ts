import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
interface Notification { id:number; message:string; severity:string; read:boolean; type:string; }
@Component({selector:'app-notifications',standalone:true,imports:[CommonModule,MatCardModule,MatListModule,MatIconModule,MatButtonModule],templateUrl:'./notifications.html',styleUrl:'./notifications.css'})
export class NotificationsComponent implements OnInit {
 notifications:Notification[]=[]; constructor(private http:HttpClient){}
 ngOnInit(){this.load();}
 load(){this.http.get<Notification[]>('https://vendor-reliability-intelligence-platform-2h9h.onrender.com/notifications/').subscribe({next:r=>this.notifications=r,error:e=>console.error(e)});}
 markAllRead(){this.notifications=this.notifications.map(n=>({...n,read:true}));}
}

