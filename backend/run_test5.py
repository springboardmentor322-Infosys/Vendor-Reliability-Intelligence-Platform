import sys

file_path = r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\finance\\finance-overview.component.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add vendors array to class
text = text.replace('  monthlyChart: any = null;', '  monthlyChart: any = null;\n  vendors: any[] = [];\n  recentInvoices: any[] = [];')

# Add fetch for vendors in ngOnInit along with recent invoices
init_old = '''  ngOnInit() {
    this.http.get<any>('http://localhost:8000/analytics/dashboard/finance').subscribe({
      next: (resp) => {
        this.data = resp;
        this.buildKpis();
        this.buildCharts();
        this.loading = false;
      },'''

init_new = '''  ngOnInit() {
    this.http.get<any>('http://localhost:8000/analytics/dashboard/finance').subscribe({
      next: (resp) => {
        this.data = resp;
        this.recentInvoices = resp.recent_invoices || [];
        this.buildKpis();
        this.buildCharts();
        this.loading = false;
        
        // Parallel call to get vendor summary natively
        this.http.get<any[]>('http://localhost:8000/finance/vendors').subscribe(v => this.vendors = v.slice(0, 5));
      },'''

text = text.replace(init_old, init_new)

# Add statusClass(s) specifically after formatMillions
format_func_end = '''    return n.toFixed(0);
  }'''

status_func = '''    return n.toFixed(0);
  }

  statusClass(s: string): any {
    return {
        'bg-emerald-100 text-emerald-700': s === 'Paid' || s === 'Completed',
        'bg-amber-100 text-amber-700': s === 'Pending' || s === 'Under Review' || s === 'Approved',
        'bg-red-100 text-red-700': s === 'Overdue' || s === 'Rejected',
        'bg-blue-100 text-blue-700': s === 'Partially Paid',
    };
  }'''

text = text.replace(format_func_end, status_func)

# Inject tables before the closing div of the main container
html_anchor = '''      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{{error}}</div>
    </div>
  '''

tables_html = '''        <!-- Additional Deep Dive Tables -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Invoice Health -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="p-5 border-b flex justify-between items-center">
                    <h3 class="font-bold text-gray-800">Invoice Health (Recent)</h3>
                    <a routerLink="/finance-invoices" class="text-xs text-blue-600 hover:underline cursor-pointer" (click)="router.navigate(['/finance-invoices'])">View All</a>
                </div>
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr><th class="px-4 py-2">Invoice</th><th class="px-4 py-2 text-right">Amount</th><th class="px-4 py-2 text-center">Status</th></tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr *ngFor="let inv of recentInvoices" class="hover:bg-gray-50">
                            <td class="px-4 py-3 text-gray-800 font-medium">{{inv.invoice_number}}</td>
                            <td class="px-4 py-3 text-right font-semibold">₹{{formatMillions(inv.amount)}}</td>
                            <td class="px-4 py-3 text-center">
                                <span class="px-2 py-1 text-[10px] font-bold rounded-full" [ngClass]="statusClass(inv.effective_status)">{{inv.effective_status}}</span>
                            </td>
                        </tr>
                        <tr *ngIf="!recentInvoices?.length"><td colspan="3" class="text-center py-4 text-gray-400">No invoices.</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Payment Performance -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
                <h3 class="font-bold text-gray-800 mb-6">Payment Performance</h3>
                
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-500">Overdue Invoices Amount</span>
                        <span class="font-bold text-red-600">₹{{formatMillions(data.kpis?.overdue_amount)}}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-500">Pending Approvals Amount</span>
                        <span class="font-bold text-amber-600">₹{{formatMillions(data.kpis?.pending_payments)}}</span>
                    </div>
                    <div class="flex justify-between items-center pt-4 border-t">
                        <span class="text-gray-500 font-medium">Payment Completion Rate</span>
                        <span class="font-bold text-emerald-600 text-xl">{{ data.kpis?.invoiced_ytd ? ((data.kpis.total_payments_ytd / data.kpis.invoiced_ytd) * 100).toFixed(1) : 0 }}%</span>
                    </div>
                    <div class="w-full bg-gray-100 h-2 rounded-full mt-2">
                        <div class="bg-emerald-500 h-2 rounded-full" [style.width]="(data.kpis?.invoiced_ytd ? (data.kpis.total_payments_ytd / data.kpis.invoiced_ytd) * 100 : 0) + '%'"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vendor Financial Summary -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <div class="p-5 border-b flex justify-between items-center">
                <h3 class="font-bold text-gray-800">Vendor Financial Summary</h3>
                <a routerLink="/finance-vendors" class="text-xs text-blue-600 hover:underline cursor-pointer" (click)="router.navigate(['/finance-vendors'])">View Vendors Deep Dive</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th class="px-4 py-3">Vendor</th>
                            <th class="px-4 py-3 text-center">POs</th>
                            <th class="px-4 py-3 text-right">PO Value</th>
                            <th class="px-4 py-3 text-center">Invoices</th>
                            <th class="px-4 py-3 text-right">Invoiced</th>
                            <th class="px-4 py-3 text-right">Paid</th>
                            <th class="px-4 py-3 text-right">Outstanding</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr *ngFor="let v of vendors" class="hover:bg-gray-50">
                            <td class="px-4 py-3 font-semibold text-gray-800">{{v.vendor}}</td>
                            <td class="px-4 py-3 text-center">{{v.po_count}}</td>
                            <td class="px-4 py-3 text-right">₹{{formatMillions(v.po_value)}}</td>
                            <td class="px-4 py-3 text-center">{{v.invoice_count}}</td>
                            <td class="px-4 py-3 text-right text-gray-600">₹{{formatMillions(v.invoiced_amount)}}</td>
                            <td class="px-4 py-3 text-right font-medium text-emerald-600">₹{{formatMillions(v.paid_amount)}}</td>
                            <td class="px-4 py-3 text-right font-semibold text-red-600">₹{{formatMillions(v.outstanding)}}</td>
                        </tr>
                        <tr *ngIf="!vendors.length"><td colspan="7" class="text-center py-6 text-gray-400">Loading vendor summary...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{{error}}</div>
    </div>
  '''

text = text.replace(html_anchor, tables_html)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
