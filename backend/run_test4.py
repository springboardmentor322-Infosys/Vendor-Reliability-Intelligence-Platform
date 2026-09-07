import sys
import re

file_path = r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\finance\\finance-vendors.component.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add ActivatedRoute to imports
text = text.replace('import { Router } from \'@angular/router\';', 'import { Router, ActivatedRoute } from \'@angular/router\';')

# Add properties
props = '''    vendors: any[] = [];
    loading = true;
    error = '';
    selectedId: number | null = null;
    detail: any = null;'''
text = re.sub(r'    vendors: any\[\] = \[\];\s+loading = true;\s+error = \'\';', props, text)

# Add ActivatedRoute to constructor
text = text.replace('constructor(private http: HttpClient, private router: Router) { }', 'constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) { }')

# In ngOnInit, listen to params and load
oninit = '''    ngOnInit() {
        this.route.paramMap.subscribe(p => {
            const id = p.get('id');
            if (id) { this.selectedId = +id; this.openDetail(+id); }
            else { this.selectedId = null; this.detail = null; }
        });
        this.http.get<any[]>('http://localhost:8000/finance/vendors').subscribe({
            next: d => { this.vendors = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load vendor data.'; this.loading = false; }
        });
    }

    openDetail(id: number) {
        this.loading = true;
        this.http.get<any>(http://localhost:8000/finance/vendors/).subscribe({
            next: d => { this.detail = d; this.loading = false; },
            error: e => { this.error = e.error?.detail || 'Failed to load vendor details.'; this.loading = false; }
        });
    }'''
text = re.sub(r'    ngOnInit\(\) \{[\s\S]*?    \}', oninit, text)

# Template injection
detail_template = '''      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading vendor financials...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>

      <!-- Detail View -->
      <div *ngIf="!loading && selectedId && detail" class="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-gray-900 text-2xl mb-1">{{detail.name}}</h3>
            <p class="text-sm text-gray-600">Category: <strong>{{detail.category || '-'}}</strong> · Status: <span class="text-indigo-700 font-semibold">{{detail.status}}</span></p>
          </div>
          <button (click)="navTo('/finance-vendors')" class="px-3 py-1 bg-white border rounded text-sm text-gray-600 hover:bg-gray-50">Close Details</button>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">PO Value</span><div class="font-bold text-blue-700 text-lg">₹{{formatMillions(detail.po_value)}}</div></div>
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">Invoiced Amount</span><div class="font-bold text-indigo-700 text-lg">₹{{formatMillions(detail.invoiced_amount)}}</div></div>
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">Paid Amount</span><div class="font-bold text-emerald-600 text-lg">₹{{formatMillions(detail.paid_amount)}}</div></div>
          <div class="bg-white p-4 rounded-lg border shadow-sm"><span class="text-gray-500">Outstanding</span><div class="font-bold text-red-600 text-lg">₹{{formatMillions(detail.outstanding_amount)}}</div></div>
        </div>
      </div>

      <!-- List View -->
      <div *ngIf="!selectedId && !loading && vendors?.length" class="bg-white rounded-xl border shadow-sm overflow-x-auto">'''

text = text.replace('''      <div *ngIf="loading" class="text-gray-400 text-center py-16">Loading vendor financials...</div>
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm mb-4">{{error}}</div>
      <div *ngIf="!loading && vendors?.length" class="bg-white rounded-xl border shadow-sm overflow-x-auto">''', detail_template)

text = text.replace('<div *ngIf="!loading && !vendors?.length" class="text-center text-gray-500 py-16">No vendor data available.</div>', '<div *ngIf="!selectedId && !loading && !vendors?.length" class="text-center text-gray-500 py-16">No vendor data available.</div>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Vendor details integrated.")
