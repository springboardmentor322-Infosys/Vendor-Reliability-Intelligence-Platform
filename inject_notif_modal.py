import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\procurement_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace link if not already done
old_link = 'href="notifications.html"'
new_link = 'href="#" onclick="openNotificationsModal(); return false;"'
if old_link in content:
    content = content.replace(old_link, new_link)

# Only inject modal if not already present
if 'id="notif-modal"' not in content:
    notif_modal = """
<!-- Notifications Modal -->
<div id="notif-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="glass-panel w-full max-w-lg rounded-2xl relative flex flex-col h-[600px] max-h-[90vh]">
        <div class="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
            <h2 class="text-lg font-bold flex items-center gap-2 text-white">
                <span class="material-symbols-outlined text-rose-400">notifications</span> 
                Notifications
            </h2>
            <button onclick="closeNotificationsModal()" class="text-tertiary-fixed-dim hover:text-white transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div id="notif-messages" class="flex-1 overflow-y-auto p-4 space-y-3">
            <!-- Notifications go here -->
        </div>
        <div class="p-4 border-t border-white/10 bg-[#0f172a]/50 rounded-b-2xl flex justify-end">
            <button onclick="closeNotificationsModal()" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl transition-colors font-bold text-sm">Close</button>
        </div>
    </div>
</div>

<script>
    async function openNotificationsModal() {
        document.getElementById('notif-modal').classList.remove('hidden');
        document.getElementById('notif-messages').innerHTML = '<p class="text-xs text-slate-400 italic">Loading notifications...</p>';
        
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            const res = await fetch('http://127.0.0.1:8000/api/intelligence/notifications', { headers: { 'Authorization': 'Bearer ' + token }});
            if(res.ok) {
                const notifs = await res.json();
                const container = document.getElementById('notif-messages');
                container.innerHTML = '';
                if(notifs.length === 0) {
                    container.innerHTML = '<p class="text-xs text-slate-400 italic">No new notifications.</p>';
                } else {
                    // Sort descending by ID
                    notifs.sort((a,b) => b.id - a.id).forEach(n => {
                        const borderClass = n.severity === 'Critical' ? 'border-rose-500' : 'border-blue-500';
                        const iconClass = n.severity === 'Critical' ? 'text-rose-500' : 'text-blue-500';
                        
                        container.innerHTML += `
                            <div class="bg-[#1e293b] p-3 rounded-xl border-l-4 ${borderClass} shadow-md mb-2">
                                <div class="flex gap-3">
                                    <span class="material-symbols-outlined ${iconClass}">notifications_active</span>
                                    <div>
                                        <h4 class="text-sm font-bold text-white">${n.title}</h4>
                                        <p class="text-xs text-slate-300 mt-1">${n.message}</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }
            }
        } catch(e) {
            document.getElementById('notif-messages').innerHTML = '<p class="text-xs text-rose-400 italic">Failed to load notifications</p>';
        }
    }
    
    function closeNotificationsModal() {
        document.getElementById('notif-modal').classList.add('hidden');
    }
</script>
</body>"""
    content = content.replace('</body>', notif_modal)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected Notifications Modal into procurement dashboard.")
