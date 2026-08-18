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

    // Role-based navigation maps matching exact backend permissions
    const roleNavConfig = {
        "Admin": [
            { href: "admin_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "vendors.html", label: "👥 Vendors", id: "nav-vendors" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "purchase-request.html", label: "📝 Requisitions", id: "nav-requisitions" },
            { href: "quality.html", label: "🛡️ Quality Inspections", id: "nav-quality" },
            { href: "contracts.html", label: "📄 Contracts", id: "nav-contracts" },
            { href: "contract-monitoring.html", label: "🔔 Contract Monitoring", id: "nav-monitoring" },
            { href: "vendor-reliability.html", label: "📈 Vendor Reliability", id: "nav-reliability" },
            { href: "analytics.html", label: "📉 Analytics", id: "nav-analytics" },
            { href: "invoices.html", label: "💳 Invoices", id: "nav-invoices" },
            { href: "reports.html", label: "📊 Reports", id: "nav-reports" },
            { href: "audit_logs.html", label: "📝 Audit Logs", id: "nav-audit" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "profile.html", label: "👤 Profile", id: "nav-profile" }
        ],
        "Vendor": [
            { href: "vendor_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "contracts.html", label: "📄 Contracts", id: "nav-contracts" },
            { href: "contract-monitoring.html", label: "🔔 Contract Monitoring", id: "nav-monitoring" },
            { href: "vendor-reliability.html", label: "📈 Vendor Reliability", id: "nav-reliability" },
            { href: "quality.html", label: "🛡️ Quality Inspections", id: "nav-quality" },
            { href: "invoices.html", label: "💳 Invoices", id: "nav-invoices" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "profile.html", label: "👤 Profile", id: "nav-profile" }
        ],
        "Procurement Manager": [
            { href: "procurement_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "vendors.html", label: "👥 Vendors", id: "nav-vendors" },
            { href: "purchase-request.html", label: "📝 Requisitions", id: "nav-requisitions" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "contracts.html", label: "📄 Contracts", id: "nav-contracts" },
            { href: "vendor-reliability.html", label: "📈 Vendor Reliability", id: "nav-reliability" },
            { href: "reports.html", label: "📊 Reports", id: "nav-reports" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "profile.html", label: "👤 Profile", id: "nav-profile" }
        ],
        "Supply Chain Manager": [
            { href: "supplychain_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "vendors.html", label: "👥 Vendors", id: "nav-vendors" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "quality.html", label: "🛡️ Quality Inspections", id: "nav-quality" },
            { href: "vendor-reliability.html", label: "📈 Vendor Reliability", id: "nav-reliability" },
            { href: "contract-monitoring.html", label: "🔔 Contract Monitoring", id: "nav-monitoring" },
            { href: "analytics.html", label: "📉 Analytics", id: "nav-analytics" },
            { href: "reports.html", label: "📊 Reports", id: "nav-reports" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "profile.html", label: "👤 Profile", id: "nav-profile" }
        ],
        "Finance Officer": [
            { href: "finance_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "invoices.html", label: "💳 Invoices", id: "nav-invoices" },
            { href: "contracts.html", label: "📄 Contracts", id: "nav-contracts" },
            { href: "analytics.html", label: "📉 Analytics", id: "nav-analytics" },
            { href: "reports.html", label: "📊 Reports", id: "nav-reports" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "profile.html", label: "👤 Profile", id: "nav-profile" }
        ],
        "Auditor": [
            { href: "auditor_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "audit_logs.html", label: "📝 Audit Logs", id: "nav-audit" },
            { href: "reports.html", label: "📊 Reports", id: "nav-reports" },
            { href: "vendor-reliability.html", label: "📈 Vendor Reliability", id: "nav-reliability" },
            { href: "contract-monitoring.html", label: "🔔 Contract Monitoring", id: "nav-monitoring" },
            { href: "analytics.html", label: "📉 Analytics", id: "nav-analytics" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "profile.html", label: "👤 Profile", id: "nav-profile" }
        ]
    };

    const links = roleNavConfig[role] || [];
    
    // Construct Sidebar HTML
    let navLinksHtml = "";
    links.forEach(link => {
        navLinksHtml += `<a href="${link.href}" id="${link.id}">${link.label}</a>\n`;
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
