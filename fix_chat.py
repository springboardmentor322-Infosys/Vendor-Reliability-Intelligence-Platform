import os

files = [
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\vendor_dashboard.html',
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\supply_chain_dashboard.html',
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\finance_dashboard.html'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix chat-modal-title
    content = content.replace('document.getElementById(\'chat-modal-title\').innerText = ${entityType} # Communication;', 'document.getElementById(\'chat-modal-title\').innerText = `${entityType} #${entityId} Communication`;')
    
    # Fix fetch threads URL
    content = content.replace('const res = await fetch(http://127.0.0.1:8000/api/threads//, {', 'const res = await fetch(`http://127.0.0.1:8000/api/threads/${entityType}/${entityId}`, {')
    
    # Fix Bearer token
    content = content.replace('headers: { \'Authorization\': Bearer  }', 'headers: { \'Authorization\': `Bearer ${token}` }')
    
    # Fix html template string in renderMessages
    content = content.replace('''container.innerHTML += 
                <div class="mb-3 flex ">
                    <div class=" p-3 rounded-xl max-w-[80%]">
                        <p class="text-xs text-white"></p>
                        <p class="text-[9px]  mt-1 text-right"></p>
                    </div>
                </div>
            ;''', '''container.innerHTML += `
                <div class="mb-3 flex ${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="${isMe ? 'bg-indigo-600' : 'bg-[#1e293b] border border-white/10'} p-3 rounded-xl max-w-[80%]">
                        <p class="text-xs text-white">${m.content}</p>
                        <p class="text-[9px] ${isMe ? 'text-indigo-200' : 'text-slate-400'} mt-1 text-right">${new Date(m.timestamp).toLocaleTimeString()}</p>
                    </div>
                </div>
            `;''')

    # Fix post messages fetch
    content = content.replace('const res = await fetch(http://127.0.0.1:8000/api/threads//messages, {', 'const res = await fetch(`http://127.0.0.1:8000/api/threads/${currentThreadId}/messages`, {')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed " + file_path)
