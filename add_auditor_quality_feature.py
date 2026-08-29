import re
import os

MAIN_PY_PATH = r"c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\main.py"
DASH_PATH = r"c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\auditor_dashboard.html"

with open(MAIN_PY_PATH, "r", encoding="utf-8") as f:
    main_content = f.read()

# Add Schema
schema_code = """
class QualityAlertCreate(BaseModel):
    vendor_id: int
    issue_description: str
"""
if "class QualityAlertCreate" not in main_content:
    main_content = main_content.replace(
        "class DisputeCreate(BaseModel):",
        schema_code + "\nclass DisputeCreate(BaseModel):"
    )

# Add Endpoint
endpoint_code = """
@app.post("/api/intelligence/notify_quality", tags=["Auditor"])
def notify_quality_issue(alert: QualityAlertCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_read_only_and_above)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == alert.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    # Find all admins and procumentors
    target_users = db.query(models.User).filter(models.User.role.in_(["admin", "procumentor"])).all()
    for u in target_users:
        n = models.Notification(
            user_id=u.id,
            type="Quality Alert",
            title=f"Quality Issue: {vendor.company_name}",
            message=alert.issue_description,
            severity="Critical"
        )
        db.add(n)
        
    services.AuditService.log_action(db, f"Auditor reported quality issue for Vendor {vendor.company_name}", "Vendor", vendor.id, current_user.id)
    db.commit()
    return {"success": True, "message": "Notification sent to Admin and Procurement teams"}
"""
if "/api/intelligence/notify_quality" not in main_content:
    main_content = main_content.replace(
        "@app.get(\"/api/intelligence/notifications\")",
        endpoint_code + "\n@app.get(\"/api/intelligence/notifications\")"
    )

with open(MAIN_PY_PATH, "w", encoding="utf-8") as f:
    f.write(main_content)

print("Updated backend/main.py")

# Now update auditor_dashboard.html
with open(DASH_PATH, "r", encoding="utf-8") as f:
    html_content = f.read()

modal_html = """
<!-- Quality Alert Modal -->
<div id="quality-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="glass-panel w-full max-w-md rounded-2xl p-6 relative">
        <button onclick="closeQualityModal()" class="absolute top-4 right-4 text-tertiary-fixed-dim hover:text-white transition-colors">
            <span class="material-symbols-outlined">close</span>
        </button>
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-white"><span class="material-symbols-outlined text-rose-500">warning</span> Report Quality Issue</h2>
        <form onsubmit="submitQualityAlert(event)" class="space-y-4">
            <div>
                <label class="block text-xs font-bold mb-1 text-tertiary-fixed-dim">Select Vendor</label>
                <select id="qa-vendor-id" required class="w-full bg-[#1e293b] border border-white/20 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors">
                    <option value="">Loading vendors...</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold mb-1 text-tertiary-fixed-dim">Issue Description</label>
                <textarea id="qa-description" required rows="4" class="w-full bg-white/5 border border-white/20 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors" placeholder="Describe the product quality issues..."></textarea>
            </div>
            <button type="submit" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 mt-2 flex justify-center items-center gap-2">
                <span class="material-symbols-outlined">send</span> Notify Procurement & Admin
            </button>
        </form>
    </div>
</div>
"""

js_html = """
<script>
    function openQualityModal() {
        document.getElementById('quality-modal').classList.remove('hidden');
        populateQAVendors();
    }
    function closeQualityModal() {
        document.getElementById('quality-modal').classList.add('hidden');
    }
    async function populateQAVendors() {
        const select = document.getElementById('qa-vendor-id');
        try {
            const res = await fetch('http://127.0.0.1:8000/api/vendors');
            if (res.ok) {
                const vendors = await res.json();
                select.innerHTML = vendors.map(v => `<option value="${v.id}">${v.company_name}</option>`).join('');
            }
        } catch (e) { console.error(e); }
    }
    async function submitQualityAlert(e) {
        e.preventDefault();
        const vendor_id = document.getElementById('qa-vendor-id').value;
        const issue_description = document.getElementById('qa-description').value;
        const token = localStorage.getItem('token');
        
        try {
            const res = await fetch('http://127.0.0.1:8000/api/intelligence/notify_quality', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ vendor_id: parseInt(vendor_id), issue_description })
            });
            if (res.ok) {
                alert("Notification successfully sent to Procurement and Admin teams!");
                closeQualityModal();
                document.getElementById('qa-description').value = '';
            } else {
                alert("Failed to send notification.");
            }
        } catch(err) {
            console.error(err);
        }
    }
</script>
"""

if 'id="quality-modal"' not in html_content:
    html_content = html_content.replace('<!-- Add Vendor Modal -->', modal_html + '\n<!-- Add Vendor Modal -->')
if 'function openQualityModal' not in html_content:
    html_content = html_content.replace('</body>', js_html + '\n</body>')

# Add a button in the top action bar
btn_html = """
            <button onclick="openQualityModal()" class="bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                <span class="material-symbols-outlined">report</span> Report Quality
            </button>
"""
if 'Report Quality' not in html_content:
    html_content = html_content.replace(
        '<button onclick="exportReport()" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">',
        btn_html + '\n            <button onclick="exportReport()" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">'
    )

with open(DASH_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Updated frontend/auditor_dashboard.html")
