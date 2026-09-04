import { environment } from '../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({selector:'app-communication',standalone:true,imports:[CommonModule,FormsModule,MatCardModule,MatButtonModule,MatIconModule,MatInputModule,MatFormFieldModule],templateUrl:'./communication.html',styleUrl:'./communication.css'})
export class CommunicationComponent implements OnInit {
  messages:any[]=[]; form:any={vendor_name:'',recipient:'',subject:'',message:'',channel:'In-App',file_name:''};
  constructor(private http:HttpClient){}
  ngOnInit(){this.load();}
  load(){this.http.get<any[]>(`${environment.apiUrl}/communication/`).subscribe({next:d=>this.messages=d});}
  send(){this.http.post(`${environment.apiUrl}/communication/`,this.form).subscribe({next:()=>{this.form.message='';this.load();}});}
  share(){this.http.post(`${environment.apiUrl}/communication/share-file`,this.form).subscribe({next:()=>this.load()});}
}
