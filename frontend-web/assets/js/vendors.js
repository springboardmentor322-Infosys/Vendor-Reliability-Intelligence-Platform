let currentVendors = [];

async function loadVendors() {
  try {
    currentVendors = await Api.get("/vendors");
    renderVendors();
  } catch (err) {
    console.error("Failed to load vendors", err);
  }
}

function renderVendors() {
  const body = document.getElementById("vendors-body");
  const empty = document.getElementById("vendors-empty");
  const user = Auth.getUser();
  const canApprove = user && VENDOR_APPROVE_ROLES.includes(user.role);

  if (currentVendors.length === 0) {
    body.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  body.innerHTML = currentVendors
    .map((v) => {
      const actions = canApprove ? approvalActionsHtml(v) : "";
      return `
      <tr>
        <td>
          <div class="vendor-row-name">
            ${gaugeHtml(v.reliability_score)}
            <div>
              <div class="company">${escapeHtml(v.company_name)}</div>
              <div class="category">${CATEGORY_LABELS[v.category] || v.category}</div>
            </div>
          </div>
        </td>
        <td>${CATEGORY_LABELS[v.category] || v.category}</td>
        <td>${escapeHtml(v.contact_email || "—")}</td>
        <td>${badgeHtml(v.status)}</td>
        <td class="mono">${Math.round(v.reliability_score || 0)}/100</td>
        <td>${actions}</td>
      </tr>`;
    })
    .join("");

  // Wire up approve/reject buttons after render
  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", () => setVendorStatus(btn.dataset.approve, "approved"))
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", () => setVendorStatus(btn.dataset.reject, "rejected"))
  );
}

function approvalActionsHtml(vendor) {
  if (vendor.status !== "pending_approval") return "";
  return `
    <div style="display:flex; gap:6px;">
      <button class="btn btn-accent" style="padding:6px 12px;" data-approve="${vendor.id}">Approve</button>
      <button class="btn btn-danger" style="padding:6px 12px;" data-reject="${vendor.id}">Reject</button>
    </div>`;
}

async function setVendorStatus(vendorId, status) {
  try {
    await Api.patch(`/vendors/${vendorId}/status`, { status });
    await loadVendors();
  } catch (err) {
    alert(err.message || "Could not update vendor status.");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- Create vendor modal ----------
const backdrop = document.getElementById("create-modal-backdrop");
const openBtn = document.getElementById("open-create-modal");
const closeBtn = document.getElementById("close-create-modal");
const createForm = document.getElementById("create-vendor-form");

function openModal() {
  const user = Auth.getUser();
  if (user && !VENDOR_MANAGE_ROLES.includes(user.role)) {
    alert("Your role does not have permission to register vendors.");
    return;
  }
  backdrop.classList.add("show");
}
function closeModal() {
  backdrop.classList.remove("show");
  createForm.reset();
  document.getElementById("create-banner").className = "banner";
}

openBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("create-submit-btn");
  const banner = document.getElementById("create-banner");
  banner.className = "banner";

  const payload = {
    company_name: document.getElementById("company_name").value.trim(),
    category: document.getElementById("category").value,
    contact_email: document.getElementById("contact_email").value.trim() || undefined,
    contact_phone: document.getElementById("contact_phone").value.trim() || undefined,
  };

  if (!payload.company_name) {
    banner.textContent = "Company name is required";
    banner.className = "banner show banner-error";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Registering…";

  try {
    await Api.post("/vendors", payload);
    closeModal();
    await loadVendors();
  } catch (err) {
    banner.textContent = err.message || "Could not register vendor.";
    banner.className = "banner show banner-error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Register vendor";
  }
});

document.addEventListener("DOMContentLoaded", loadVendors);
