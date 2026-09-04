import { environment } from '../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

@Component({selector:'app-invoices',standalone:true,imports:[CommonModule,FormsModule,MatCardModule,MatButtonModule,MatIconModule,MatTableModule],templateUrl:'./invoices.html',styleUrl:'./invoices.css'})
export class InvoicesComponent implements OnInit { invoices:any[]=[]; constructor(private http:HttpClient){} ngOnInit(){this.load()} load(){this.http.get<any[]>(`${environment.apiUrl}/invoices/`).subscribe({next:d=>this.invoices=d});} update(id:number,status:string){this.http.put(`${environment.apiUrl}/invoices/${id}/status`,{status}).subscribe({next:()=>this.load()});}}
