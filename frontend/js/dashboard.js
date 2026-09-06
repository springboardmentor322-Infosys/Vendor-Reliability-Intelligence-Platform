/* =========================================================
   VENDORIQ DASHBOARD
   Role Based Dashboard
========================================================= */

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;

const chartInstances = {};

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
  try {
    await initializeDashboard();
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
  }
});

/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {
  currentUser = await getCurrentUser();

  if (!currentUser) {
    console.error("No authenticated user found.");
    window.location.href = "login.html";
    return;
  }

  updateUserInformation(currentUser);

  configureDashboardByRole(currentUser.role);

  await loadRoleDashboard(currentUser.role);

  setupDashboardNavigation();

  updateClock();

  setInterval(updateClock, 1000);
}

/* =========================================================
   ROLE DASHBOARD ROUTER
========================================================= */

async function loadRoleDashboard(role) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  switch (normalizedRole) {
    case "administrator":
      await loadAdministratorDashboard();
      break;

    case "procurement manager":
      await loadProcurementManagerDashboard();
      break;

    case "supply chain manager":
      await loadSupplyChainManagerDashboard();
      break;

    case "vendor":
      await loadVendorDashboard();
      break;

    case "finance officer":
      await loadFinanceOfficerDashboard();
      break;

    case "auditor":
      await loadAuditorDashboard();
      break;

    default:
      console.error("Unsupported dashboard role:", role);
  }
}

/* =========================================================
   USER INFORMATION
========================================================= */

function updateUserInformation(user) {
  const fullName = user?.full_name || "User";
  const role = user?.role || "User";

  const elements = {
    userName: fullName,
    dropdownUserName: fullName,
    sidebarUserName: fullName,
    userRole: role,
    dropdownRole: role,
    dashboardUserName: fullName,
    dashboardUserRole: role,
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  });

  const title = document.getElementById("dashboardTitle");

  if (title) {
    title.textContent = getDashboardTitle(role);
  }

  const subtitle = document.getElementById("dashboardSubtitle");

  if (subtitle) {
    subtitle.textContent = getDashboardSubtitle(role);
  }

  const overview = document.getElementById("overviewText");

  if (overview) {
    overview.textContent = getDashboardOverview(role);
  }
}

/* =========================================================
   ROLE CONFIGURATION
========================================================= */

function configureDashboardByRole(role) {
  applyDashboardPermissions();

  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  const title = document.getElementById("dashboardTitle");
  const subtitle = document.getElementById("dashboardSubtitle");

  if (normalizedRole === "administrator") {
    if (title) {
      title.textContent = "Administrator Dashboard";
    }

    if (subtitle) {
      subtitle.textContent =
        "Platform management, vendor analytics and system statistics";
    }
  } else if (normalizedRole === "procurement manager") {
    if (title) {
      title.textContent = "Procurement Dashboard";
    }

    if (subtitle) {
      subtitle.textContent =
        "Purchase orders, procurement activity and vendor performance";
    }
  } else if (normalizedRole === "supply chain manager") {
    if (title) {
      title.textContent = "Supply Chain Dashboard";
    }

    if (subtitle) {
      subtitle.textContent =
        "Supplier reliability, deliveries and operational continuity";
    }
  } else if (normalizedRole === "finance officer") {
    if (title) {
      title.textContent = "Finance Dashboard";
    }

    if (subtitle) {
      subtitle.textContent =
        "Invoices, payments and procurement expenditure";
    }
  } else if (normalizedRole === "auditor") {
    if (title) {
      title.textContent = "Auditor Dashboard";
    }

    if (subtitle) {
      subtitle.textContent =
        "Compliance, approvals, risk assessments and audit activity";
    }
  } else if (normalizedRole === "vendor") {
    if (title) {
      title.textContent = "Vendor Dashboard";
    }

    if (subtitle) {
      subtitle.textContent =
        "Vendor performance, reliability and order activity";
    }
  }
}

/* =========================================================
   DASHBOARD PERMISSIONS
========================================================= */

function applyDashboardPermissions() {
  const permissionElements =
    document.querySelectorAll("[data-permission]");

  permissionElements.forEach((element) => {
    const permission = element.dataset.permission;

    let allowed = true;

    if (typeof hasPermission === "function") {
      allowed = hasPermission(permission);
    }

    element.style.display = allowed ? "" : "none";
  });
}

/* =========================================================
   DASHBOARD TITLE
========================================================= */

function getDashboardTitle(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();

  if (normalized === "administrator") {
    return "Administrator Dashboard";
  }

  if (normalized === "procurement manager") {
    return "Procurement Dashboard";
  }

  if (normalized === "supply chain manager") {
    return "Supply Chain Dashboard";
  }

  if (normalized === "finance officer") {
    return "Finance Dashboard";
  }

  if (normalized === "auditor") {
    return "Auditor Dashboard";
  }

  if (normalized === "vendor") {
    return "Vendor Dashboard";
  }

  return "Dashboard";
}

/* =========================================================
   DASHBOARD SUBTITLE
========================================================= */

function getDashboardSubtitle(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();

  if (normalized === "administrator") {
    return "Platform management, vendor analytics and system statistics";
  }

  if (normalized === "procurement manager") {
    return "Purchase orders, procurement activity and vendor performance";
  }

  if (normalized === "supply chain manager") {
    return "Supplier reliability, deliveries and operational continuity";
  }

  if (normalized === "finance officer") {
    return "Invoices, payments and procurement expenditure";
  }

  if (normalized === "auditor") {
    return "Compliance, approvals, risk assessments and audit activity";
  }

  if (normalized === "vendor") {
    return "Vendor performance, reliability and order activity";
  }

  return "Vendor Reliability Platform";
}

/* =========================================================
   DASHBOARD OVERVIEW
========================================================= */

function getDashboardOverview(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();

  if (normalized === "administrator") {
    return (
      "Monitor users, vendors, procurement activity, contracts, " +
      "invoices, compliance and overall platform operations."
    );
  }

  if (normalized === "procurement manager") {
    return (
      "Monitor purchase orders, procurement activity, vendor " +
      "performance and purchasing operations."
    );
  }

  if (normalized === "supply chain manager") {
    return (
      "Monitor supplier reliability, delivery performance, delays, " +
      "quality and operational continuity."
    );
  }

  if (normalized === "finance officer") {
    return (
      "Monitor invoices, payment status, procurement expenditure " +
      "and vendor payment activity."
    );
  }

  if (normalized === "auditor") {
    return (
      "Monitor compliance, approvals, vendor documentation, " +
      "risk assessments and audit activity."
    );
  }

  if (normalized === "vendor") {
    return (
      "Monitor your vendor performance, reliability, contracts, " +
      "orders and communication activity."
    );
  }

  return "VendorIQ dashboard overview.";
}

/* =========================================================
   ANIMATE VALUE
========================================================= */

function animateValue(id, start, end, duration = 800) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  const numericEnd = Number(end) || 0;

  let startTime = null;

  function animation(currentTime) {
    if (!startTime) {
      startTime = currentTime;
    }

    const progress = Math.min(
      (currentTime - startTime) / duration,
      1
    );

    const value =
      Math.floor(
        progress * (numericEnd - start) + start
      );

    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

/* =========================================================
   CURRENCY FORMAT
========================================================= */

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

/* =========================================================
   STATUS CLASS
========================================================= */

function getPurchaseOrderStatusClass(status) {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  const statusMap = {
    PENDING: "pending",
    PENDING_PAYMENT: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    COMPLETE: "completed",
    CANCELLED: "cancelled",
    CANCELED: "cancelled",
    ON_HOLD: "on-hold",
    PAYMENT_REVIEW: "payment-review",
    SUSPECTED_FRAUD: "suspected-fraud",
  };

  return statusMap[normalized] || "pending";
}

/* =========================================================
   ADMINISTRATOR DASHBOARD
========================================================= */

async function loadAdministratorDashboard() {
  try {
    const data = await getAdministratorDashboard();

    animateValue(
      "totalUsers",
      0,
      data.total_users,
      800
    );

    animateValue(
      "totalVendors",
      0,
      data.total_vendors,
      800
    );

    animateValue(
      "activeVendors",
      0,
      data.active_vendors,
      800
    );

    animateValue(
      "purchaseOrders",
      0,
      data.purchase_orders,
      800
    );

    animateValue(
      "invoiceCount",
      0,
      data.total_invoices,
      800
    );

    animateValue(
      "activeContracts",
      0,
      data.active_contracts,
      800
    );

    console.log(
      "Administrator dashboard loaded:",
      data
    );
  } catch (error) {
    console.error(
      "Administrator dashboard summary error:",
      error
    );
  }

  /*
   * Each section has its own error handling.
   * One failed section will not stop the others.
   */

  await loadAdministratorAlerts();

  await loadAdministratorCharts();

  await loadAdministratorTopVendors();

  await loadAdministratorRecentPurchaseOrders();

  await loadAdministratorRecentActivity();

  loadAdministratorQuickAccess();
}

/* =========================================================
   ADMINISTRATOR CHARTS
========================================================= */

async function loadAdministratorCharts() {
  await loadAdministratorVendorReliability();

  await loadAdministratorProcurementActivity();

  await loadAdministratorVendorCategories();

  await loadAdministratorComplianceChart();
}

/* =========================================================
   ADMINISTRATOR VENDOR RELIABILITY
========================================================= */

async function loadAdministratorVendorReliability() {
  const canvas = document.getElementById(
    "vendorReliabilityChart"
  );

  if (!canvas) {
    console.warn(
      "vendorReliabilityChart canvas not found."
    );

    return;
  }

  try {
    const data =
      await getAdministratorVendorReliability();

    destroyChart("vendorReliability");

    chartInstances.vendorReliability =
      new Chart(canvas, {
        type: "doughnut",

        data: {
          labels: data?.labels || [],

          datasets: [
            {
              data: data?.values || [],
              backgroundColor: [
                "#4f46e5",
                "#10b981",
                "#f59e0b",
                "#ef4444",
              ],
              borderWidth: 0,
            },
          ],
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          cutout: "65%",

          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      });
  } catch (error) {
    console.error(
      "Administrator vendor reliability error:",
      error
    );
  }
}

/* =========================================================
   ADMINISTRATOR PROCUREMENT ACTIVITY
========================================================= */

async function loadAdministratorProcurementActivity() {
  const canvas = document.getElementById(
    "procurementTrendChart"
  );

  if (!canvas) {
    console.warn(
      "procurementTrendChart canvas not found."
    );

    return;
  }

  try {
    const data =
      await getAdministratorProcurementActivity();

    destroyChart("procurementActivity");

    chartInstances.procurementActivity =
      new Chart(canvas, {
        type: "bar",

        data: {
          labels: data?.labels || [],

          datasets: [
            {
              label: "Purchase Orders",
              data: data?.values || [],
            },
          ],
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
  } catch (error) {
    console.error(
      "Administrator procurement activity error:",
      error
    );
  }
}

/* =========================================================
   ADMINISTRATOR VENDOR CATEGORIES
========================================================= */

async function loadAdministratorVendorCategories() {
  const canvas = document.getElementById(
    "vendorCategoryChart"
  );

  if (!canvas) {
    console.warn(
      "vendorCategoryChart canvas not found."
    );

    return;
  }

  try {
    const data =
      await getAdministratorVendorCategories();

    destroyChart("vendorCategories");

    chartInstances.vendorCategories =
      new Chart(canvas, {
        type: "bar",

        data: {
          labels: data?.categories || [],

          datasets: [
            {
              label: "Vendors",
              data: data?.counts || [],
            },
          ],
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
  } catch (error) {
    console.error(
      "Administrator vendor category error:",
      error
    );
  }
}

/* =========================================================
   ADMINISTRATOR COMPLIANCE CHART
========================================================= */

async function loadAdministratorComplianceChart() {
  const canvas = document.getElementById(
    "complianceChart"
  );

  if (!canvas) {
    console.warn(
      "complianceChart canvas not found."
    );

    return;
  }

  try {
    const data =
      await getAdministratorCompliance();

    const labels = data?.labels || [];

    const values = data?.values || [];

    if (!labels.length) {
      console.warn(
        "Administrator compliance data is empty."
      );

      return;
    }

    destroyChart("administratorCompliance");

    chartInstances.administratorCompliance =
      new Chart(canvas, {
        type: "doughnut",

        data: {
          labels: labels,

          datasets: [
            {
              label: "Vendors",
              data: values,

              backgroundColor: [
                "#10b981",
                "#f59e0b",
                "#ef4444",
              ],

              borderWidth: 0,
            },
          ],
        },

        options: {
          responsive: true,

          maintainAspectRatio: false,

          cutout: "65%",

          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      });
  } catch (error) {
    console.error(
      "Administrator compliance chart error:",
      error
    );
  }
}

/* =========================================================
   ADMINISTRATOR ALERTS
========================================================= */

async function loadAdministratorAlerts() {
  const container = document.getElementById(
    "administratorAlerts"
  );

  if (!container) {
    console.warn(
      "administratorAlerts container not found."
    );

    return;
  }

  const alerts = [];

  try {
    const data =
      await getAdministratorDashboard();

    if (
      Number(data?.pending_purchase_orders || 0) > 0
    ) {
      alerts.push({
        icon: "fa-solid fa-cart-shopping",

        text:
          `${data.pending_purchase_orders} ` +
          `purchase orders are pending.`,

        link: "purchaseOrders.html",
      });
    }

    if (
      Number(data?.delayed_deliveries || 0) > 0
    ) {
      alerts.push({
        icon: "fa-solid fa-truck",

        text:
          `${data.delayed_deliveries} ` +
          `deliveries are delayed.`,

        link: "deliveries.html",
      });
    }

    if (
      Number(data?.pending_deliveries || 0) > 0
    ) {
      alerts.push({
        icon: "fa-solid fa-clock",

        text:
          `${data.pending_deliveries} ` +
          `deliveries are pending.`,

        link: "deliveries.html",
      });
    }

    renderAdministratorAlerts(alerts);
  } catch (error) {
    console.error(
      "Administrator alerts error:",
      error
    );

    renderAdministratorAlerts([]);
  }
}

/* =========================================================
   ADMINISTRATOR ALERT RENDERER
========================================================= */

function renderAdministratorAlerts(alerts) {
  const container = document.getElementById(
    "administratorAlerts"
  );

  if (!container) {
    return;
  }

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
      <div class="admin-alert-empty">
        <i class="fa-solid fa-circle-check"></i>

        <span>
          No critical alerts at this time.
        </span>
      </div>
    `;

    return;
  }

  container.innerHTML = alerts
    .map(
      (alert) => `
        <a
          href="${escapeHtml(alert.link || "#")}"
          class="admin-alert-item"
        >
          <div class="admin-alert-icon">
            <i class="${escapeHtml(
              alert.icon ||
                "fa-solid fa-circle-info"
            )}"></i>
          </div>

          <div class="admin-alert-content">
            <span>
              ${escapeHtml(alert.text || "")}
            </span>
          </div>

          <i
            class="fa-solid fa-chevron-right
                   admin-alert-arrow"
          ></i>
        </a>
      `
    )
    .join("");
}

/* =========================================================
   ADMINISTRATOR TOP VENDORS
========================================================= */

async function loadAdministratorTopVendors() {
  const tbody = document.getElementById(
    "recentVendorTable"
  );

  if (!tbody) {
    console.warn(
      "recentVendorTable not found."
    );

    return;
  }

  try {
    const vendors =
      await getAdministratorRecentVendors();

    tbody.innerHTML = "";

    if (!vendors || vendors.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">
            No vendor data available
          </td>
        </tr>
      `;

      return;
    }

    vendors.forEach((vendor) => {
      const score =
        Number(
          vendor.reliability_score || 0
        );

      let scoreClass = "average";

      if (score >= 90) {
        scoreClass = "excellent";
      } else if (score >= 80) {
        scoreClass = "good";
      }

      tbody.innerHTML += `
        <tr>
          <td>
            ${escapeHtml(
              vendor.vendor_name || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              vendor.category || "-"
            )}
          </td>

          <td>
            <span class="score ${scoreClass}">
              ${score.toFixed(1)}%
            </span>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error(
      "Administrator top vendors error:",
      error
    );

    tbody.innerHTML = `
      <tr>
        <td colspan="3">
          Unable to load vendors
        </td>
      </tr>
    `;
  }
}

/* =========================================================
   ADMINISTRATOR RECENT PURCHASE ORDERS
========================================================= */

async function loadAdministratorRecentPurchaseOrders() {
  const tbody = document.getElementById(
    "recentPurchaseTable"
  );

  if (!tbody) {
    console.warn(
      "recentPurchaseTable not found."
    );

    return;
  }

  try {
    const orders =
      await getAdministratorRecentPurchaseOrders();

    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">
            No purchase orders available
          </td>
        </tr>
      `;

      return;
    }

    orders.forEach((order) => {
      const statusText =
        order.status || "Pending";

      const statusClass =
        getPurchaseOrderStatusClass(
          statusText
        );

      tbody.innerHTML += `
        <tr>
          <td>
            ${escapeHtml(
              order.po_number || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              order.vendor ||
                order.vendor_name ||
                "-"
            )}
          </td>

          <td>
            ${formatCurrency(
              order.amount
            )}
          </td>

          <td>
            <span class="status ${statusClass}">
              ${escapeHtml(statusText)}
            </span>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error(
      "Administrator recent purchase orders error:",
      error
    );

    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          Unable to load purchase orders
        </td>
      </tr>
    `;
  }
}

/* =========================================================
   ADMINISTRATOR RECENT ACTIVITY
========================================================= */

async function loadAdministratorRecentActivity() {
    const container = document.getElementById("recentActivityList");

    if (!container) {
        return;
    }

    /*
     * There is currently no AuditLog model.
     * Therefore, do not fabricate activity.
     * Use real notification records if available.
     */

    try {
        if (typeof getNotifications !== "function") {
            container.innerHTML = `
                <li>
                    No recent activity available.
                </li>
            `;
            return;
        }

        const response = await getNotifications();

        const notifications = Array.isArray(response)
            ? response
            : response?.items || [];

        if (!notifications.length) {
            container.innerHTML = `
                <li>
                    No recent activity available.
                </li>
            `;
            return;
        }

        container.innerHTML = notifications
            .slice(0, 5)
            .map((notification) => {
                const title = notification.title || "Notification";
                const message = notification.message || "";

                /*
                 * If title and message are identical,
                 * display the activity only once.
                 */
                const showMessage =
                    message &&
                    message.trim() !== title.trim();

                return `
                    <li>
                        <strong>
                            ${escapeHtml(title)}
                        </strong>

                        ${
                            showMessage
                                ? `<span>${escapeHtml(message)}</span>`
                                : ""
                        }
                    </li>
                `;
            })
            .join("");

    } catch (error) {
        console.error(
            "Administrator recent activity error:",
            error
        );

        container.innerHTML = `
            <li>
                Unable to load recent activity.
            </li>
        `;
    }
}

/* =========================================================
   ADMINISTRATOR QUICK ACCESS
========================================================= */

function loadAdministratorQuickAccess() {
  const grid = document.getElementById(
    "quickAccessGrid"
  );

  if (!grid) {
    return;
  }

  const items = [
    {
      title: "User Management",
      description:
        "Manage users and platform roles.",
      icon: "fa-solid fa-users",
      link: "userManagement.html",
      permission: "userManagement",
    },

    {
      title: "Vendor Management",
      description:
        "Review and manage registered vendors.",
      icon: "fa-solid fa-building",
      link: "vendors.html",
      permission: "vendors",
    },

    {
      title: "Purchase Orders",
      description:
        "Monitor procurement transactions.",
      icon: "fa-solid fa-cart-shopping",
      link: "purchaseOrders.html",
      permission: "purchaseOrders",
    },

    {
      title: "Contracts",
      description:
        "Review active vendor contracts.",
      icon: "fa-solid fa-file-contract",
      link: "contracts.html",
      permission: "contracts",
    },

    {
      title: "Invoices",
      description:
        "Monitor procurement invoices.",
      icon:
        "fa-solid fa-file-invoice-dollar",
      link: "invoices.html",
      permission: "invoices",
    },

    {
      title: "Reports",
      description:
        "Generate platform reports.",
      icon:
        "fa-solid fa-chart-column",
      link: "reports.html",
      permission: "reports",
    },
  ];

  const visibleItems = items.filter(
    (item) =>
      typeof hasPermission !==
        "function" ||
      hasPermission(item.permission)
  );

  grid.innerHTML = visibleItems
    .map(
      (item) => `
        <a
          href="${item.link}"
          class="quick-access-item"
        >
          <div class="quick-access-icon">
            <i class="${item.icon}"></i>
          </div>

          <div>
            <h4>
              ${item.title}
            </h4>

            <p>
              ${item.description}
            </p>
          </div>
        </a>
      `
    )
    .join("");
}

/* =========================================================
   OTHER ROLE DASHBOARDS
========================================================= */

function hideAdministratorLayoutForRole() {
  [
    ".administrator-alerts-card",
    ".kpi-section",
    ".chart-grid",
    ".dashboard-grid",
    "#quickAccessSection"
  ].forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.style.display = "none";
    });
  });
}

function showRoleDashboardContent() {
  const container = document.getElementById("roleDashboardContent");
  if (container) container.style.display = "block";
  hideAdministratorLayoutForRole();
}

function roleKpi(label, value, icon, note = "") {
  return `
    <div class="role-kpi">
      <div class="role-kpi-icon"><i class="${icon}"></i></div>
      <h4>${escapeHtml(label)}</h4>
      <strong>${escapeHtml(value)}</strong>
      ${note ? `<small>${escapeHtml(note)}</small>` : ""}
    </div>
  `;
}

function roleCard(title, subtitle, body, full = false) {
  return `
    <section class="role-dashboard-card${full ? " full" : ""}">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(subtitle)}</p>
      ${body}
    </section>
  `;
}

function roleAction(title, description, icon, link) {
  return `
    <a class="role-action" href="${escapeHtml(link)}">
      <i class="${escapeHtml(icon)}"></i>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(description)}</span>
    </a>
  `;
}

function setRoleDashboard(html) {
  const container = document.getElementById("roleDashboardContent");
  if (!container) return;
  showRoleDashboardContent();
  container.innerHTML = `<div class="role-dashboard-panel">${html}</div>`;
}

async function loadProcurementManagerDashboard() {
  try {
    const data = await apiRequest("/dashboard/procurement-manager");
    const overview = await getAnalyticsOverview();

    const summary = overview.summary || {};
    const cards = [
      roleKpi("Procurement Requests", data.procurement_requests, "fa-solid fa-file-signature", `${data.pending_requests} pending`),
      roleKpi("Purchase Orders", data.purchase_orders, "fa-solid fa-cart-shopping"),
      roleKpi("Pending Deliveries", data.pending_deliveries, "fa-solid fa-truck-fast"),
      roleKpi("Vendors", data.vendors, "fa-solid fa-building"),
      roleKpi("Procurement Value", formatCurrency(summary.procurement_value), "fa-solid fa-indian-rupee-sign", "Selected reporting period")
    ].join("");

    const actions = [
      roleAction("Procurement Requests", "Review incoming requests", "fa-solid fa-file-signature", "procurement_requests.html"),
      roleAction("Purchase Orders", "Manage purchasing activity", "fa-solid fa-cart-shopping", "purchaseOrders.html"),
      roleAction("Vendors", "Review supplier performance", "fa-solid fa-building", "vendors.html"),
      roleAction("Reports", "Generate procurement reports", "fa-solid fa-chart-column", "reports.html")
    ].join("");

    setRoleDashboard(`
      <div class="role-kpi-grid">${cards}</div>
      <div class="role-dashboard-grid">
        ${roleCard("Procurement Focus", "Current procurement workload", `
          <ul class="role-list">
            <li><span class="label">Pending requests</span><span class="value">${data.pending_requests}</span></li>
            <li><span class="label">Pending deliveries</span><span class="value">${data.pending_deliveries}</span></li>
            <li><span class="label">Average vendor reliability</span><span class="value">${summary.average_reliability || 0}%</span></li>
            <li><span class="label">Active contracts</span><span class="value">${summary.active_contracts || 0}</span></li>
          </ul>`)}
        ${roleCard("Procurement Actions", "Quick access to daily purchasing operations", `<div class="role-action-grid">${actions}</div>`)}
      </div>
    `);
  } catch (error) {
    console.error("Procurement Manager dashboard error:", error);
    setRoleDashboard(roleCard("Dashboard unavailable", "The procurement dashboard could not load.", "Please refresh and check the API server."));
  }
}

async function loadSupplyChainManagerDashboard() {
  try {
    const data = await apiRequest("/dashboard/supply-chain");
    const analytics = await getAnalyticsOverview();
    const summary = analytics.summary || {};

    const cards = [
      roleKpi("Vendors", data.vendors, "fa-solid fa-building"),
      roleKpi("Purchase Orders", data.purchase_orders, "fa-solid fa-cart-shopping"),
      roleKpi("Pending Deliveries", data.pending_deliveries, "fa-solid fa-clock"),
      roleKpi("Delayed Deliveries", data.delayed_deliveries, "fa-solid fa-triangle-exclamation"),
      roleKpi("Quality Issues", data.quality_issues, "fa-solid fa-clipboard-check"),
      roleKpi("Active Contracts", data.active_contracts, "fa-solid fa-file-contract")
    ].join("");

    const deliveryRate = summary.on_time_rate || 0;
    const actions = [
      roleAction("Deliveries", "Track delivery execution", "fa-solid fa-truck-fast", "deliveries.html"),
      roleAction("Quality Inspection", "Monitor supplier quality", "fa-solid fa-clipboard-check", "quality_inspections.html"),
      roleAction("Contracts", "Review active contracts", "fa-solid fa-file-contract", "contracts.html"),
      roleAction("Analytics", "Analyze operational trends", "fa-solid fa-chart-line", "analytics.html")
    ].join("");

    setRoleDashboard(`
      <div class="role-kpi-grid">${cards}</div>
      <div class="role-dashboard-grid">
        ${roleCard("Delivery Performance", "Operational delivery health", `
          <div class="role-list">
            <li><span class="label">Total deliveries</span><span class="value">${summary.deliveries || 0}</span></li>
            <li><span class="label">On-time rate</span><span class="value">${deliveryRate}%</span></li>
            <div class="role-progress"><span style="width:${Math.min(Math.max(deliveryRate, 0), 100)}%"></span></div>
            <li><span class="label">Delayed deliveries</span><span class="value">${summary.delayed_deliveries || 0}</span></li>
            <li><span class="label">Average quality score</span><span class="value">${summary.average_quality || 0}%</span></li>
          </div>`)}
        ${roleCard("Supply Chain Actions", "Quick access to operational controls", `<div class="role-action-grid">${actions}</div>`)}
      </div>
    `);
  } catch (error) {
    console.error("Supply Chain dashboard error:", error);
    setRoleDashboard(roleCard("Dashboard unavailable", "The supply chain dashboard could not load.", "Please refresh and check the API server."));
  }
}

async function loadFinanceOfficerDashboard() {
  try {
    const data = await apiRequest("/dashboard/finance-officer");
    const analytics = await getAnalyticsOverview();
    const summary = analytics.summary || {};

    const cards = [
      roleKpi("Total Invoices", data.total_invoices, "fa-solid fa-file-invoice-dollar"),
      roleKpi("Pending Payments", data.pending_payments, "fa-solid fa-clock"),
      roleKpi("Overdue Invoices", data.overdue_invoices, "fa-solid fa-triangle-exclamation"),
      roleKpi("Total Payable", formatCurrency(data.total_payable), "fa-solid fa-indian-rupee-sign"),
      roleKpi("Paid Invoices", summary.paid_invoices || 0, "fa-solid fa-circle-check"),
      roleKpi("Invoice Value", formatCurrency(summary.invoice_value), "fa-solid fa-coins")
    ].join("");

    const actions = [
      roleAction("Invoices", "Review payment records", "fa-solid fa-file-invoice-dollar", "invoices.html"),
      roleAction("Purchase Orders", "Review procurement commitments", "fa-solid fa-cart-shopping", "purchaseOrders.html"),
      roleAction("Contracts", "Review contract values", "fa-solid fa-file-contract", "contracts.html"),
      roleAction("Reports", "Generate financial reports", "fa-solid fa-chart-column", "reports.html")
    ].join("");

    setRoleDashboard(`
      <div class="role-kpi-grid">${cards}</div>
      <div class="role-dashboard-grid">
        ${roleCard("Payment Status", "Current invoice exposure", `
          <ul class="role-list">
            <li><span class="label">Paid invoices</span><span class="value">${summary.paid_invoices || 0}</span></li>
            <li><span class="label">Pending invoices</span><span class="value">${summary.pending_invoices || 0}</span></li>
            <li><span class="label">Overdue invoices</span><span class="value">${summary.overdue_invoices || 0}</span></li>
            <li><span class="label">Active contracts</span><span class="value">${summary.active_contracts || 0}</span></li>
          </ul>`)}
        ${roleCard("Finance Actions", "Quick access to finance operations", `<div class="role-action-grid">${actions}</div>`)}
      </div>
    `);
  } catch (error) {
    console.error("Finance dashboard error:", error);
    setRoleDashboard(roleCard("Dashboard unavailable", "The finance dashboard could not load.", "Please refresh and check the API server."));
  }
}

async function loadAuditorDashboard() {
  try {
    const data = await apiRequest("/dashboard/auditor");
    const report = await getReportOverview();

    const cards = [
      roleKpi("Vendors", data.vendors, "fa-solid fa-building"),
      roleKpi("Purchase Orders", data.purchase_orders, "fa-solid fa-cart-shopping"),
      roleKpi("Invoices", data.invoices, "fa-solid fa-file-invoice-dollar"),
      roleKpi("Contracts", data.contracts, "fa-solid fa-file-contract"),
      roleKpi("Quality Inspections", data.quality_inspections, "fa-solid fa-clipboard-check"),
      roleKpi("Pending Deliveries", data.pending_deliveries, "fa-solid fa-truck-fast")
    ].join("");

    const actions = [
      roleAction("Audit Logs", "Review immutable activity records", "fa-solid fa-history", "audit-logs.html"),
      roleAction("Reports", "Review compliance reports", "fa-solid fa-chart-column", "reports.html"),
      roleAction("Vendors", "Review vendor controls", "fa-solid fa-building", "vendors.html"),
      roleAction("Quality", "Review inspection results", "fa-solid fa-clipboard-check", "quality_inspections.html")
    ].join("");

    setRoleDashboard(`
      <div class="role-kpi-grid">${cards}</div>
      <div class="role-dashboard-grid">
        ${roleCard("Control Review", "Key items requiring audit attention", `
          <ul class="role-list">
            <li><span class="label">Failed inspections</span><span class="value">${data.failed_inspections}</span></li>
            <li><span class="label">Delayed deliveries</span><span class="value">${report.delayed_deliveries || 0}</span></li>
            <li><span class="label">Overdue invoices</span><span class="value">${report.overdue_invoices || 0}</span></li>
            <li><span class="label">Active contracts</span><span class="value">${report.active_contracts || 0}</span></li>
          </ul>`)}
        ${roleCard("Audit Actions", "Quick access to evidence and controls", `<div class="role-action-grid">${actions}</div>`)}
      </div>
    `);
  } catch (error) {
    console.error("Auditor dashboard error:", error);
    setRoleDashboard(roleCard("Dashboard unavailable", "The auditor dashboard could not load.", "Please refresh and check the API server."));
  }
}

async function loadVendorDashboard() {
  try {
    const data = await apiRequest("/dashboard/vendor");
    const analytics = await getAnalyticsOverview().catch(() => ({summary: {}}));
    const summary = analytics.summary || {};

    const cards = [
      roleKpi("Purchase Orders", data.purchase_orders, "fa-solid fa-cart-shopping"),
      roleKpi("Deliveries", data.deliveries, "fa-solid fa-truck-fast"),
      roleKpi("Contracts", data.contracts, "fa-solid fa-file-contract"),
      roleKpi("Invoices", data.invoices, "fa-solid fa-file-invoice-dollar")
    ].join("");

    const actions = [
      roleAction("Purchase Orders", "Review your orders", "fa-solid fa-cart-shopping", "purchaseOrders.html"),
      roleAction("Deliveries", "Track delivery records", "fa-solid fa-truck-fast", "deliveries.html"),
      roleAction("Contracts", "Review your contracts", "fa-solid fa-file-contract", "contracts.html"),
      roleAction("Invoices", "Review submitted invoices", "fa-solid fa-file-invoice-dollar", "invoices.html"),
      roleAction("Communication", "View vendor communication", "fa-solid fa-comments", "communication_history.html")
    ].join("");

    setRoleDashboard(`
      <div class="role-kpi-grid">${cards}</div>
      <div class="role-dashboard-grid">
        ${roleCard("Vendor Performance", "Current platform-wide performance indicators", `
          <ul class="role-list">
            <li><span class="label">Platform reliability</span><span class="value">${summary.average_reliability || 0}%</span></li>
            <li><span class="label">Platform compliance</span><span class="value">${summary.average_compliance || 0}%</span></li>
            <li><span class="label">On-time delivery rate</span><span class="value">${summary.on_time_rate || 0}%</span></li>
          </ul>`)}
        ${roleCard("Vendor Actions", "Access your operational records", `<div class="role-action-grid">${actions}</div>`)}
      </div>
    `);
  } catch (error) {
    console.error("Vendor dashboard error:", error);
    setRoleDashboard(roleCard("Dashboard unavailable", "The vendor dashboard could not load.", "Please refresh and check the API server."));
  }
}

/* =========================================================
   DESTROY CHART
========================================================= */

function destroyChart(name) {
  if (chartInstances[name]) {
    chartInstances[name].destroy();

    delete chartInstances[name];
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

function setupDashboardNavigation() {
  const viewAllPurchaseOrders =
    document.getElementById(
      "viewAllPurchaseOrders"
    );

  if (viewAllPurchaseOrders) {
    viewAllPurchaseOrders.onclick =
      function () {
        window.location.href =
          "purchaseOrders.html";
      };
  }

  const viewAllVendors =
    document.getElementById(
      "viewAllVendors"
    );

  if (viewAllVendors) {
    viewAllVendors.onclick =
      function () {
        window.location.href =
          "vendors.html";
      };
  }
}

/* =========================================================
   CLOCK
========================================================= */

function updateClock() {
  const now = new Date();

  const hour = now.getHours();

  let greeting = "Good Morning";

  if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good Evening";
  } else if (
    hour >= 21 ||
    hour < 5
  ) {
    greeting = "Good Night";
  }

  const userName =
    currentUser?.full_name || "User";

  const greetingElement =
    document.getElementById(
      "greetingText"
    );

  if (greetingElement) {
    greetingElement.textContent =
      `${greeting}, ${userName}`;
  }

  const dateElement =
    document.getElementById(
      "currentDate"
    );

  if (dateElement) {
    dateElement.textContent =
      now.toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
  }

  const timeElement =
    document.getElementById(
      "currentTime"
    );

  if (timeElement) {
    timeElement.textContent =
      now.toLocaleTimeString(
        "en-IN"
      );
  }
}

/* =========================================================
   PROFILE MENU
========================================================= */

function setupProfileMenu() {
  const profileBtn =
    document.getElementById(
      "profileBtn"
    );

  const profileDropdown =
    document.getElementById(
      "profileDropdown"
    );

  if (
    !profileBtn ||
    !profileDropdown
  ) {
    return;
  }

  profileBtn.addEventListener(
    "click",
    function (event) {
      event.stopPropagation();

      profileDropdown.classList.toggle(
        "show"
      );
    }
  );

  document.addEventListener(
    "click",
    function () {
      profileDropdown.classList.remove(
        "show"
      );
    }
  );
}

/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {
  const logoutBtn =
    document.getElementById(
      "logoutBtn"
    );

  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener(
    "click",
    function () {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "full_name"
      );

      localStorage.removeItem(
        "role"
      );

      window.location.href =
        "login.html";
    }
  );
}

setupProfileMenu();

setupLogout();

/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}