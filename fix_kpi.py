import re

file = r'D:\Vendor Reliability Intelligence Platform\backend\app\modules\analytics\router.py'
content = open(file, 'r', encoding='utf-8').read()

# Replace audit_coverage logic
content = content.replace('"audit_coverage": 87.5,', '"audit_tracking": await db.scalar(select(func.count(AuditLog.id))) or 0,')
content = content.replace('"audit_tracking": 100,', '"audit_tracking": await db.scalar(select(func.count(AuditLog.id))) or 0,')

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

ui_file = r'D:\Vendor Reliability Intelligence Platform\frontend\src\app\features\audit\auditor-dashboard.component.ts'
ui = open(ui_file, 'r', encoding='utf-8').read()
ui = ui.replace("{ label: 'Audit Coverage', value: k.audit_coverage + '%', color: 'text-blue-700', sub: 'Est coverage rate', link: \"/audit-overview\", icon: \"🔍\" }", "{ label: 'Audit Events', value: k.audit_tracking, color: 'text-blue-700', sub: 'Logged system events', link: \"/audit-logs\", icon: \"🔍\" }")
ui = ui.replace("{ label: 'Audit Coverage', value: k.audit_tracking + '%', color: 'text-blue-700', sub: 'Est coverage rate', link: \"/audit-overview\", icon: \"🔍\" }", "{ label: 'Audit Events', value: k.audit_tracking, color: 'text-blue-700', sub: 'Logged system events', link: \"/audit-logs\", icon: \"🔍\" }")

with open(ui_file, 'w', encoding='utf-8') as f:
    f.write(ui)
