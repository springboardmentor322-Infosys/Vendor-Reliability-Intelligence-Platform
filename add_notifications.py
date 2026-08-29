import os
import glob

directory = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend'
html_files = glob.glob(os.path.join(directory, '*.html'))

notif_link = '''<a href="notifications.html" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-tertiary-fixed-dim light:text-slate-700 hover:text-white light:hover:text-blue-600 px-3 py-2 transition-colors relative">
    <span class="material-symbols-outlined text-sm">notifications</span> Notifications
    <span id="global-notif-badge" class="absolute top-1 right-1 bg-rose-500 text-white text-[8px] px-1 rounded-full hidden">0</span>
</a>'''

notif_script = '''
<script>
let lastNotifId = localStorage.getItem('lastNotifId') || 0;

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
        const token = localStorage.getItem('token');
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
                if (latestId > lastNotifId) {
                    if (lastNotifId != 0) {
                        const newNotifs = notifs.filter(n => n.id > lastNotifId);
                        newNotifs.forEach(n => showToast(n.title, n.message, n.severity));
                    }
                    lastNotifId = latestId;
                    localStorage.setItem('lastNotifId', lastNotifId);
                }
            }
        }
    } catch(e) {}
}
document.addEventListener('DOMContentLoaded', () => {
    fetchUnreadCount();
    setInterval(fetchUnreadCount, 10000);
});
</script>
</body>
'''

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Inject link if not already present
    if 'href="notifications.html"' not in content and 'onclick="localStorage.clear()"' in content:
        content = content.replace(
            '<a href="login.html" onclick="localStorage.clear()"', 
            notif_link + '\n            <a href="login.html" onclick="localStorage.clear()"'
        )
        modified = True

    # Inject script if not already present
    if 'fetchUnreadCount' not in content and '</body>' in content:
        content = content.replace('</body>', notif_script)
        modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {file_path}')
