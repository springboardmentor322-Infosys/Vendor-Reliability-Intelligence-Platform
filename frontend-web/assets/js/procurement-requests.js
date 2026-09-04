let requests = [];
let requestVendors = [];
const REVIEW_ROLES = ["administrator", "procurement_manager", "finance_officer"];
const CREATE_ROLES = ["administrator", "procurement_manager", "supply_chain_manager"];
const esc = value => { const el = document.createElement("div"); el.textContent = value || ""; return el.innerHTML; };

function lineItemHtml() { return `<div class="form-grid request-item" style="border:1px solid var(--line);border-radius:9px;padding:10px;margin-bottom:8px"><div class="field"><label>Item / service</label><input class="line-name" required placeholder="Item name"></div><div class="field"><label>Quantity</label><input class="line-quantity" type="number" min="1" value="1" required></div><div class="field"><label>Estimated unit cost</label><input class="line-cost" type="number" min="0" step="0.01" value="0" required></div><div class="field" style="justify-content:flex-end"><button type="button" class="btn btn-danger remove-line" style="padding:7px 10px">Remove</button></div></div>`; }
function calculateTotal() { const total = [...document.querySelectorAll(".request-item")].reduce((sum,row) => sum + Number(row.querySelector(".line-quantity").value || 0) * Number(row.querySelector(".line-cost").value || 0), 0); document.getElementById("request-amount").value = total.toFixed(2); }
function addLine() { document.getElementById("line-items").insertAdjacentHTML("beforeend", lineItemHtml()); const row = document.querySelector("#line-items .request-item:last-child"); row.querySelectorAll("input").forEach(input => input.addEventListener("input", calculateTotal)); row.querySelector(".remove-line").onclick = () => { row.remove(); calculateTotal(); }; calculateTotal(); }

async function loadRequests() {
  [requests, requestVendors] = await Promise.all([Api.get("/procurement-requests"), Api.get("/vendors")]);
  const user = Auth.getUser();
  document.getElementById("requests-body").innerHTML = requests.map(request => {
    const review = REVIEW_ROLES.includes(user?.role) && request.status === "submitted" ? `<button class="btn btn-ghost" data-review="${request.id}" data-status="approved">Approve</button> <button class="btn btn-danger" data-review="${request.id}" data-status="rejected">Reject</button>` : "";
    const convert = ["administrator", "procurement_manager"].includes(user?.role) && request.status === "approved" ? `<button class="btn btn-accent" data-convert="${request.id}" style="margin-left:5px">Create PO</button>` : "";
    return `<tr><td><b>${esc(request.request_number)}</b><br><small>${esc(request.title)}</small></td><td>${esc(request.department || "-")}</td><td>${esc(request.category || "-")}</td><td class="mono">$${Number(request.estimated_amount).toLocaleString()}</td><td>${badgeHtml(request.status)}</td><td>${review}${convert}</td></tr>`;
  }).join("") || '<tr><td colspan="6" class="empty-state">No requests yet.</td></tr>';
  document.querySelectorAll("[data-review]").forEach(button => button.onclick = () => review(button.dataset.review, button.dataset.status));
  document.querySelectorAll("[data-convert]").forEach(button => button.onclick = () => convertToPurchaseOrder(button.dataset.convert));
}

async function review(id, status) { try { await Api.patch(`/procurement-requests/${id}/review`, { status }); await loadRequests(); } catch (error) { alert(error.message); } }
async function convertToPurchaseOrder(id) { const available = requestVendors.filter(vendor => vendor.status === "approved"); if (!available.length) return alert("Create and approve a vendor before converting this request."); const choices = available.map((vendor,index) => `${index + 1}. ${vendor.company_name}`).join("\n"); const selection = Number(prompt(`Choose the vendor number for this purchase order:\n${choices}`)); const vendor = available[selection - 1]; if (!vendor) return; try { const result = await Api.post(`/procurement-requests/${id}/convert-to-po`, { vendor_id: vendor.id }); alert(`${result.message}: ${result.po_number}`); await loadRequests(); } catch (error) { alert(error.message); } }

const modal = document.getElementById("request-modal");
document.getElementById("open-request").onclick = () => { if (!CREATE_ROLES.includes(Auth.getUser()?.role)) return alert("Your role cannot create procurement requests."); modal.classList.add("show"); if (!document.querySelector(".request-item")) addLine(); };
document.getElementById("close-request").onclick = () => modal.classList.remove("show");
document.getElementById("add-line-item").onclick = addLine;
document.getElementById("request-form").onsubmit = async event => { event.preventDefault(); const items = [...document.querySelectorAll(".request-item")].map(row => ({ item_name: row.querySelector(".line-name").value.trim(), quantity: Number(row.querySelector(".line-quantity").value), estimated_unit_cost: row.querySelector(".line-cost").value })); if (!items.length || items.some(item => !item.item_name)) return alert("Add at least one complete line item."); try { await Api.post("/procurement-requests", { title: document.getElementById("request-title").value.trim(), description: document.getElementById("request-description").value.trim(), department: document.getElementById("request-department").value.trim() || null, category: document.getElementById("request-category").value.trim() || null, estimated_amount: document.getElementById("request-amount").value, items }); modal.classList.remove("show"); event.target.reset(); document.getElementById("line-items").innerHTML = ""; await loadRequests(); } catch (error) { alert(error.message); } };
document.addEventListener("DOMContentLoaded", loadRequests);
