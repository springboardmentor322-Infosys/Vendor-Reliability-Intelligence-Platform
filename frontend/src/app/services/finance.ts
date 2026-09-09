import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({providedIn:'root'})
export class Finance {
  private apiUrl='http://127.0.0.1:8000';
  constructor(private http:HttpClient){}
  getSummary():Observable<any>{return this.http.get<any>(`${this.apiUrl}/finance/summary`);}
  getBudgets():Observable<any[]>{return this.http.get<any[]>(`${this.apiUrl}/finance/budgets`);}
  updateBudget(id:number,allocated_limit:number):Observable<any>{return this.http.put(`${this.apiUrl}/finance/budgets/${id}`,{allocated_limit});}
}
