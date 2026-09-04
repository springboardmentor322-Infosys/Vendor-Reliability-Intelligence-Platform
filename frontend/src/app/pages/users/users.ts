import { environment } from '../../../environments/environment';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({selector:'app-users',standalone:true,imports:[CommonModule,MatCardModule,MatTableModule],templateUrl:'./users.html',styleUrl:'./users.css'})
export class UsersComponent implements OnInit {
  users = signal<any[]>([]);
  cols=['full_name','email','role'];
  constructor(private http:HttpClient){}
  ngOnInit(){this.http.get<any[]>(`${environment.apiUrl}/users/`).subscribe({next:d=>this.users.set(d),error:e=>console.error(e)});}
}
