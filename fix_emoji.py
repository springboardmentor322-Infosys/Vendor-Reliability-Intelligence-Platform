import os
import re

file_path = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit\auditor-dashboard.component.ts"
content = open(file_path, 'r', encoding='utf-8', errors='ignore').read()

# Replace any garbled characters or replace specific text
content = re.sub(r'Resolve Exceptions[^<]*</a>', 'Resolve Exceptions -&gt;</a>', content)
content = re.sub(r'View Contracts[^<]*</a>', 'View Contracts -&gt;</a>', content)
content = re.sub(r'System Logs[^<]*</a>', 'System Logs -&gt;</a>', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed emojis.")
