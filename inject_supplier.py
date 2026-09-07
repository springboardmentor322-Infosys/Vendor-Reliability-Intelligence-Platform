top_supplier_html = """
          <!-- TOP SUPPLIER PERFORMANCE (Compliance/Analytics view) -->
          <div *ngIf="reportType === 'compliance' || !reportType" class="mt-6">
            <div class="bg-white shadow-sm border border-gray-100 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-gray-800">Top Supplier Performance</h3>
                <span class="text-xs text-gray-400">Live data</span>
              </div>
              <div class="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase px-3 pb-2 border-b border-gray-100">
                <div class="col-span-4">Vendor</div>
                <div class="col-span-3 text-center">Score</div>
                <div class="col-span-3 text-center">On-Time %</div>
                <div class="col-span-2 text-right">Risk</div>
              </div>
              <div *ngFor="let vendor of summary?.top_suppliers" class="grid grid-cols-12 items-center px-3 py-3 border-b border-gray-50 hover:bg-gray-50 transition text-sm">
                <div class="col-span-4 font-semibold text-gray-800 truncate">{{vendor.vendor}}</div>
                <div class="col-span-3 text-center font-bold text-gray-700">{{vendor.reliability_score}}/100</div>
                <div class="col-span-3 text-center font-bold text-teal-600">{{vendor.on_time_delivery_pct}}%</div>
                <div class="col-span-2 text-right font-medium"
                    [ngClass]="{'text-red-500': vendor.risk_level==='High', 'text-amber-500': vendor.risk_level==='Medium', 'text-emerald-500': vendor.risk_level==='Low'}">
                    {{vendor.risk_level}}
                </div>
              </div>
              <div *ngIf="!summary?.top_suppliers?.length" class="text-center text-sm text-gray-400 py-6">No supplier data available.</div>
            </div>
          </div>
"""

filepath = r'd:\Vendor Reliability Intelligence Platform\frontend\src\app\features\reports\reports.component.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Insert after line 247 (0-indexed: 247) -- after the compliance chart section closing </div>
insert_at = 247
new_lines = lines[:insert_at] + [top_supplier_html + '\n'] + lines[insert_at:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Done. Total lines: {len(new_lines)}')
