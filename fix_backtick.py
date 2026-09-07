import os
import glob
import re

base_dir = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit"
files = glob.glob(os.path.join(base_dir, "*.component.ts"))

for f_path in files:
    if "auditor-dashboard" in f_path: continue
    
    content = open(f_path, 'r', encoding='utf-8').read()
    
    # Fix the missing backticks: search for 'template: ' followed by whitespaces and '<div'
    content = re.sub(r'template:\s+<div', 'template: \n    <div', content)
    
    # Fix the end: search for '</div>\n})' or '</div>\r\n})'
    content = re.sub(r'</div>\s+?}\)', '</div>\n  \n})', content)
    
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Backticks definitively added.")
