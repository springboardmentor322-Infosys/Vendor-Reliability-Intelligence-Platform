import os
import glob
import re

base_dir = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit"
files = glob.glob(os.path.join(base_dir, "*.component.ts"))

for f_path in files:
    # Skip auditor-dashboard as I created it differently without the powershell backtick deletion issue
    if "auditor-dashboard" in f_path: continue
    
    content = open(f_path, 'r', encoding='utf-8').read()
    
    # Check if template: is missing the backtick
    if "template: \n    <div class=" in content:
        content = content.replace("template: \n    <div class=", "template: \n    <div class=")
        content = content.replace("    </div>\n  \n})", "    </div>\n  \n})")
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)

print("Fixed templates")
