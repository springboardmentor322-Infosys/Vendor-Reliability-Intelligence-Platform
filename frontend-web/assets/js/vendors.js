let currentVendors = [];
const vendorEsc = value => { const node = document.createElement("div"); node.textContent = value ?? ""; return node.innerHTML; };

async function loadVendors() { try { currentVendors = await Api.get("/vendors"); renderVendors(); } catch (error) { alert(error.message || "Could not load vendors."); } }

function renderVendors() {
  const body = document.getElementById("vendors-body");
  const empty = document.getElementById("vendors-empty");
  const user = Auth.getUser();
  const canApprove = user && VENDOR_APPROVE_ROLES.includes(user.role);
  const search = document.getElementById("vendor-search").value.trim().toLowerCase();
  const filter = document.getElementById("vendor-status-filter").value;
  const vendors = currentVendors.filter(vendor => (!filter || vendor.status === filter) && (!search || `${vendor.company_name} ${vendor.category} ${vendor.contact_email || ""}`.toLowerCase().includes(search)));
  if (!vendors.length) { body.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  body.innerHTML = vendors.map(vendor => {
    const canEdit = user && (VENDOR_MANAGE_ROLES.includes(user.role) || user.role === "vendor");
    const actions = `${canApprove ? approvalActionsHtml(vendor) : ""}${canEdit ? `<button class="btn btn-ghost" style="padding:6px 12px;margin-left:6px" data-edit="${vendor.id}">Edit</button>` : ""}`;
    return `<tr><td><div class="vendor-row-name">${gaugeHtml(vendor.reliability_score)}<div><div class="company">${vendorEsc(vendor.company_name)}</div><div class="category">${vendorEsc(vendor.city || CATEGORY_LABELS[vendor.category] || vendor.category)}</div></div></div></td><td>${CATEGORY_LABELS[vendor.category] || vendor.category}</td><td>${vendorEsc(vendor.contact_email || "-")}<br><small>${vendorEsc(vendor.contact_phone || "")}</small></td><td>${badgeHtml(vendor.status)}</td><td class="mono">${Math.round(vendor.reliability_score || 0)}/100</td><td>${actions}</td></tr>`;
  }).join("");
  body.querySelectorAll("[data-approve]").forEach(button => button.onclick = () => setVendorStatus(button.dataset.approve, "approved"));
  body.querySelectorAll("[data-reject]").forEach(button => button.onclick = () => setVendorStatus(button.dataset.reject, "rejected"));
  body.querySelectorAll("[data-review]").forEach(button => button.onclick = () => setVendorStatus(button.dataset.review, "under_review"));
  body.querySelectorAll("[data-edit]").forEach(button => button.onclick = () => editVendor(button.dataset.edit));
}

function approvalActionsHtml(vendor) { if (!["pending_approval", "under_review"].includes(vendor.status)) return ""; return `<div style="display:flex;gap:6px">${vendor.status === "pending_approval" ? `<button class="btn btn-ghost" style="padding:6px 10px" data-review="${vendor.id}">Review</button>` : ""}<button class="btn btn-accent" style="padding:6px 10px" data-approve="${vendor.id}">Approve</button><button class="btn btn-danger" style="padding:6px 10px" data-reject="${vendor.id}">Reject</button></div>`; }
async function setVendorStatus(id, status) { try { await Api.patch(`/vendors/${id}/status`, { status }); await loadVendors(); } catch (error) { alert(error.message || "Could not update this vendor."); } }
async function editVendor(id) { const vendor = currentVendors.find(item => item.id === id); const company_name = prompt("Company name", vendor.company_name); if (!company_name) return; const contact_email = prompt("Contact email", vendor.contact_email || ""); const contact_phone = prompt("Contact phone", vendor.contact_phone || ""); const city = prompt("City", vendor.city || ""); try { await Api.patch(`/vendors/${id}`, { company_name, contact_email: contact_email || null, contact_phone: contact_phone || null, city: city || null }); await loadVendors(); } catch (error) { alert(error.message || "Could not update vendor."); } }

const backdrop = document.getElementById("create-modal-backdrop");
const form = document.getElementById("create-vendor-form");
function openModal() { if (!VENDOR_MANAGE_ROLES.includes(Auth.getUser()?.role)) return alert("Your role does not have permission to register vendors."); backdrop.classList.add("show"); }
function closeModal() { backdrop.classList.remove("show"); form.reset(); document.getElementById("create-banner").className = "banner"; }
document.getElementById("open-create-modal").onclick = openModal;
document.getElementById("close-create-modal").onclick = closeModal;
backdrop.onclick = event => { if (event.target === backdrop) closeModal(); };
form.onsubmit = async event => { event.preventDefault(); const button = document.getElementById("create-submit-btn"); const banner = document.getElementById("create-banner"); const payload = { company_name: document.getElementById("company_name").value.trim(), category: document.getElementById("category").value, contact_name: document.getElementById("contact_name").value.trim() || undefined, contact_email: document.getElementById("contact_email").value.trim() || undefined, contact_phone: document.getElementById("contact_phone").value.trim() || undefined, city: document.getElementById("vendor-city").value.trim() || undefined, country: document.getElementById("vendor-country").value.trim() || undefined, gst_number: document.getElementById("vendor-gst").value.trim() || undefined }; if (!payload.company_name) { banner.textContent = "Company name is required"; banner.className = "banner show banner-error"; return; } button.disabled = true; button.textContent = "Registering..."; try { await Api.post("/vendors", payload); closeModal(); await loadVendors(); } catch (error) { banner.textContent = error.message || "Could not register vendor."; banner.className = "banner show banner-error"; } finally { button.disabled = false; button.textContent = "Register vendor"; } };
document.getElementById("vendor-search").oninput = renderVendors;
document.getElementById("vendor-status-filter").onchange = renderVendors;
document.addEventListener("DOMContentLoaded", loadVendors);
