let currentAuditPage = 1;
const auditPageSize = 20;

async function loadAuditLogs() {
  const tbody = document.getElementById("auditLogsBody");

  if (!tbody) {
    return;
  }

  tbody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                Loading audit logs...
            </td>
        </tr>
    `;

  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      window.location.href = "login.html";
      return;
    }

    const search = document.getElementById("searchAudit")?.value.trim();

    const action = document.getElementById("actionFilter")?.value;

    const module = document.getElementById("moduleFilter")?.value;

    const role = document.getElementById("roleFilter")?.value;

    const params = new URLSearchParams();

    params.set("page", currentAuditPage);

    params.set("limit", auditPageSize);

    if (search) {
      params.set("search", search);
    }

    if (action) {
      params.set("action", action);
    }

    if (module) {
      params.set("module", module);
    }

    if (role) {
      params.set("role", role);
    }

    const response = await apiRequest(
      `/audit-logs?${params.toString()}`,
      "GET",
      null,
      token,
    );

    const logs = response.logs || [];

    renderAuditLogs(logs);

    updateAuditSummary(logs, response.total || 0);

    updatePagination(response);
  } catch (error) {
    console.error("Failed to load audit logs:", error);

    tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-cell"
                >
                    Unable to load audit logs.
                </td>
            </tr>
        `;
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById("auditLogsBody");

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-cell"
                >
                    No audit activity found.
                </td>
            </tr>
        `;

    return;
  }

  tbody.innerHTML = logs
    .map((log) => {
      const actionClass = String(log.action || "")
        .toLowerCase()
        .replaceAll(" ", "_");

      const createdAt = log.created_at ? formatAuditDate(log.created_at) : "-";

      return `
            <tr>

                <td>
                    ${escapeHtml(createdAt)}
                </td>

                <td>
                    ${escapeHtml(log.user_name || "System")}
                </td>

                <td>
                    ${escapeHtml(log.user_role || "-")}
                </td>

                <td>

                    <span
                        class="audit-action ${actionClass}"
                    >
                        ${escapeHtml(log.action || "-")}
                    </span>

                </td>

                <td>
                    ${escapeHtml(log.module || "-")}
                </td>

                <td>
                    ${escapeHtml(log.description || "-")}
                </td>

                <td>

                    <button
                        class="details-btn"
                        type="button"
                        onclick="showAuditDetails(${log.id})"
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>

                </td>

            </tr>
        `;
    })
    .join("");
}

async function showAuditDetails(logId) {
  try {
    const token = localStorage.getItem("access_token");

    const log = await apiRequest(`/audit-logs/${logId}`, "GET", null, token);

    const oldValues = log.old_values
      ? JSON.stringify(log.old_values, null, 2)
      : "None";

    const newValues = log.new_values
      ? JSON.stringify(log.new_values, null, 2)
      : "None";

    alert(
      `Audit Log #${log.id}\n\n` +
        `User: ${log.user_name || "System"}\n` +
        `Role: ${log.user_role || "-"}\n` +
        `Action: ${log.action}\n` +
        `Module: ${log.module}\n` +
        `Entity: ${log.entity_type || "-"} #${log.entity_id || "-"}\n\n` +
        `Description:\n${log.description}\n\n` +
        `Old Values:\n${oldValues}\n\n` +
        `New Values:\n${newValues}\n\n` +
        `IP Address: ${log.ip_address || "-"}`,
    );
  } catch (error) {
    console.error("Failed to load audit details:", error);

    alert("Unable to load audit log details.");
  }
}

function updateAuditSummary(logs, total) {
  const totalElement = document.getElementById("totalActivity");

  const usersElement = document.getElementById("usersTracked");

  const latestElement = document.getElementById("latestActivity");

  if (totalElement) {
    totalElement.textContent = total;
  }

  if (usersElement) {
    const uniqueUsers = new Set(logs.map((log) => log.user_id).filter(Boolean));

    usersElement.textContent = uniqueUsers.size;
  }

  if (latestElement && logs.length > 0) {
    latestElement.textContent = formatAuditDate(logs[0].created_at);
  } else if (latestElement) {
    latestElement.textContent = "-";
  }
}

function updatePagination(response) {
  const pageNumber = document.getElementById("pageNumber");

  const previous = document.getElementById("previousPage");

  const next = document.getElementById("nextPage");

  const page = response.page || 1;

  const totalPages = response.total_pages || 1;

  if (pageNumber) {
    pageNumber.textContent = `Page ${page} of ${totalPages}`;
  }

  if (previous) {
    previous.disabled = page <= 1;
  }

  if (next) {
    next.disabled = page >= totalPages;
  }
}

function formatAuditDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initializeAuditLogs() {
  document
    .getElementById("refreshAuditLogs")
    ?.addEventListener("click", function () {
      loadAuditLogs();
    });

  document
    .getElementById("actionFilter")
    ?.addEventListener("change", function () {
      currentAuditPage = 1;
      loadAuditLogs();
    });

  document
    .getElementById("moduleFilter")
    ?.addEventListener("change", function () {
      currentAuditPage = 1;
      loadAuditLogs();
    });

  document
    .getElementById("roleFilter")
    ?.addEventListener("change", function () {
      currentAuditPage = 1;
      loadAuditLogs();
    });

  let searchTimer;

  document
    .getElementById("searchAudit")
    ?.addEventListener("input", function () {
      clearTimeout(searchTimer);

      searchTimer = setTimeout(function () {
        currentAuditPage = 1;
        loadAuditLogs();
      }, 350);
    });

  document
    .getElementById("previousPage")
    ?.addEventListener("click", function () {
      if (currentAuditPage > 1) {
        currentAuditPage--;

        loadAuditLogs();
      }
    });

  document.getElementById("nextPage")?.addEventListener("click", function () {
    currentAuditPage++;

    loadAuditLogs();
  });

  loadAuditLogs();
}

window.addEventListener("load", initializeAuditLogs);
