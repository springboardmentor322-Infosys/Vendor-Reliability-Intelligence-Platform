import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\vendor_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                vendorPos.forEach(po => {
                    const prId = po.pr_id ? po.pr_id : 'N/A';
                    tbody.innerHTML += `
                        <tr class="hover:bg-white/5 transition-colors group">
                            <td class="p-3.5 border-b border-white/5 font-mono-data">PR-${prId}</td>
                            <td class="p-3.5 border-b border-white/5">
                                <p class="font-bold text-white">${po.po_number}</p>
                            </td>
                            <td class="p-3.5 border-b border-white/5 font-mono-data text-sm">$${po.total_amount ? po.total_amount.toLocaleString() : '0'}</td>
                            <td class="p-3.5 border-b border-white/5">${po.fulfillment_status}</td>
                            <td class="p-3.5 border-b border-white/5 flex gap-2">
                                <button class="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/40" onclick="uploadInvoice(${po.id})">Upload Invoice</button>
                                <button class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/40" onclick="updateDelivery(${po.id})">Mark Delivered</button>
                            </td>
                        </tr>
                    `;
                });'''

replacement = '''                vendorPos.forEach(po => {
                    const prId = po.pr_id ? po.pr_id : 'N/A';
                    tbody.innerHTML += `
                        <tr class="hover:bg-white/5 transition-colors group">
                            <td class="p-3.5 border-b border-white/5 font-mono-data">PR-${prId}</td>
                            <td class="p-3.5 border-b border-white/5">
                                <p class="font-bold text-white">${po.po_number}</p>
                            </td>
                            <td class="p-3.5 border-b border-white/5 font-mono-data text-sm">$${po.total_amount ? po.total_amount.toLocaleString() : '0'}</td>
                            <td class="p-3.5 border-b border-white/5">${po.fulfillment_status}</td>
                            <td class="p-3.5 border-b border-white/5 flex gap-2">
                                <button class="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/40" onclick="uploadInvoice(${po.id})">Upload Invoice</button>
                                <button class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/40" onclick="updateDelivery(${po.id})">Mark Delivered</button>
                            </td>
                        </tr>
                    `;
                });
                if(vendorPos.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-white/40">No purchase orders assigned to you yet.</td></tr>';
                }'''

content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added empty state for PO table")
