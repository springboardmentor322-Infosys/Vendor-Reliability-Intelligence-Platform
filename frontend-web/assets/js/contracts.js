let currentContracts = [];
let vendorsMap = {};

async function loadVendorsForSelect() {
  const vendors = await Api.get("/vendors");
  vendorsMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
  const select = document.getElementById("vendor_id");
  select.innerHTML = vendors
    .map((v) => `<option value="${v.id}">${escapeHtml(v.company_name)}</option>`)
    .join("");
}

async function loadContracts() {
  try {
    // Ensure vendor names are available for display even before opening the modal
    if (Object.keys(vendorsMap).length === 0) {
      const vendors = await Api.get("/vendors");
      vendorsMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
    }
    currentContracts = await Api.get("/contracts");
    renderContracts();
  } catch (err) {
    console.error("Failed to load contracts", err);
  }
}

function renderContracts() {
  const body = document.getElementById("contracts-body");
  const empty = document.getElementById("contracts-empty");

  if (currentContracts.length === 0) {
    body.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  body.innerHTML = currentContracts
    .map((c) => {
      const vendor = vendorsMap[c.vendor_id];
      const endDate = new Date(c.end_date).toLocaleDateString();
      const complianceBadge = c.is_compliant
        ? `<span class="badge badge-approved"><span class="badge-dot"></span>Compliant</span>`
        : `<span class="badge badge-rejected"><span class="badge-dot"></span>Non-compliant</span>`;

      return `
      <tr>
        <td>
          <div class="company">${escapeHtml(c.title)}</div>
          <div class="category mono">${escapeHtml(c.contract_number)}</div>
        </td>
        <td>${vendor ? escapeHtml(vendor.company_name) : c.vendor_id.slice(0, 8)}</td>
        <td class="mono">${endDate}</td>
        <td>${complianceBadge}</td>
        <td>${badgeHtml(c.status)}</td>
      </tr>`;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- Create contract modal ----------
const backdrop = document.getElementById("create-modal-backdrop");
const openBtn = document.getElementById("open-create-modal");
const closeBtn = document.getElementById("close-create-modal");
const createForm = document.getElementById("create-contract-form");

async function openModal() {
  const user = Auth.getUser();
  if (user && !["administrator", "procurement_manager", "auditor"].includes(user.role)) {
    alert("Your role does not have permission to create contracts.");
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

  const startDate = document.getElementById("start_date").value;
  const endDate = document.getElementById("end_date").value;

  const payload = {
    vendor_id: document.getElementById("vendor_id").value,
    title: document.getElementById("title").value.trim(),
    contract_number: document.getElementById("contract_number").value.trim(),
    start_date: startDate ? `${startDate}T00:00:00` : null,
    end_date: endDate ? `${endDate}T00:00:00` : null,
  };

  if (!payload.vendor_id || !payload.title || !payload.contract_number || !startDate || !endDate) {
    banner.textContent = "All fields are required";
    banner.className = "banner show banner-error";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";

  try {
    await Api.post("/contracts", payload);
    closeModal();
    await loadContracts();
  } catch (err) {
    banner.textContent = err.message || "Could not create contract.";
    banner.className = "banner show banner-error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create contract";
  }
});

document.addEventListener("DOMContentLoaded", loadContracts);
