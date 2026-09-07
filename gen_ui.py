import os

base_dir = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit"

def make_ts(name, ts_file, api, filters):
    filter_props = "\n".join([f"  {f}: string = '';" for f in filters])
    if filters:
        q = []
        for f in filters:
            q.append(f"{f}=${{this.{f}}}")
        query_params = " + `?" + "&".join(q) + "`"
    else:
        query_params = ""
        
    ts_content = f"""import {{ Component, OnInit }} from '@angular/core';
import {{ CommonModule, CurrencyPipe }} from '@angular/common';
import {{ HttpClient }} from '@angular/common/http';
import {{ Router, RouterModule }} from '@angular/router';
import {{ FormsModule }} from '@angular/forms';

@Component({{
  selector: 'app-{name}',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [CurrencyPipe],
  templateUrl: './{name}.component.html'
}})
export class {name.replace('-', ' ').title().replace(' ', '')}Component implements OnInit {{
  data: any = null;
  loading: boolean = true;
{filter_props}

  constructor(private http: HttpClient, private router: Router) {{}}

  ngOnInit() {{ this.fetchData(); }}
  
  fetchData() {{
     this.loading = true;
     let url = 'http://localhost:8000{api}'{query_params};
     this.http.get<any>(url).subscribe({{
        next: d => {{ this.data = d; this.loading = false; }},
        error: e => this.loading = false
     }});
  }}
  
  applyFilters() {{ this.fetchData(); }}
}}
"""
    with open(os.path.join(base_dir, ts_file), 'w', encoding='utf-8') as f:
        f.write(ts_content)

def make_html(name, html_file, cols, filters):
    filter_inputs = ""
    for flt in filters:
        filter_inputs += f"""
          <div>
            <label class="block text-xs font-medium text-gray-700">{flt.capitalize()}</label>
            <input type="text" [(ngModel)]="{flt}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-2 py-1 border" placeholder="Search {flt}...">
          </div>"""
          
    th_cols = "".join([f'<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{c}</th>' for c in cols])
    td_cols = "".join([f'<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{{{ row.{c} }}}}</td>' for c in cols])
    
    html = f"""<div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">{name.replace('-', ' ').title()}</h2>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-4 border-b border-gray-200 bg-gray-50 flex items-end space-x-4">
          {filter_inputs}
          <div>
             <button (click)="applyFilters()" class="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700">Apply Filters</button>
          </div>
        </div>
        
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>{th_cols}</tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let row of data">
              {td_cols}
            </tr>
          </tbody>
        </table>
        
        <div *ngIf="loading" class="p-8 text-center text-gray-400">Loading records...</div>
        <div *ngIf="!loading && data?.length === 0" class="p-8 text-center text-gray-400">No records found.</div>
      </div>
    </div>"""
    with open(os.path.join(base_dir, html_file), 'w', encoding='utf-8') as f:
        f.write(html)

make_ts('audit-logs', 'audit-logs.component.ts', '/audit/logs', ['action', 'entity'])
make_html('audit-logs', 'audit-logs.component.html', ['action', 'entity', 'user_id', 'timestamp', 'details'], ['action', 'entity'])

make_ts('procurement-audit', 'procurement-audit.component.ts', '/audit/procurement', ['vendor', 'status'])
make_html('procurement-audit', 'procurement-audit.component.html', ['po_number', 'vendor', 'status', 'total_amount', 'created_at'], ['vendor', 'status'])

make_ts('vendor-audit', 'vendor-audit.component.ts', '/audit/vendors', ['vendor', 'risk'])
make_html('vendor-audit', 'vendor-audit.component.html', ['id', 'name', 'reliability_score', 'risk_level', 'status'], ['vendor', 'risk'])

make_ts('audit-contracts', 'audit-contracts.component.ts', '/audit/contracts', ['vendor', 'status'])
make_html('audit-contracts', 'audit-contracts.component.html', ['contract', 'vendor', 'start_date', 'expiry', 'days_remaining', 'status'], ['vendor', 'status'])

make_ts('audit-invoices', 'audit-invoices.component.ts', '/audit/invoices', ['vendor', 'status'])
make_html('audit-invoices', 'audit-invoices.component.html', ['invoice_number', 'po', 'amount', 'due_date', 'status'], ['vendor', 'status'])

make_ts('audit-communications', 'audit-communications.component.ts', '/audit/communications', [])
make_html('audit-communications', 'audit-communications.component.html', ['thread', 'participants', 'related_po', 'created', 'last_message', 'status'], [])

print("OK")
