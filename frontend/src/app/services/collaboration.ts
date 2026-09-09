import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({providedIn:'root'})
export class Collaboration {
  private apiUrl='http://127.0.0.1:8000';
  constructor(private http:HttpClient){}
  getThread(entityType:string,entityId:number):Observable<any>{return this.http.get(`${this.apiUrl}/threads/${entityType}/${entityId}`);}
  sendMessage(threadId:number,content:string):Observable<any>{return this.http.post(`${this.apiUrl}/threads/${threadId}/messages`,{content});}
}
