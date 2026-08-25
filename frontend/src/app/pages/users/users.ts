import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
@Component({selector:'app-users',standalone:true,imports:[CommonModule,MatCardModule,MatTableModule],templateUrl:'./users.html',styleUrl:'./users.css'})
export class UsersComponent implements OnInit { users:any[]=[]; cols=['full_name','email','role']; constructor(private http:HttpClient){} ngOnInit(){this.http.get<any[]>('https://vendor-reliability-intelligence-platform-2h9h.onrender.com/users/').subscribe({next:d=>this.users=d,error:e=>console.error(e)});}}

