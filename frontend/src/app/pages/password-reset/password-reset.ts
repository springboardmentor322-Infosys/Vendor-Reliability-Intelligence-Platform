import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
@Component({selector:'app-password-reset',standalone:true,imports:[FormsModule,MatCardModule,MatButtonModule,MatFormFieldModule,MatInputModule],templateUrl:'./password-reset.html',styleUrl:'./password-reset.css'})
export class PasswordResetComponent { email='';new_password='';message='';constructor(private http:HttpClient){} reset(){this.http.post<any>('http://127.0.0.1:8000/users/password-reset',{email:this.email,new_password:this.new_password}).subscribe({next:r=>this.message=r.message,error:e=>this.message=e.error?.detail||'Reset failed'});}}
