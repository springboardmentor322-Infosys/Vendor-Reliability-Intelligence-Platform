import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth.service';
@Component({selector:'app-profile',standalone:true,imports:[CommonModule,FormsModule,MatCardModule,MatButtonModule,MatFormFieldModule,MatInputModule],templateUrl:'./profile.html',styleUrl:'./profile.css'})
export class ProfileComponent { user:any={}; constructor(public auth:AuthService,private http:HttpClient){this.user=this.auth.currentUser()||{};} }

