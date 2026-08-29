import os
import glob
import re

directory = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend'
html_files = glob.glob(os.path.join(directory, '*.html'))

old_script_pattern = re.compile(r'<script>\s*let lastNotifId = localStorage\.getItem\(\'lastNotifId\'\) \|\| 0;[\s\S]*?setInterval\(fetchUnreadCount, 10000\);\s*\}\);\s*</script>', re.MULTILINE)

new_script = '''<script>
let lastNotifId = null;

function showToast(title, message, severity) {
    const toast = document.createElement('div');
    const borderClass = severity === 'Critical' ? 'border-rose-500' : 'border-blue-500';
    const iconClass = severity === 'Critical' ? 'text-rose-500' : 'text-blue-500';
    
    toast.className = `fixed bottom-4 right-4 max-w-sm w-full bg-slate-900/90 backdrop-blur-md shadow-2xl rounded-xl border-l-4 p-4 z-50 transform transition-all duration-300 translate-y-full opacity-0 ${borderClass}`;
    toast.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex gap-3">
                <span class="material-symbols-outlined ${iconClass}">notifications_active</span>
                <div>
                    <h4 class="text-sm font-bold text-white">${title}</h4>
                    <p class="text-xs text-slate-300 mt-1">${message}</p>
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-white"><span class="material-symbols-outlined text-sm">close</span></button>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-full');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

async function fetchUnreadCount() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        if(!token) return;
        const res = await fetch('http://localhost:8000/api/intelligence/notifications', { headers: { 'Authorization': 'Bearer ' + token }});
        if(res.ok) {
            const notifs = await res.json();
            const unread = notifs.filter(n => !n.is_read).length;
            const badge = document.getElementById('global-notif-badge');
            if(badge && unread > 0) {
                badge.textContent = unread;
                badge.classList.remove('hidden');
            }
            
            if (notifs.length > 0) {
                const latestId = Math.max(...notifs.map(n => n.id));
                if (lastNotifId === null) {
                    lastNotifId = latestId; // Initialize on first fetch
                } else if (latestId > lastNotifId) {
                    const newNotifs = notifs.filter(n => n.id > lastNotifId);
                    newNotifs.forEach(n => showToast(n.title, n.message, n.severity));
                    lastNotifId = latestId;
                }
            }
        }
    } catch(e) {}
}
document.addEventListener('DOMContentLoaded', () => {
    fetchUnreadCount();
    setInterval(fetchUnreadCount, 10000);
});
</script>'''

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_script_pattern.search(content):
        new_content = old_script_pattern.sub(new_script, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(file_path)}")
    else:
        print(f"Could not find old script in {os.path.basename(file_path)}")
