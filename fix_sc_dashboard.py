import os
import re

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\supply_chain_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the KPI cards HTML
target_cards = '''<div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-blue-500">groups</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Pending Deliveries</h3>
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

replacement_cards = '''<div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-blue-500">local_shipping</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Total Orders</h3>
            </div>
            <p class="text-4xl font-black text-blue-400" id="kpi-pending-deliveries">0</p>
            <p class="text-[10px] text-blue-500/80 mt-2 font-mono-data">All purchase orders</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-emerald-500">directions_boat</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">In Transit</h3>
            </div>
            <p class="text-4xl font-black text-emerald-400" id="kpi-in-transit">0</p>
            <p class="text-[10px] text-emerald-500/80 mt-2 font-mono-data">Currently shipping</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-rose-500">schedule</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Delayed Orders</h3>
            </div>
            <p class="text-4xl font-black text-rose-400" id="kpi-delayed-orders">0</p>
            <p class="text-[10px] text-rose-500/80 mt-2 font-mono-data">Requires attention</p>
        </div>
        <div class="glass-widget p-6 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-amber-500">inventory_2</span>
                <h3 class="font-bold text-sm text-tertiary-fixed-dim">Completed Deliveries</h3>
            </div>
            <p class="text-4xl font-black text-amber-400" id="kpi-completed-deliveries">0</p>
            <p class="text-[10px] text-amber-500/80 mt-2 font-mono-data">Successfully received</p>
        </div>'''

content = content.replace(target_cards, replacement_cards)

# 2. Fix the export button
target_export = '''<button onclick="exportReport()" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                <span class="material-symbols-outlined">analytics</span> Advanced Analytics Export
            </button>'''
replacement_export = '''<button onclick="exportReport(event)" class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 border-none" style="color: #ffffff !important;">
                <span class="material-symbols-outlined" style="color: #ffffff !important;">analytics</span> Advanced Analytics Export
            </button>'''
content = content.replace(target_export, replacement_export)

# 3. Add Export Function JS
export_js = '''
    function exportReport(event) {
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = <span class="material-symbols-outlined animate-spin" style="color: #ffffff !important;">progress_activity</span> Exporting...;
        
        fetch('http://127.0.0.1:8000/api/v1/reports/pdf')
        .then(response => {
            if(!response.ok) throw new Error('Failed to generate report');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'platform_report.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(err => {
            console.error(err);
            alert('Error generating report.');
        })
        .finally(() => {
            btn.innerHTML = originalHtml;
        });
    }

    document.addEventListener('DOMContentLoaded', fetchUnreadCount);
'''
content = content.replace("document.addEventListener('DOMContentLoaded', fetchUnreadCount);", export_js)

# 4. Add Chart Logic to JS
chart_js = '''
                    tbody.innerHTML += 
                        <tr class="hover:bg-white/5 transition-colors group">
                            <td class="p-3.5 border-b border-white/5">
                                <p class="font-bold text-white"> </p>
                            </td>
                            <td class="p-3.5 border-b border-white/5 font-mono-data text-sm">Vendor </td>
                            <td class="p-3.5 border-b border-white/5"></td>
                            <td class="p-3.5 border-b border-white/5 flex items-center gap-2">
                                
                                <button class="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/40 flex items-center gap-1" onclick="openChatModal('PurchaseOrder', )"><span class="material-symbols-outlined text-[10px]">chat</span> Chat</button>
                            </td>
                        </tr>
                    ;
                });
            }

            // Fetch and render charts dynamically
            const chartData = await fetch('http://127.0.0.1:8000/api/dashboard/charts').then(res => res.json());

            const trendCtx = document.getElementById('trendChart');
            if (trendCtx) {
                new Chart(trendCtx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: chartData.trend_labels,
                        datasets: [
                            {
                                label: 'Spending Reliability',
                                data: chartData.reliability_data,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'Invoice Quality',
                                data: chartData.quality_data,
                                borderColor: '#8b5cf6',
                                backgroundColor: 'transparent',
                                borderDash: [5, 5],
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { labels: { color: '#94a3b8' } }
                        },
                        scales: {
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                        }
                    }
                });
            }

            const riskCtx = document.getElementById('riskChart');
            if (riskCtx) {
                new Chart(riskCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Low Risk', 'Moderate Risk', 'High Risk'],
                        datasets: [{
                            data: [
                                chartData.risk_distribution.Low,
                                chartData.risk_distribution.Moderate,
                                chartData.risk_distribution.High
                            ],
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '75%',
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20 } }
                        }
                    }
                });
            }
'''

content = re.sub(
    r"tbody\.innerHTML \+= (.*?)<button class=\"text-\[10px\] bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/40 flex items-center gap-1\" onclick=\"openChatModal\('PurchaseOrder', \\)\"><span class=\"material-symbols-outlined text-\[10px\]\">chat</span> Chat</button>\n                            </td>\n                        </tr>\n                    ;\n                }\);\n            }",
    chart_js, content, flags=re.DOTALL
)

# 5. Fix PO action buttons ("cancel or nice order" -> cancel or receive order)
# Let's add multiple actions for Supply Chain
po_actions_logic = '''let btn = po.fulfillment_status !== 'Delayed'
                        ? <button class="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded hover:bg-rose-500/40" onclick="markDelayed()">Delay</button>
                        : <span class="text-xs text-slate-500 font-bold px-2 py-1">Logged</span>;
                    
                    if(po.fulfillment_status === 'Pending') {
                        btn +=  <button class="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded hover:bg-amber-500/40" onclick="updateDelivery(, 'Cancelled')">Cancel</button>;
                    } else if(po.fulfillment_status === 'Shipped') {
                        btn +=  <button class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/40" onclick="updateDelivery(, 'Delivered')">Receive</button>;
                    }
'''
content = re.sub(r"let btn = po\.fulfillment_status !== 'Delayed'.*?: <span class=\"text-xs text-slate-500 font-bold px-2 py-1\">Issue Logged</span>;", po_actions_logic, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated supply_chain_dashboard.html")
