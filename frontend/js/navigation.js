// Navigation Shell Controller for VendorIQ
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const pageName = path.split("/").pop();
    
    // Skip layout wrapping for auth and public landing pages
    if (
        pageName === "login.html" || 
        pageName === "register.html" || 
        pageName === "forgot-password.html" || 
        pageName === "reset-password.html" || 
        pageName === "index.html" || 
        pageName === ""
    ) {
        return;
    }

    // Setup redirect if not authenticated
    if (!isAuthenticated()) {
        window.location.replace("login.html");
        return;
    }

    const role = getUserRole() || "Guest";
    const name = getUserName() || "User";

    // Determine dashboard routing by role
    let dashboardUrl = "login.html";
    switch (role) {
        case "Admin": dashboardUrl = "admin_dashboard.html"; break;
        case "Vendor": dashboardUrl = "vendor_dashboard.html"; break;
        case "Procurement Manager": dashboardUrl = "procurement_dashboard.html"; break;
        case "Supply Chain Manager": dashboardUrl = "supplychain_dashboard.html"; break;
        case "Finance Officer": dashboardUrl = "finance_dashboard.html"; break;
        case "Auditor": dashboardUrl = "auditor_dashboard.html"; break;
    }

    // Guard: Prevent unauthorized roles from loading other dashboard pages directly
    const dashboardPages = [
        "admin_dashboard.html",
        "vendor_dashboard.html",
        "procurement_dashboard.html",
        "supplychain_dashboard.html",
        "finance_dashboard.html",
        "auditor_dashboard.html"
    ];
    if (dashboardPages.includes(pageName) && pageName !== dashboardUrl) {
        console.warn(`Redirecting unauthorized role ${role} from ${pageName} to ${dashboardUrl}`);
        window.location.replace(dashboardUrl);
        return;
    }

    // Role-based navigation maps matching exact requirement specifications
    const roleNavConfig = {
        "Admin": [
            { isSection: true, label: "MAIN MODULES" },
            { href: "admin_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "admin_dashboard.html#user-management", label: "👥 User Management", id: "nav-users" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "purchase-request.html", label: "📝 Procurement", id: "nav-requisitions" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "contracts.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "invoices.html", label: "💳 Invoices & Payments", id: "nav-invoices" },
            { href: "vendor-reliability.html", label: "📈 Performance & Reliability", id: "nav-reliability" },
            { href: "reports.html", label: "📊 Reports & Analytics", id: "nav-reports" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "audit_logs.html", label: "📝 System Logs", id: "nav-audit" },
            
            { isSection: true, label: "ADMIN CONTROLS" },
            { href: "admin_dashboard.html#user-management", label: "🔐 Role & Permission", id: "nav-roles" },
            { href: "admin_dashboard.html#platform-overview", label: "🔄 Workflow Management", id: "nav-workflows" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" },
            { href: "audit_logs.html", label: "📋 Audit Logs", id: "nav-audit-control" },
            { href: "analytics.html", label: "💾 Data Management", id: "nav-data" },
            { href: "admin_dashboard.html#system-health", label: "🔌 Integrations", id: "nav-integrations" }
        ],
        "Auditor": [
            { isSection: true, label: "AUDIT & COMPLIANCE" },
            { href: "auditor_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "purchase-orders.html", label: "📝 Procurement & Orders", id: "nav-purchase" },
            { href: "contracts.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "auditor_dashboard.html#audit-plan", label: "📑 Audit Plan", id: "nav-plan" },
            { href: "auditor_dashboard.html#compliance-overview", label: "🛡️ Risk Assessment", id: "nav-risk" },
            { href: "auditor_dashboard.html#audit-findings", label: "🔍 Audit Findings", id: "nav-findings" },
            { href: "audit_logs.html", label: "📜 Audit Trails", id: "nav-audit" },
            { href: "reports.html", label: "📊 Reports & Analytics", id: "nav-reports" },
            { href: "contract-monitoring.html", label: "📑 Document Review", id: "nav-monitoring" },
            { href: "communication.html", label: "💬 Communication Log", id: "nav-comm" },
            { href: "notifications.html", label: "🔔 Alerts & Notifications", id: "nav-notifications" },
            
            { isSection: true, label: "AUDIT TOOLS" },
            { href: "auditor_dashboard.html#control-assessment", label: "🎯 Control Assessment", id: "nav-controls" },
            { href: "auditor_dashboard.html#checklist-progress", label: "✅ Checklist Management", id: "nav-checklist" },
            { href: "auditor_dashboard.html#audit-findings", label: "📁 Evidence Management", id: "nav-evidence" },
            
            { isSection: true, label: "SETTINGS" },
            { href: "profile.html", label: "👤 User Profile", id: "nav-profile" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" }
        ],
        "Finance Officer": [
            { isSection: true, label: "FINANCIAL MODULES" },
            { href: "finance_dashboard.html", label: "💰 Financial Overview", id: "nav-dashboard" },
            { href: "finance_dashboard.html#budget-overview", label: "📈 Budget & Forecasting", id: "nav-budget" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "invoices.html", label: "💳 Invoices & Payments", id: "nav-invoices" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "finance_dashboard.html#spend-category", label: "📉 Cost Analysis", id: "nav-cost" },
            { href: "analytics.html", label: "📊 Spend Analysis", id: "nav-analytics" },
            { href: "contracts.html", label: "⚖️ Tax & Compliance", id: "nav-contracts" },
            { href: "reports.html", label: "📑 Financial Reports", id: "nav-reports" },
            { href: "finance_dashboard.html#recent-invoices", label: "✅ Approvals", id: "nav-approvals" },
            { href: "invoices.html", label: "🔍 Payment Tracking", id: "nav-payment-tracking" },
            { href: "vendor-reliability.html", label: "🛡️ Risk & Controls", id: "nav-reliability" },
            
            { isSection: true, label: "SETTINGS" },
            { href: "profile.html", label: "👤 User Profile", id: "nav-profile" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" }
        ],
        "Procurement Manager": [
            { isSection: true, label: "PROCUREMENT OPERATIONS" },
            { href: "procurement_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "purchase-request.html", label: "📝 Procurement Requests", id: "nav-requisitions" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "vendor-performance.html", label: "📈 Vendor Performance", id: "nav-performance" },
            { href: "contracts.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "invoices.html", label: "💳 Invoices & Payments", id: "nav-invoices" },
            { href: "purchase-orders.html", label: "🚚 Order Tracking", id: "nav-tracking" },
            { href: "reports.html", label: "📊 Reports & Analytics", id: "nav-reports" },
            { href: "procurement_dashboard.html#budget-spend", label: "💰 Budget & Spend Analysis", id: "nav-budget" },
            { href: "communication.html", label: "💬 Communications", id: "nav-comm" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            
            { isSection: true, label: "SETTINGS" },
            { href: "profile.html", label: "👤 User Profile", id: "nav-profile" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" }
        ],
        "Vendor": [
            { isSection: true, label: "VENDOR PORTAL" },
            { href: "vendor_dashboard.html", label: "📊 Overview", id: "nav-dashboard" },
            { href: "profile.html", label: "🏢 Profile & Company", id: "nav-profile" },
            { href: "vendor_dashboard.html#performance-overview", label: "📈 My Performance", id: "nav-performance" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "vendor_dashboard.html#recent-orders", label: "🚚 Order & Delivery Tracking", id: "nav-tracking" },
            { href: "invoices.html", label: "💳 Invoices", id: "nav-invoices" },
            { href: "contracts.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "communication.html", label: "💬 Communications", id: "nav-comm" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "reports.html", label: "📑 Reports", id: "nav-reports" },
            
            { isSection: true, label: "ACCOUNT" },
            { href: "profile.html", label: "⚙️ Settings", id: "nav-settings" }
        ],
        "Supply Chain Manager": [
            { isSection: true, label: "SUPPLY CHAIN OPERATIONS" },
            { href: "supplychain_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "purchase-request.html", label: "📝 Procurement", id: "nav-requisitions" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "supplychain_dashboard.html#recent-shipments", label: "🚚 Order Tracking", id: "nav-tracking" },
            { href: "supplychain_dashboard.html#visibility-section", label: "📦 Inventory Overview", id: "nav-inventory" },
            { href: "analytics.html", label: "📈 Demand Planning", id: "nav-demand" },
            { href: "vendor-performance.html", label: "📊 Supplier Performance", id: "nav-performance" },
            { href: "vendor-reliability.html", label: "🛡️ Risk & Reliability", id: "nav-reliability" },
            { href: "contract-monitoring.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "reports.html", label: "📑 Analytics & Reports", id: "nav-reports" },
            { href: "communication.html", label: "💬 Communications", id: "nav-comm" },
            { href: "notifications.html", label: "🔔 Alerts & Notifications", id: "nav-notifications" },
            
            { isSection: true, label: "SUPPLY CHAIN TOOLS" },
            { href: "supplychain_dashboard.html#visibility-section", label: "🗺️ Supply Chain Map", id: "nav-map" },
            { href: "supplychain_dashboard.html#disruption-monitor", label: "⚠️ Disruption Monitor", id: "nav-disruption" },
            { href: "analytics.html", label: "🔬 Scenario Planning", id: "nav-scenario" }
        ]
    };

    const links = roleNavConfig[role] || [];
    
    // Construct Sidebar HTML
    let navLinksHtml = "";
    links.forEach(item => {
        if (item.isSection) {
            navLinksHtml += `<div class="sidebar-section-header">${item.label}</div>\n`;
        } else {
            navLinksHtml += `<a href="${item.href}" id="${item.id}">${item.label}</a>\n`;
        }
    });

    const sidebarHtml = `
        <div class="sidebar-brand">
            <h1>Vendor<span>IQ</span></h1>
            <p>Reliability Intelligence</p>
        </div>
        <div class="sidebar-nav">
            ${navLinksHtml}
        </div>
        <div class="sidebar-footer">
            <button class="logout-btn" id="logout-button">🚪 Logout</button>
        </div>
    `;

    // Construct Top Navbar HTML
    const topNavHtml = `
        <div class="top-nav-title">
            <button class="mobile-nav-toggle" id="mobile-toggle">☰</button>
            <h2 id="page-header-title">VendorIQ Platform</h2>
        </div>
        <div class="top-nav-user">
            <div class="user-badge">
                👤 ${name} 
                <span class="user-badge-role">${role}</span>
            </div>
        </div>
    `;

    // Save existing elements
    const originalChildren = Array.from(document.body.children);
    
    // Create new layout wrapper
    const appLayout = document.createElement("div");
    appLayout.id = "app-layout";
    
    const sidebar = document.createElement("div");
    sidebar.id = "sidebar";
    sidebar.innerHTML = sidebarHtml;
    
    const mainPanel = document.createElement("div");
    mainPanel.id = "main-panel";
    
    const topNav = document.createElement("div");
    topNav.id = "top-nav";
    topNav.innerHTML = topNavHtml;
    
    const contentArea = document.createElement("div");
    contentArea.id = "content-area";
    
    // Move scripts and original elements
    originalChildren.forEach(child => {
        if (child.tagName !== "SCRIPT" && child.id !== "toast-container") {
            contentArea.appendChild(child);
        }
    });
    
    mainPanel.appendChild(topNav);
    mainPanel.appendChild(contentArea);
    appLayout.appendChild(sidebar);
    appLayout.appendChild(mainPanel);
    
    // Setup toast container if not exists
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
    }
    
    document.body.insertBefore(appLayout, document.body.firstChild);

    // Active link highlighting logic
    const activeNavMap = {
        "dashboard": "nav-dashboard",
        "admin_dashboard": "nav-dashboard",
        "vendor_dashboard": "nav-dashboard",
        "procurement_dashboard": "nav-dashboard",
        "supplychain_dashboard": "nav-dashboard",
        "finance_dashboard": "nav-dashboard",
        "auditor_dashboard": "nav-dashboard",
        "vendors": "nav-vendors",
        "vendor-reliability": "nav-reliability",
        "purchase-request": "nav-requisitions",
        "purchase-orders": "nav-purchase",
        "quality": "nav-quality",
        "contracts": "nav-contracts",
        "add-contract": "nav-contracts",
        "contract-monitoring": "nav-monitoring",
        "analytics": "nav-analytics",
        "invoices": "nav-invoices",
        "reports": "nav-reports",
        "audit_logs": "nav-audit",
        "notifications": "nav-notifications",
        "profile": "nav-profile"
    };

    let matched = false;
    for (const [pageKey, elementId] of Object.entries(activeNavMap)) {
        if (pageName.includes(pageKey)) {
            const el = document.getElementById(elementId);
            if (el) {
                el.classList.add("active");
                // Update header title based on navigation
                document.getElementById("page-header-title").textContent = el.textContent.substring(3);
                matched = true;
            }
            break;
        }
    }
    
    if (!matched) {
        document.getElementById("page-header-title").textContent = "VendorIQ Platform";
    }

    // Toggle sidebar on mobile
    const mobileToggle = document.getElementById("mobile-toggle");
    if (mobileToggle) {
        mobileToggle.addEventListener("click", () => {
            sidebar.classList.toggle("show");
        });
    }

    // Wire up Logout
    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            logout();
        });
    }
});
