import { Injectable } from '@angular/core';
import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Communication {


  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================
  // GET ALL COMMUNICATIONS
  // ==========================================

  getCommunications(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/communications/`
    );

  }


  // ==========================================
  // GET COMMUNICATION BY ID
  // ==========================================

  getCommunication(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/communications/${id}`
    );

  }


  // ==========================================
  // GET COMMUNICATIONS BY VENDOR
  // ==========================================

  getVendorCommunications(
    vendorId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/communications/vendor/${vendorId}`
    );

  }


  // ==========================================
  // GET COMMUNICATIONS BY TYPE
  // ==========================================

  getCommunicationsByType(
    type: string
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/communications/type/${encodeURIComponent(type)}`
    );

  }


  // ==========================================
  // CREATE COMMUNICATION
  // ==========================================

  createCommunication(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/communications/`,
      data
    );

  }


  // ==========================================
  // UPLOAD FILE
  // ==========================================

  uploadFile(
    file: File
  ): Observable<any> {

    const formData =
      new FormData();


    formData.append(
      'file',
      file
    );


    return this.http.post<any>(
      `${this.apiUrl}/communications/upload`,
      formData
    );

  }


  // ==========================================
  // DOWNLOAD FILE URL
  // ==========================================

  getFileUrl(
    filePath: string
  ): string {

    return (
      `${this.apiUrl}/communications/file/` +
      encodeURIComponent(filePath)
    );

  }


  // ==========================================
  // UPDATE COMMUNICATION
  // ==========================================

  updateCommunication(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put<any>(
      `${this.apiUrl}/communications/${id}`,
      data
    );

  }


  // ==========================================
  // DELETE COMMUNICATION
  // ==========================================

  deleteCommunication(
    id: number
  ): Observable<any> {

    return this.http.delete<any>(
      `${this.apiUrl}/communications/${id}`
    );

  }

}