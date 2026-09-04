let managedVendors = [];

const labelRole = role => String(role || "").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const userEsc = value => {
  const node = document.createElement("div");
  node.textContent = value ?? "";
  return node.innerHTML;
};

function notice(message, success = true) {
  const target = document.getElementById("user-result");
  target.textContent = message;
  target.className = `banner show ${success ? "banner-success" : "banner-error"}`;
}

function vendorOptions(selectedId) {
  return `<option value="">Not linked</option>${managedVendors.map(vendor =>
    `<option value="${vendor.id}" ${vendor.id === selectedId ? "selected" : ""}>${userEsc(vendor.company_name)}</option>`
  ).join("")}`;
}

async function saveVendorLink(userId) {
  const selector = document.querySelector(`.vendor-link-select[data-user-id="${userId}"]`);
  const button = document.querySelector(`.save-vendor-link[data-user-id="${userId}"]`);
  button.disabled = true;
  try {
    await Api.patch(`/auth/users/${userId}/vendor-link`, { vendor_id: selector.value || null });
    notice(selector.value ? "Vendor account linked successfully." : "Vendor link removed.");
    await loadUsers();
  } catch (error) {
    notice(error.message || "Could not update the vendor link.", false);
    button.disabled = false;
  }
}

async function loadUsers() {
  const [users, vendors] = await Promise.all([Api.get("/auth/directory"), Api.get("/vendors")]);
  managedVendors = vendors;
  document.getElementById("new-user-vendor").innerHTML = vendorOptions(null);
  document.getElementById("directory-count").textContent = `${users.length} accounts`;
  document.getElementById("directory-body").innerHTML = users.map(user => {
    const isVendor = user.role === "vendor";
    const linkControl = isVendor
      ? `<select class="vendor-link-select" data-user-id="${user.id}">${vendorOptions(user.vendor_id)}</select>`
      : "-";
    const action = isVendor
      ? `<button type="button" class="btn btn-ghost save-vendor-link" data-user-id="${user.id}">Save link</button>`
      : "-";
    return `<tr><td><b>${userEsc(user.full_name)}</b><br><small>${userEsc(user.email)}</small></td><td>${labelRole(user.role)}</td><td>${linkControl}</td><td><span class="status-light ${user.is_active ? "" : "danger"}">${user.is_active ? "Active" : "Disabled"}</span></td><td>${action}</td></tr>`;
  }).join("");
  document.querySelectorAll(".save-vendor-link").forEach(button => {
    button.addEventListener("click", () => saveVendorLink(button.dataset.userId));
  });
}

function protectPage() {
  if (Auth.getUser()?.role !== "administrator") {
    document.querySelector("main").innerHTML = '<div class="auth-card"><h1>Administrator access required</h1><p class="lead">Only administrators can provision role accounts.</p><a class="btn btn-primary" href="dashboard.html">Return to dashboard</a></div>';
    return false;
  }
  return true;
}

document.getElementById("user-form").addEventListener("submit", async event => {
  event.preventDefault();
  const role = document.getElementById("new-user-role").value;
  const vendorId = document.getElementById("new-user-vendor").value;
  if (role === "vendor" && !vendorId) return notice("Choose a linked vendor for a Vendor account.", false);
  if (role !== "vendor" && vendorId) return notice("Only Vendor accounts may be linked to a vendor.", false);
  try {
    await Api.post("/auth/users", {
      full_name: document.getElementById("new-user-name").value.trim(),
      email: document.getElementById("new-user-email").value.trim(),
      password: document.getElementById("new-user-password").value,
      role,
      vendor_id: vendorId || null,
    });
    event.target.reset();
    notice("Role account created. The user can now sign in through the same login page.");
    await loadUsers();
  } catch (error) {
    notice(error.message || "Could not create account.", false);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  if (protectPage()) await loadUsers();
});
