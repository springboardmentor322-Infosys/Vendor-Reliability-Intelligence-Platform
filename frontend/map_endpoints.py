import os
import glob

base_dir = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit"
files = glob.glob(os.path.join(base_dir, "*.component.ts"))

endpoints = {
    'audit-overview': '/audit/overview',
    'audit-logs': '/audit/logs',
    'procurement-audit': '/audit/procurement',
    'vendor-audit': '/audit/vendors',
    'audit-contracts': '/audit/contracts',
    'audit-invoices': '/audit/invoices',
    'risk-controls': '/audit/risk-controls',
    'order-delivery-audit': '/audit/deliveries',
    'audit-communications': '/audit/communications',
    'audit-reports': '/audit/reports',
    'compliance-reports': '/audit/reports',
    'exception-reports': '/audit/reports',
    'audit-exports': '/audit/exports'
}

for f_path in files:
    fname = os.path.basename(f_path).replace('.component.ts', '')
    if fname in endpoints:
        content = open(f_path, 'r', encoding='utf-8').read()
        content = content.replace("localhost:8000/audit/'", f"localhost:8000{endpoints[fname]}'")
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)

print("Mapped proper endpoints.")
