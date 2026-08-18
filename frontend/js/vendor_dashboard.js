document.addEventListener("DOMContentLoaded", loadVendorDashboard);

async function loadVendorDashboard() {
    try {
        // 1. Get logged in user info
        const meResponse = await fetch(`/users/me`);
        if (!meResponse.ok) {
            throw new Error(`GET /users/me failed: ${meResponse.status}`);
        }
        
        const user = await meResponse.json();
        document.getElementById("welcomeHeader").innerText = `Welcome, ${user.name}`;
        
        const vendorId = user.vendor_id;
        if (!vendorId) {
            alert("No vendor profile is linked to this user account. Please contact an Administrator.");
            return;
        }
        
        // 2. Get Vendor Profile info
        const vendorResponse = await fetch(`/vendors/${vendorId}`);
        if (!vendorResponse.ok) {
            throw new Error(`GET /vendors/${vendorId} failed: ${vendorResponse.status}`);
        }
        
        const vendor = await vendorResponse.json();
        
        const score = vendor.reliability_score || 0;
        document.getElementById("reliabilityScore").innerText = score.toFixed(1);
        
        // Determine risk level badge styling
        const riskBadge = document.getElementById("riskLevel");
        const scoreVal = parseFloat(score);
        let riskText = "HIGH";
        let riskClass = "risk-high";
        
        if (scoreVal >= 85) {
            riskText = "LOW";
            riskClass = "risk-low";
        } else if (scoreVal >= 70) {
            riskText = "MEDIUM";
            riskClass = "risk-medium";
        }
        
        riskBadge.innerText = riskText;
        riskBadge.className = `risk-badge ${riskClass}`;
        
        document.getElementById("vName").innerText = vendor.name || 'N/A';
        document.getElementById("vCategory").innerText = vendor.category || 'N/A';
        document.getElementById("vStatus").innerText = vendor.status || 'Active';
        document.getElementById("vContact").innerText = vendor.contact_name || 'N/A';
        document.getElementById("vEmail").innerText = vendor.email || 'N/A';
        document.getElementById("vCity").innerText = vendor.city || 'N/A';
        
        // 3. Fetch Invoices summary
        const invResponse = await fetch(`/invoices/summary`);
        if (invResponse.ok) {
            const invData = await invResponse.json();
            document.getElementById("pendingBills").innerText = invData.pending_count || 0;
        }
        
        // 4. Fetch Notifications alert count
        const notifResponse = await fetch(`/notifications`);
        if (notifResponse.ok) {
            const alerts = await notifResponse.json();
            const unreadCount = alerts.filter(n => (n.status || "").toLowerCase() !== "read").length;
            document.getElementById("unreadAlerts").innerText = unreadCount;
        }
        
    } catch (err) {
        console.error("Error loading Vendor dashboard:", err);
    }
}
