import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Message {
  id: number;
  thread_type: string;
  thread_id: number;
  sender_id: number;
  receiver_id?: number;
  message: string;
  attachment_path?: string;
  attachment_name?: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {
  private apiUrl = `${environment.apiBaseUrl}/communications/messages`;

  constructor(private http: HttpClient) { }

  getMessages(threadType?: string, threadId?: number): Observable<Message[]> {
    let params = new HttpParams();
    if (threadType) params = params.set('thread_type', threadType);
    if (threadId) params = params.set('thread_id', threadId.toString());
    
    return this.http.get<Message[]>(this.apiUrl, { params });
  }

  sendMessage(data: any): Observable<Message> {
    return this.http.post<Message>(this.apiUrl, data);
  }

  markAsRead(messageId: number): Observable<Message> {
    return this.http.patch<Message>(`${this.apiUrl}/${messageId}/read`, {});
  }

  deleteMessage(messageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${messageId}`);
  }

  uploadAttachment(messageId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${messageId}/upload`, formData);
  }
}
