import os

base_dir = r'd:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit'
os.makedirs(base_dir, exist_ok=True)

components = {
    'auditor-dashboard': 'AuditorDashboard',
    'audit-overview': 'AuditOverview',
    'audit-logs': 'AuditLogs',
    'procurement-audit': 'ProcurementAudit',
    'vendor-audit': 'VendorAudit',
    'audit-contracts': 'AuditContracts',
    'audit-invoices': 'AuditInvoices',
    'risk-controls': 'RiskControls',
    'order-delivery-audit': 'OrderDeliveryAudit',
    'audit-communications': 'AuditCommunications',
    'audit-reports': 'AuditReports',
    'compliance-reports': 'ComplianceReports',
    'exception-reports': 'ExceptionReports',
    'audit-exports': 'AuditExports'
}

for file_name, class_name in components.items():
    content = f'''import {{ Component, OnInit }} from '@angular/core';
import {{ CommonModule, CurrencyPipe }} from '@angular/common';
import {{ HttpClient }} from '@angular/common/http';
import {{ Router, RouterModule }} from '@angular/router';

@Component({{
  selector: 'app-{file_name}',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [CurrencyPipe],
  template: 
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">{class_name.replace('Audit', 'Audit ')}</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        <p class="mb-4">Data loaded symmetrically via PostgreSQL /audit native routes.</p>
        <div *ngIf="loading" class="animate-pulse flex flex-col items-center">
           <div class="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
           <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div *ngIf="!loading && data" class="text-left w-full overflow-x-auto text-sm">
            <pre class="bg-gray-50 p-4 rounded text-xs">{{{{ data | json }}}}</pre>
        </div>
      </div>
    </div>
  
}})
export class {class_name}Component implements OnInit {{
  data: any = null;
  loading: boolean = true;
  constructor(private http: HttpClient, private router: Router) {{}}
  ngOnInit() {{
     this.http.get<any>('http://localhost:8000/audit/').subscribe({{
        next: d => {{ this.data = d; this.loading = false; }},
        error: e => this.loading = false
     }});
  }}
}}
'''
    with open(os.path.join(base_dir, f'{file_name}.component.ts'), 'w', encoding='utf-8') as f:
        f.write(content)

print("Generated Components")
