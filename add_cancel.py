import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\supply_chain_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                    let btn = po.fulfillment_status !== 'Delayed'
                        ? `<button class="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded hover:bg-rose-500/40" onclick="markDelayed(${po.id})">Mark Delayed</button>`
                        : `<span class="text-xs text-slate-500 font-bold px-2 py-1">Issue Logged</span>`;'''

replacement = '''                    let btn = (po.fulfillment_status !== 'Delayed' && po.fulfillment_status !== 'Cancelled')
                        ? `<button class="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-1 rounded hover:bg-rose-500/40" onclick="markDelayed(${po.id})">Mark Delayed</button>
                           <button class="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-1 rounded hover:bg-slate-500/40" onclick="cancelOrder(${po.id})">Cancel Order</button>`
                        : `<span class="text-xs text-slate-500 font-bold px-2 py-1">${po.fulfillment_status === 'Cancelled' ? 'Cancelled' : 'Issue Logged'}</span>`;'''

content = content.replace(target, replacement)

cancel_func = '''        window.markDelayed = async function(poId) {
            try {
                await fetch(`http://127.0.0.1:8000/api/delivery/${poId}/status?status=Delayed`, {method: 'POST'});
                alert("PO marked as Delayed. Vendor score impacted and Admin notified.");
                window.location.reload();
            } catch (e) { console.error(e); }
        };

        window.cancelOrder = async function(poId) {
            if(!confirm("Are you sure you want to cancel this order?")) return;
            try {
                await fetch(`http://127.0.0.1:8000/api/delivery/${poId}/status?status=Cancelled`, {method: 'POST'});
                alert("Order has been Cancelled successfully.");
                window.location.reload();
            } catch (e) { console.error(e); }
        };'''

content = content.replace('''        window.markDelayed = async function(poId) {
            try {
                await fetch(`http://127.0.0.1:8000/api/delivery/${poId}/status?status=Delayed`, {method: 'POST'});
                alert("PO marked as Delayed. Vendor score impacted and Admin notified.");
                window.location.reload();
            } catch (e) { console.error(e); }
        };''', cancel_func)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Cancel Order feature to supply chain dashboard")
