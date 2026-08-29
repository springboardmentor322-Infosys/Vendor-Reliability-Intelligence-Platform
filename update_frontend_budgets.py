import os

dashboard_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\finance_dashboard.html'

with open(dashboard_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Total Budget KPI if not present
if 'Total Budget' not in content:
    kpi_html = """
    <section class="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <div class="glass-widget p-5 rounded-2xl flex flex-col justify-between border-b-4 border-indigo-500">
            <h3 class="font-bold text-xs text-tertiary-fixed-dim uppercase tracking-wider mb-2">Total Budget</h3>
            <p class="text-2xl font-black text-indigo-400" id="kpi-total-budget">₹0</p>
        </div>"""
    content = content.replace('<section class="grid grid-cols-2 lg:grid-cols-6 gap-4">', kpi_html)

# Map Total Budget in JS
if "document.getElementById('kpi-total-budget')" not in content:
    content = content.replace(
        "document.getElementById('kpi-total-spend').innerText =", 
        "document.getElementById('kpi-total-budget').innerText = `₹${(analytics.total_budget || 0).toLocaleString()}`;\n            document.getElementById('kpi-total-spend').innerText ="
    )

# Add Manage Budgets button
manage_btn = """
            <button onclick="openBudgetModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-xs">
                <span class="material-symbols-outlined text-[18px]">account_balance</span> Manage Budgets
            </button>
"""
if 'openBudgetModal()' not in content:
    content = content.replace(
        '<div class="mt-8 flex flex-wrap items-center gap-3">',
        '<div class="mt-8 flex flex-wrap items-center gap-3">' + manage_btn
    )

# Add Budget Modal HTML and JS
budget_modal = """
<!-- Budget Modal -->
<div id="budget-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="glass-panel w-full max-w-2xl rounded-2xl relative flex flex-col max-h-[90vh]">
        <div class="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
            <h2 class="text-lg font-bold flex items-center gap-2 text-white">
                <span class="material-symbols-outlined text-indigo-400">account_balance</span> 
                Manage Department Budgets
            </h2>
            <button onclick="document.getElementById('budget-modal').classList.add('hidden')" class="text-tertiary-fixed-dim hover:text-white transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="p-4 overflow-y-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="text-xs uppercase text-tertiary-fixed-dim border-b border-white/10">
                        <th class="p-3">Department</th>
                        <th class="p-3">Current Budget (₹)</th>
                        <th class="p-3">Action</th>
                    </tr>
                </thead>
                <tbody id="budget-table-body">
                    <!-- Loaded via JS -->
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-white/10 bg-[#0f172a]/50 flex gap-2 items-center rounded-b-2xl">
            <input type="text" id="new-dept-name" placeholder="Department (e.g. R&D)" class="bg-[#1e293b] border border-white/20 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 w-1/3">
            <input type="number" id="new-dept-limit" placeholder="Allocated Limit (₹)" class="bg-[#1e293b] border border-white/20 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 flex-1">
            <button onclick="saveBudget()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all">Add / Update</button>
        </div>
    </div>
</div>

<script>
    async function openBudgetModal() {
        document.getElementById('budget-modal').classList.remove('hidden');
        loadBudgets();
    }
    
    async function loadBudgets() {
        const tbody = document.getElementById('budget-table-body');
        tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-white/50">Loading...</td></tr>';
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('http://127.0.0.1:8000/api/budgets', { headers: { 'Authorization': `Bearer ${token}` } });
            const budgets = await res.json();
            tbody.innerHTML = '';
            budgets.forEach(b => {
                tbody.innerHTML += `
                    <tr class="border-b border-white/5 hover:bg-white/5">
                        <td class="p-3 font-bold text-white">${b.department}</td>
                        <td class="p-3 font-mono-data">₹${b.allocated_limit.toLocaleString()}</td>
                        <td class="p-3">
                            <button onclick="editBudget('${b.department}', ${b.allocated_limit})" class="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white">Edit</button>
                        </td>
                    </tr>
                `;
            });
        } catch(e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-rose-400">Failed to load</td></tr>';
        }
    }
    
    function editBudget(dept, limit) {
        document.getElementById('new-dept-name').value = dept;
        document.getElementById('new-dept-limit').value = limit;
    }
    
    async function saveBudget() {
        const dept = document.getElementById('new-dept-name').value.trim();
        const limit = parseFloat(document.getElementById('new-dept-limit').value);
        if(!dept || isNaN(limit)) return alert("Invalid inputs");
        
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('http://127.0.0.1:8000/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ department: dept, limit: limit })
            });
            if(res.ok) {
                document.getElementById('new-dept-name').value = '';
                document.getElementById('new-dept-limit').value = '';
                loadBudgets(); // reload table
                loadDashboard(); // reload main dashboard stats
            } else {
                alert("Failed to update budget");
            }
        } catch(e) {
            console.error(e);
            alert("Error updating budget");
        }
    }
</script>
"""
if 'id="budget-modal"' not in content:
    content = content.replace('</body>', budget_modal + '\n</body>')

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated frontend for budgets.")
