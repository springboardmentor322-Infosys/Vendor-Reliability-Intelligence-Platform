import sys

file_path = r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\dashboard\\dashboard-data.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# I will replace the finance block directly.
# The user wants:
'''
MAIN MENU
1. Dashboard
2. Financial Overview
3. Budget & Forecasting
4. Purchase Orders
5. Invoices & Payments
6. Vendors
7. Cost Analysis
8. Spend Analysis
9. Tax & Compliance
10. Financial Reports
11. Approvals
12. Payment Tracking
13. Audit & Controls

ACCOUNT / SETTINGS
14. Profile
15. Settings
16. Help & Support
17. Logout
'''

old_finance = '''  finance: {
    label: "Finance Officer", initials: "FO", name: "Finance Officer",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", label: "Dashboard", route: "/dashboard" },
          { id: "finance-overview", label: "Financial Overview", route: "/finance-overview" },
          { id: "finance-budget", label: "Budget & Forecasting", route: "/finance-budget" },
          { id: "pos", label: "Purchase Orders", route: "/pos" },
          { id: "finance-invoices", label: "Invoices & Payments", route: "/finance-invoices" },
          { id: "finance-vendors", label: "Vendors", route: "/finance-vendors" },
          { id: "finance-cost-analysis", label: "Cost Analysis", route: "/finance-cost-analysis" },
          { id: "finance-spend-analysis", label: "Spend Analysis", route: "/finance-spend-analysis" },
          { id: "finance-tax", label: "Tax & Compliance", route: "/finance-tax" },
          { id: "finance-reports", label: "Financial Reports", route: "/finance-reports" },
          { id: "finance-approvals", label: "Approvals", route: "/finance-approvals" },
          { id: "finance-payments", label: "Payment Tracking", route: "/finance-payments" },
          { id: "finance-audit", label: "Audit & Controls", route: "/finance-audit" }
        ]
      },
      {
        label: "SETTINGS", items: [
          { id: "notifications", label: "Notifications", route: "/notifications" }
        ]
      }
    ]
  },'''

new_finance = '''  finance: {
    label: "Finance Officer", initials: "FO", name: "Finance Officer",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", label: "Dashboard", route: "/dashboard" },
          { id: "finance-overview", label: "Financial Overview", route: "/finance-overview" },
          { id: "finance-budget", label: "Budget & Forecasting", route: "/finance-budget" },
          { id: "pos", label: "Purchase Orders", route: "/pos" },
          { id: "finance-invoices", label: "Invoices & Payments", route: "/finance-invoices" },
          { id: "finance-vendors", label: "Vendors", route: "/finance-vendors" },
          { id: "finance-cost-analysis", label: "Cost Analysis", route: "/finance-cost-analysis" },
          { id: "finance-spend-analysis", label: "Spend Analysis", route: "/finance-spend-analysis" },
          { id: "finance-tax", label: "Tax & Compliance", route: "/finance-tax" },
          { id: "finance-reports", label: "Financial Reports", route: "/finance-reports" },
          { id: "finance-approvals", label: "Approvals", route: "/finance-approvals" },
          { id: "finance-payments", label: "Payment Tracking", route: "/finance-payments" },
          { id: "finance-audit", label: "Audit & Controls", route: "/finance-audit" }
        ]
      },
      {
        label: "ACCOUNT / SETTINGS", items: [
          { id: "profile", label: "Profile", route: "/profile" },
          { id: "settings", label: "Settings", route: "/settings" },
          { id: "support", label: "Help & Support", route: "/support" }
        ]
      }
    ]
  },'''

if old_finance in text:
    text = text.replace(old_finance, new_finance)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced finance map successfully")
else:
    print("Could not find the exact old_finance string.")
