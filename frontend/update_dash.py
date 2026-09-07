import json
import re

file_path = r'D:\Vendor Reliability Intelligence Platform\frontend\src\app\features\dashboard\dashboard-data.ts'
text = open(file_path, 'r', encoding='utf-8').read()

auditor_block = '''  auditor: {
    label: "Auditor", initials: "LH", name: "Layla Haddad",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", route: "/dashboard", label: "Dashboard" },
          { id: "audit-overview", route: "/audit-overview", label: "Audit Overview" },
          { id: "audit-logs", route: "/audit-logs", label: "Audit Logs" },
          { id: "procurement-audit", route: "/procurement-audit", label: "Procurement Audit" },
          { id: "vendor-audit", route: "/vendor-audit", label: "Vendor Audit" },
          { id: "audit-contracts", route: "/audit-contracts", label: "Contract & Compliance" },
          { id: "audit-invoices", route: "/audit-invoices", label: "Invoice & Payment Audit" },
          { id: "risk-controls", route: "/risk-controls", label: "Risk & Controls" },
          { id: "order-delivery-audit", route: "/order-delivery-audit", label: "Order & Delivery Audit" },
          { id: "audit-communications", route: "/audit-communications", label: "Communications Review" },
          { id: "notifications", route: "/notifications", label: "Notifications" }
        ]
      },
      {
        label: "REPORTS", items: [
          { id: "audit-reports", route: "/audit-reports", label: "Audit Reports" },
          { id: "compliance-reports", route: "/compliance-reports", label: "Compliance Reports" },
          { id: "exception-reports", route: "/exception-reports", label: "Exception Reports" },
          { id: "audit-exports", route: "/audit-exports", label: "Export Reports" }
        ]
      },
      {
        label: "SETTINGS", items: [
          { id: "profile", route: "/profile", label: "Profile" },
          { id: "settings", route: "/settings", label: "System Settings" },
          { id: "help", route: "/help", label: "Help & Support" }
        ]
      }
    ]
  },'''

text = re.sub(r'  auditor: \{[\s\S]*?  \},', auditor_block, text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated dashboard config")
