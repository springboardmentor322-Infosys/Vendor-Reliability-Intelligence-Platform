import os

files = [
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\vendor_dashboard.html',
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\supply_chain_dashboard.html',
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\finance_dashboard.html'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix syntax errors in submitChatMessage
    content = content.replace("headers: { 'Content-Type': 'application/json', 'Authorization': Bearer  },", "headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed " + file_path)
