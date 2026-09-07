filepath = r'd:\Vendor Reliability Intelligence Platform\frontend\src\app\features\reports\reports.component.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: c.value -> c.count for movement_overview series (line ~699)
old = "series: res.movement_overview.map((c: any) => c.value),"
new = "series: res.movement_overview.map((c: any) => c.count),"
if old in content:
    content = content.replace(old, new)
    print("Fixed c.value -> c.count")
else:
    print("WARNING: c.value pattern not found")

# Fix 2: Remove sparkline and update colors to match dashboard exactly
old2 = "chart: { type: 'donut', height: 280, sparkline: { enabled: true } },"
new2 = "chart: { type: 'donut', height: 260 },"
if old2 in content:
    content = content.replace(old2, new2)
    print("Fixed sparkline removed from overviewChart")
else:
    print("WARNING: sparkline pattern not found - searching...")
    idx = content.find("overviewChart = {")
    print("overviewChart block starts at char:", idx)
    print(content[idx:idx+300])

# Fix 3: Update colors for movement_overview to match 7-color dashboard palette
old3 = "colors: ['#3b82f6', '#f59e0b', '#10b981'],"
new3 = "colors: ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#cbd5e1', '#f97316', '#14b8a6', '#ec4899'],"
content = content.replace(old3, new3, 1)
print("Updated movement_overview colors to 10-color palette")

# Fix 4: Update legend to show at bottom like dashboard
old4 = "legend: { show: false }"
new4 = "legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '12px' }"
if old4 in content:
    content = content.replace(old4, new4, 1)
    print("Fixed overviewChart legend to show at bottom")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved successfully.")
