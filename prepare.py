import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\supply_chain_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Export Button
export_btn_old = '''<button onclick="exportReport()" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                <span class="material-symbols-outlined">analytics</span> Advanced Analytics Export
            </button>'''
export_btn_new = '''<button onclick="exportReport(event)" class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 border-none" style="color: #ffffff !important;">
                <span class="material-symbols-outlined" style="color: #ffffff !important;">analytics</span> Advanced Analytics Export
            </button>'''
content = content.replace(export_btn_old, export_btn_new)

# 2. Fix KPI Cards
kpis_old = '''        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-blue-500">groups</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Total Spending</h3>
            </div>
            <p class="text-4xl font-black text-blue-400" id="kpi-active-vendors">0</p>
            <p class="text-[10px] text-blue-500/80 mt-2 font-mono-data">Registered & approved</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-emerald-500">speed</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Avg Reliability Score</h3>
            </div>
            <p class="text-4xl font-black text-emerald-400" id="kpi-avg-reliability">0%</p>
            <p class="text-[10px] text-emerald-500/80 mt-2 font-mono-data">Platform-wide average</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-rose-500">warning</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Critical Risk Count</h3>
            </div>
            <p class="text-4xl font-black text-rose-400" id="kpi-critical-risk">0</p>
            <p class="text-[10px] text-rose-500/80 mt-2 font-mono-data">Score < 50</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-amber-500">gavel</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Open Disputes</h3>
            </div>
            <p class="text-4xl font-black text-amber-400" id="kpi-open-disputes">0</p>
            <p class="text-[10px] text-amber-500/80 mt-2 font-mono-data">Pending resolution</p>
        </div>'''

# wait, in supply_chain_dashboard, the labels are "Pending Deliveries", "Avg Reliability Score" in the screenshot!
# Let's just blindly replace them.
kpis_new = '''        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-blue-500">local_shipping</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Total Deliveries</h3>
            </div>
            <p class="text-4xl font-black text-blue-400" id="kpi-pending-deliveries">0</p>
            <p class="text-[10px] text-blue-500/80 mt-2 font-mono-data">All purchase orders</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-emerald-500">inventory_2</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">In Transit</h3>
            </div>
            <p class="text-4xl font-black text-emerald-400" id="kpi-in-transit">0</p>
            <p class="text-[10px] text-emerald-500/80 mt-2 font-mono-data">Currently shipping</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-rose-500">warning</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Delayed Orders</h3>
            </div>
            <p class="text-4xl font-black text-rose-400" id="kpi-delayed-orders">0</p>
            <p class="text-[10px] text-rose-500/80 mt-2 font-mono-data">Needs attention</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-amber-500">check_circle</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Completed</h3>
            </div>
            <p class="text-4xl font-black text-amber-400" id="kpi-completed-deliveries">0</p>
            <p class="text-[10px] text-amber-500/80 mt-2 font-mono-data">Successfully delivered</p>
        </div>'''

# We need to find the actual KPI HTML in supply_chain_dashboard to replace it exactly.
