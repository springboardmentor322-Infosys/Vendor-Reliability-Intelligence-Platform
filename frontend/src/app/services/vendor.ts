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
export class Vendor {

  private apiUrl =
    'http://127.0.0.1:8000';


  constructor(
    private http: HttpClient
  ) {}


  // ================================
  // GET ALL VENDORS
  // ================================

  getVendors(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/vendors`
    );

  }


  // ================================
  // GET VENDOR COUNT
  // ================================

  getVendorCount(): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/vendors/count`
    );

  }


  // ================================
  // CREATE VENDOR
  // ================================

  createVendor(
    data: any
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/vendors`,
      data
    );

  }


  // ================================
  // UPDATE VENDOR
  // ================================

  updateVendor(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/vendors/${id}`,
      data
    );

  }


  // ================================
  // APPROVE VENDOR
  // ================================

  approveVendor(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/vendors/${id}/approve`,
      {}
    );

  }


  // ================================
  // REJECT VENDOR
  // ================================

  rejectVendor(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/vendors/${id}/reject`,
      {}
    );

  }


  // ================================
  // UPDATE VENDOR APPROVAL STATUS
  // ================================

  updateVendorApproval(
    id: number,
    approvalStatus: string
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/vendors/${id}/approval`,
      {
        approval_status: approvalStatus
      }
    );

  }


  // ================================
  // UPDATE VENDOR STATUS
  // ================================

  updateVendorStatus(
    id: number,
    status: string
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/vendors/${id}/status`,
      {
        status: status
      }
    );

  }


  // ================================
  // DELETE VENDOR
  // ================================

  deleteVendor(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/vendors/${id}`
    );

  }

}