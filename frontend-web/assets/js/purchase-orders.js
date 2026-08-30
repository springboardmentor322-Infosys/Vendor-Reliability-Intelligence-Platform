let currentPOs = [];
let currentVendorsMap = {};

async function loadVendorsForSelect() {
  const vendors = await Api.get("/vendors");
  currentVendorsMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
  const select = document.getElementById("vendor_id");
  select.innerHTML = vendors
    .map((v) => `<option value="${v.id}">${escapeHtml(v.company_name)}</option>`)
    .join("");
}

async function loadPOs() {
  try {
    if (Object.keys(currentVendorsMap).length === 0) {
      const vendors = await Api.get("/vendors");
      currentVendorsMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
    }
    currentPOs = await Api.get("/purchase-orders");
    renderPOs();
  } catch (err) {
    console.error("Failed to load purchase orders", err);
  }
}

function renderPOs() {
  const body = document.getElementById("po-body");
  const empty = document.getElementById("po-empty");
  const user = Auth.getUser();
  const canAdvance = user && VENDOR_APPROVE_ROLES.includes(user.role);

  if (currentPOs.length === 0) {
    body.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  body.innerHTML = currentPOs
    .map((po) => {
      const vendor = currentVendorsMap[po.vendor_id];
      const nextStatus = nextStatusFor(po.status);
      const actions =
        canAdvance && nextStatus
          ? `<button class="btn btn-ghost" style="padding:6px 12px;" data-advance="${po.id}" data-next="${nextStatus}">Mark as ${STATUS_LABELS[nextStatus]}</button>`
          : "";
      const cancelBtn =
        canAdvance && !["completed", "cancelled"].includes(po.status)
          ? `<button class="btn btn-danger" style="padding:6px 12px; margin-left:6px;" data-cancel="${po.id}">Cancel</button>`
          : "";

      return `
      <tr>
        <td class="mono">${po.po_number}</td>
        <td>${vendor ? escapeHtml(vendor.company_name) : po.vendor_id.slice(0, 8)}</td>
        <td>${escapeHtml(po.description)}</td>
        <td class="mono">$${Number(po.total_amount).toLocaleString()}</td>
        <td>${badgeHtml(po.status)}</td>
        <td>${actions}${cancelBtn}</td>
      </tr>`;
    })
    .join("");

  body.querySelectorAll("[data-advance]").forEach((btn) =>
    btn.addEventListener("click", () => updatePOStatus(btn.dataset.advance, btn.dataset.next))
  );
  body.querySelectorAll("[data-cancel]").forEach((btn) =>
    btn.addEventListener("click", () => updatePOStatus(btn.dataset.cancel, "cancelled"))
  );
}

function nextStatusFor(status) {
  const idx = PO_STATUS_FLOW.indexOf(status);
  if (idx === -1 || idx >= PO_STATUS_FLOW.length - 2) return null; // stop before "cancelled"
  return PO_STATUS_FLOW[idx + 1];
}

async function updatePOStatus(id, status) {
  try {
    await Api.patch(`/purchase-orders/${id}/status`, { status });
    await loadPOs();
  } catch (err) {
    alert(err.message || "Could not update purchase order.");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- Create PO modal ----------
const backdrop = document.getElementById("create-modal-backdrop");
const openBtn = document.getElementById("open-create-modal");
const closeBtn = document.getElementById("close-create-modal");
const createForm = document.getElementById("create-po-form");

async function openModal() {
  const user = Auth.getUser();
  if (user && !VENDOR_MANAGE_ROLES.includes(user.role)) {
    alert("Your role does not have permission to create purchase orders.");
    return;
  }
  await loadVendorsForSelect();
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
    vendor_id: document.getElementById("vendor_id").value,
    description: document.getElementById("description").value.trim(),
    quantity: Number(document.getElementById("quantity").value) || 1,
    unit_price: Number(document.getElementById("unit_price").value) || 0,
  };

  if (!payload.vendor_id || !payload.description) {
    banner.textContent = "Vendor and description are required";
    banner.className = "banner show banner-error";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";

  try {
    await Api.post("/purchase-orders", payload);
    closeModal();
    await loadPOs();
  } catch (err) {
    banner.textContent = err.message || "Could not create purchase order.";
    banner.className = "banner show banner-error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create purchase order";
  }
});

document.addEventListener("DOMContentLoaded", loadPOs);
