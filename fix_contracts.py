import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\contracts.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the Renew button onclick
target_btn = '''<button onclick="alert('Renew contract flow...')" class="bg-${warningColor}-500/10 hover:bg-${warningColor}-500/20 text-${warningColor}-400 border border-${warningColor}-500/20 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all">'''
replacement_btn = '''<button onclick="renewContract(${c.id})" class="bg-${warningColor}-500/10 hover:bg-${warningColor}-500/20 text-${warningColor}-400 border border-${warningColor}-500/20 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all">'''
content = content.replace(target_btn, replacement_btn)

# 2. Add renewContract function
js_to_add = '''
    async function renewContract(contractId) {
        if(!confirm("Are you sure you want to renew this contract for 1 year?")) return;
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/contracts/${contractId}/renew`, {
                method: 'POST',
                headers: {'Authorization': `Bearer ${token}`}
            });
            if(res.ok) {
                alert("okk");
                loadContracts();
            } else {
                alert("Failed to renew");
            }
        } catch(err) {
            console.error(err);
        }
    }
'''

if 'renewContract(' not in content:
    content = content.replace('function openUploadContractModal() {', js_to_add + '\n    function openUploadContractModal() {')

# 3. Update submitUploadContract alert
target_upload = '''            await fetch(`http://127.0.0.1:8000/api/contracts/${id}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ document_url: file })
            });
            closeUploadContractModal();'''

replacement_upload = '''            await fetch(`http://127.0.0.1:8000/api/contracts/${id}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ document_url: file })
            });
            alert("okk update uploaded techno vendor pls check");
            closeUploadContractModal();'''
content = content.replace(target_upload, replacement_upload)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed contracts.html for renew and upload alerts")
