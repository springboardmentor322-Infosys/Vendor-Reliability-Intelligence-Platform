import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\supply_chain_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace PR Engine button
target_btn = '''<a href="procurement_requests.html" class="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                <span class="material-symbols-outlined">shopping_cart</span> PR Engine
            </a>'''
replacement_btn = '''<a href="#orders-table" class="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                <span class="material-symbols-outlined">local_shipping</span> Delivery Tracking
            </a>'''
content = content.replace(target_btn, replacement_btn)

# Replace table section
target_table = '''    <section class="glass-panel p-6 rounded-2xl border border-white/10 mt-8">
        <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-base text-white flex items-center gap-2">
                <span class="material-symbols-outlined text-indigo-400">receipt_long</span>
                Recent Transaction Feed
            </h3>
        </div>
        <div class="overflow-x-auto rounded-xl border border-white/10">
            <table class="w-full text-left text-xs font-sans">
                <thead class="bg-white/5 text-tertiary-fixed-dim uppercase font-mono-data text-[10px] border-b border-white/10">
                    <tr>
                        <th class="p-3.5">Vendor Name</th>
                        <th class="p-3.5">Action / Type</th>
                        <th class="p-3.5">Date</th>
                        <th class="p-3.5">Status</th>
                    </tr>
                </thead>
                <tbody id="transactions-table-body" class="divide-y divide-white/5 text-tertiary-fixed-dim">
                    <!-- Dynamic data will be injected here -->
                </tbody>
            </table>
        </div>
    </section>'''

replacement_table = '''    <section id="orders-table" class="glass-panel p-6 rounded-2xl border border-white/10 mt-8">
        <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-base text-white flex items-center gap-2">
                <span class="material-symbols-outlined text-indigo-400">local_shipping</span>
                Active Purchase Orders & Deliveries
            </h3>
        </div>
        <div class="overflow-x-auto rounded-xl border border-white/10">
            <table class="w-full text-left text-xs font-sans">
                <thead class="bg-white/5 text-tertiary-fixed-dim uppercase font-mono-data text-[10px] border-b border-white/10">
                    <tr>
                        <th class="p-3.5">PO Number</th>
                        <th class="p-3.5">Vendor</th>
                        <th class="p-3.5">Fulfillment Status</th>
                        <th class="p-3.5">Actions</th>
                    </tr>
                </thead>
                <tbody id="vendors-table-body" class="divide-y divide-white/5 text-tertiary-fixed-dim">
                    <!-- Dynamic data will be injected here -->
                </tbody>
            </table>
        </div>
    </section>'''

content = content.replace(target_table, replacement_table)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed table and buttons in supply_chain_dashboard.html")
