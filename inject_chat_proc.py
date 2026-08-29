import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\procurement_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Only inject if not already present
if 'id="chat-modal"' not in content:
    chat_modal = """
<!-- Chat Modal -->
<div id="chat-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="glass-panel w-full max-w-lg rounded-2xl relative flex flex-col h-[600px] max-h-[90vh]">
        <div class="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
            <h2 class="text-lg font-bold flex items-center gap-2 text-white"><span class="material-symbols-outlined text-indigo-400">forum</span> <span id="chat-modal-title">Communication</span></h2>
            <button onclick="closeChatModal()" class="text-tertiary-fixed-dim hover:text-white transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-2">
            <!-- Messages go here -->
        </div>
        <div class="p-4 border-t border-white/10 bg-[#0f172a]/50 rounded-b-2xl">
            <form onsubmit="submitChatMessage(event)" class="flex gap-2">
                <input type="text" id="chat-input" required class="flex-1 bg-[#1e293b] border border-white/20 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Type your message...">
                <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl transition-colors font-bold flex items-center justify-center">
                    <span class="material-symbols-outlined">send</span>
                </button>
            </form>
        </div>
    </div>
</div>

<script>
    let currentEntityType = null;
    let currentEntityId = null;
    let currentThreadId = null;

    async function openChatModal(entityType, entityId) {
        currentEntityType = entityType;
        currentEntityId = entityId;
        document.getElementById('chat-modal-title').innerText = `${entityType} #${entityId} Communication`;
        document.getElementById('chat-messages').innerHTML = '<p class="text-xs text-slate-400 italic">Loading messages...</p>';
        document.getElementById('chat-modal').classList.remove('hidden');
        
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/threads/${entityType}/${entityId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const thread = await res.json();
            currentThreadId = thread.id;
            renderMessages(thread.messages || []);
        } catch(e) {
            console.error(e);
            document.getElementById('chat-messages').innerHTML = '<p class="text-xs text-rose-400 italic">Failed to load thread</p>';
        }
    }

    function closeChatModal() {
        document.getElementById('chat-modal').classList.add('hidden');
    }

    function renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        const currentUserId = parseInt(localStorage.getItem('userId'), 10);
        container.innerHTML = '';
        if (messages.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic">No messages yet.</p>';
            return;
        }
        messages.forEach(m => {
            const isMe = m.sender_id === currentUserId;
            container.innerHTML += `
                <div class="mb-3 flex ${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="${isMe ? 'bg-indigo-600' : 'bg-[#1e293b] border border-white/10'} p-3 rounded-xl max-w-[80%]">
                        <p class="text-xs text-white">${m.content}</p>
                        <p class="text-[9px] ${isMe ? 'text-indigo-200' : 'text-slate-400'} mt-1 text-right">${new Date(m.timestamp).toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        });
        container.scrollTop = container.scrollHeight;
    }

    async function submitChatMessage(e) {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if(!content || !currentThreadId) return;

        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/threads/${currentThreadId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ content })
            });
            input.value = '';
            openChatModal(currentEntityType, currentEntityId);
        } catch(err) {
            console.error(err);
        }
    }
</script>
</body>"""
    content = content.replace('</body>', chat_modal)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected chat box into procurement dashboard.")
else:
    print("Chat box already present in procurement dashboard.")
