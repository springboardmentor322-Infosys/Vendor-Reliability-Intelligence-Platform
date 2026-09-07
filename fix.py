import os
import glob
import re

base_dir = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit"
files = glob.glob(os.path.join(base_dir, "*.component.ts"))

for f_path in files:
    if "dashboard" in f_path: continue
    
    with open(f_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    start_idx = content.find("template: ")
    end_idx = content.find("\n})", start_idx)
    
    if start_idx == -1 or end_idx == -1:
        start_idx = content.find("template: \n")
        if start_idx == -1: 
            start_idx = content.find("template: \r\n")
    
    if start_idx == -1 or end_idx == -1:
        # Fallback to general finding
        start_idx = content.find("template:")
        end_idx = content.find("})", start_idx)
    
    if start_idx != -1 and end_idx != -1:
        start_str = content[:start_idx]
        end_str = content[end_idx:]
        
        # The HTML is standard for all except dashboard
        html_content = '''<div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">''' + os.path.basename(f_path).replace('.component.ts', '').replace('-', ' ').title() + '''</h2>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        <p class="mb-4">Data loaded symmetrically via PostgreSQL /audit native routes.</p>
        <div *ngIf="loading" class="animate-pulse flex flex-col items-center">
           <div class="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
           <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div *ngIf="!loading && data" class="text-left w-full overflow-x-auto text-sm">
            <pre class="bg-gray-50 p-4 rounded text-xs">{{ data | json }}</pre>
        </div>
      </div>
    </div>'''
        
        html_file = f_path.replace('.ts', '.html')
        with open(html_file, 'w', encoding='utf-8') as hf:
            hf.write(html_content)
        
        # Update TS file
        ts_content = start_str + f"templateUrl: './{os.path.basename(html_file)}'\n" + end_str
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(ts_content)

print("Migrated successfully.")
