import os
import re

file_path = r"d:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit\auditor-dashboard.component.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if "template: \n" == lines[i] or "template: \r\n" == lines[i] or "template: " in lines[i] and "<div" not in lines[i]:
        if "template:" in lines[i] and "template: " not in lines[i]:
            lines[i] = "  template: \n"
    elif "template:\n" == lines[i] or "template:\r\n" == lines[i]:
        lines[i] = "  template: \n"
        
    if "})\n" == lines[i] or "})\r\n" == lines[i]:
        lines[i-1] = "  \n"

# wait, there's another case where template starts with 	emplate: <div on the same line
for i in range(len(lines)):
    if "template:" in lines[i] and "<" in lines[i] and "" not in lines[i]:
        lines[i] = lines[i].replace("template: ", "template: \n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed backticks in dashboard.")
