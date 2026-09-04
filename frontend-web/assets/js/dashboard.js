async function loadDashboard() {
  try {
    const [vendors, overview] = await Promise.all([Api.get("/vendors"), Api.get("/analytics/overview")]);

    const total = overview.total_vendors;
    const approved = overview.approved_vendors;
    const pending = overview.pending_requests;
    const avgScore = overview.average_reliability;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-approved").textContent = approved;
    document.querySelector("#stat-pending").previousElementSibling.textContent = "Pending requests";
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-avg-score").textContent = total ? avgScore : "—";

    const recent = [...vendors]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);

    const body = document.getElementById("recent-vendors-body");
    const emptyState = document.getElementById("dashboard-empty");

    if (recent.length === 0) {
      body.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    body.innerHTML = recent
      .map(
        (v) => `
      <tr>
        <td>
          <div class="vendor-row-name">
            ${gaugeHtml(v.reliability_score)}
            <div>
              <div class="company">${escapeHtml(v.company_name)}</div>
            </div>
          </div>
        </td>
        <td>${CATEGORY_LABELS[v.category] || v.category}</td>
        <td>${badgeHtml(v.status)}</td>
        <td class="mono">${Math.round(v.reliability_score || 0)}/100</td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error("Failed to load dashboard data", err);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", loadDashboard);
