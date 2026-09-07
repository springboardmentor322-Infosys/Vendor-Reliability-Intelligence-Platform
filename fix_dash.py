import os

f_path = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit\auditor-dashboard.component.ts"
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("template: ")
end_idx = content.find("\n})", start_idx)

if start_idx == -1 or end_idx == -1:
    start_idx = content.find("template: \n")
    if start_idx == -1: start_idx = content.find("template: \r\n")

if start_idx == -1 or end_idx == -1:
    start_idx = content.find("template: \n")
    end_idx = content.rfind("\n})\n")

if start_idx != -1 and end_idx != -1:
    start_str = content[:start_idx]
    end_str = content[end_idx:]
    
    html_content = content[start_idx+10:end_idx]
    
    # Clean up backticks
    html_content = html_content.strip('').strip()
    
    html_file = f_path.replace('.ts', '.html')
    with open(html_file, 'w', encoding='utf-8') as hf:
        hf.write(html_content)
    
    # Update TS file
    ts_content = start_str + f"templateUrl: './auditor-dashboard.component.html'\n" + end_str
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

print("Dashboard migrated successfully.")
