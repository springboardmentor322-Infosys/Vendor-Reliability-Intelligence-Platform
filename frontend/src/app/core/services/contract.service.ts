import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Contract {
  id: number;
  contract_number: string;
  vendor_id: number;
  purchase_order_id?: number;
  title: string;
  description?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  renewal_notice_period?: number;
  contract_value?: number;
  currency?: string;
  status: string;
  terms?: string;
  compliance_flags?: any;
  renewal_required?: boolean;
  auto_renew?: boolean;
  uploaded_document_path?: string;
  uploaded_document_name?: string;
  uploaded_at?: string;
  created_at: string;
}

export interface ContractAlert {
  id: number;
  contract_number: string;
  title: string;
  vendor_id: number;
  end_date: string;
  days_remaining: number;
  alert_level: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private apiUrl = `${environment.apiBaseUrl}/contracts`;

  constructor(private http: HttpClient) { }

  getContracts(vendorId?: number, status?: string, search?: string, compliance_flag?: string): Observable<Contract[]> {
    let params = new HttpParams();
    if (vendorId) params = params.set('vendor_id', vendorId.toString());
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    if (compliance_flag) params = params.set('compliance_flag', compliance_flag);
    
    return this.http.get<Contract[]>(this.apiUrl, { params });
  }

  getContract(id: number): Observable<Contract> {
    return this.http.get<Contract>(`${this.apiUrl}/${id}`);
  }

  createContract(contract: any): Observable<Contract> {
    return this.http.post<Contract>(this.apiUrl, contract);
  }

  updateContract(id: number, contract: any): Observable<Contract> {
    return this.http.put<Contract>(`${this.apiUrl}/${id}`, contract);
  }

  uploadContractDocument(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${id}/upload`, formData);
  }

  renewContract(id: number, data: any): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/${id}/renew`, data);
  }

  getAlerts(): Observable<ContractAlert[]> {
    return this.http.get<ContractAlert[]>(`${this.apiUrl}/alerts`);
  }

  getExpiringContracts(days: number = 90): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/expiring?days=${days}`);
  }
}
