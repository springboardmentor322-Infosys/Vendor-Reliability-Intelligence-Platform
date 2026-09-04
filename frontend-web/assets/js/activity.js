function activityEscape(value) {
  const node = document.createElement("div");
  node.textContent = value ?? "";
  return node.innerHTML;
}

async function loadActivity() {
  try {
    const entries = await Api.get("/activity");
    document.getElementById("activity-count").textContent = `${entries.length} entries`;
    document.getElementById("activity-empty").style.display = entries.length ? "none" : "block";
    document.getElementById("activity-body").innerHTML = entries.map(entry => `
      <tr>
        <td>${activityEscape(new Date(entry.created_at).toLocaleString())}</td>
        <td><b>${activityEscape(entry.action)}</b></td>
        <td>${activityEscape(entry.entity_type)}</td>
        <td>${activityEscape(entry.detail || "-")}</td>
      </tr>`).join("");
  } catch (error) {
    document.getElementById("activity-body").innerHTML = `<tr><td colspan="4">${activityEscape(error.message)}</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", loadActivity);
