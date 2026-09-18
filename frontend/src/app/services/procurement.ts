
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/procurements';

  getProcurements() {
    return this.http.get<any[]>(this.apiUrl);
  }

  addProcurement(procurement: any) {
    return this.http.post<any>(this.apiUrl, procurement);
  }
}