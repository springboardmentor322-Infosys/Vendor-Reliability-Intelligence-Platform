/**
 * CSV export endpoints require the JWT (they're protected routes), so we
 * can't just use a plain <a href>. We fetch the file with the auth header,
 * then trigger a browser download from the resulting blob.
 */
async function downloadCsv(path, filename) {
  const token = Auth.getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    alert("Could not generate report.");
    return;
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

document.getElementById("download-vendor-report").addEventListener("click", () =>
  downloadCsv("/reports/vendor-performance.csv", "vendor_performance_report.csv")
);
document.getElementById("download-po-report").addEventListener("click", () =>
  downloadCsv("/reports/purchase-orders.csv", "purchase_orders_report.csv")
);

async function loadRanking() {
  try {
    const ranking = await Api.get("/performance/ranking");
    const body = document.getElementById("ranking-body");
    if (ranking.length === 0) {
      body.innerHTML = `<tr><td colspan="3" class="empty-state">No vendors yet</td></tr>`;
      return;
    }
    body.innerHTML = ranking
      .map(
        (r, i) => `
      <tr>
        <td class="mono">#${i + 1}</td>
        <td>
          <div class="vendor-row-name">
            ${gaugeHtml(r.reliability_score)}
            <div class="company">${escapeHtml(r.company_name)}</div>
          </div>
        </td>
        <td class="mono">${Math.round(r.reliability_score)}/100</td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error("Failed to load ranking", err);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", loadRanking);
