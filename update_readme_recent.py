import os

readme_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\README.md'

with open(readme_path, 'r', encoding='utf-8') as f:
    content = f.read()

recent_enhancements = """## 🚀 Recent Enhancements
- **Global Communication Hub**: In-app pop-up Chat modals injected across all dashboards to allow seamless communication regarding Procurement Requests, POs, Contracts, and Vendors without navigating away from the active page. A global Chat icon was added to the main navigation bar.
- **Smart Notification Modals**: Replaced standalone notification pages with interactive pop-up Notification modals inside the navigation bar across all dashboards.
- **Advanced Finance Budgeting & Analytics**: Rebuilt the Finance Dashboard to include a fully dynamic, database-backed Budget Management tool. Finance Officers can now define departmental budgets, instantly track utilization on progress bars, and download specialized Procurement Expenditure Reports (CSV/Excel).
- **Interactive Procurement Workflows**: Wired up functional "Approve" and "Reject" workflows inside the Finance Dashboard, which auto-generate Purchase Orders and update budgets in real-time. Added capabilities to view and download associated invoice documents dynamically.
- **Disputes Evidence System**: Expanded the Contract/Disputes database to support securely uploading and tracking `evidence_url` documents directly within the Vendor Intel system.

---

"""

if '## 🚀 Recent Enhancements' not in content:
    content = content.replace('## 📖 Milestone Documentation', recent_enhancements + '## 📖 Milestone Documentation')
    
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("README.md updated successfully.")
else:
    print("README.md already updated.")
