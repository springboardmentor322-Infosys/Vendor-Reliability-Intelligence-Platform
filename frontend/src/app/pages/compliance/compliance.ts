import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({selector:'app-compliance',standalone:true,imports:[CommonModule,FormsModule,MatCardModule,MatButtonModule,MatIconModule,MatInputModule,MatFormFieldModule],templateUrl:'./compliance.html',styleUrl:'./compliance.css'})
export class ComplianceComponent implements OnInit {
  summary:any={}; certs:any[]=[]; docs:any[]=[]; form:any={vendor_name:'',certification_name:'',certificate_number:'',issue_date:'',expiry_date:'',status:'Valid',document_path:''};
  constructor(private http:HttpClient){}
  ngOnInit(){this.load();}
  load(){this.http.get<any>('https://vendor-reliability-intelligence-platform-2h9h.onrender.com/compliance/summary').subscribe({next:d=>this.summary=d});this.http.get<any[]>('https://vendor-reliability-intelligence-platform-2h9h.onrender.com/compliance/certifications').subscribe({next:d=>this.certs=d});this.http.get<any[]>('https://vendor-reliability-intelligence-platform-2h9h.onrender.com/compliance/documents').subscribe({next:d=>this.docs=d});}
  addCertification(){this.http.post('https://vendor-reliability-intelligence-platform-2h9h.onrender.com/compliance/certifications',this.form).subscribe({next:()=>{this.load();this.form={vendor_name:'',certification_name:'',certificate_number:'',issue_date:'',expiry_date:'',status:'Valid',document_path:''}}});}
}

