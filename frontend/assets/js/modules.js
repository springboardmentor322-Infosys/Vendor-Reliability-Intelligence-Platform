(() => {
  "use strict";

  const api = window.VendorIQApi;
  const auth = window.VendorIQAuth;
  const page = document.body.dataset.module;
  const $ = (selector) => document.querySelector(selector);
  const state = { user: null, roles: [], items: [], filtered: [], page: 1, pageSize: 8, categories: [], vendors: [], requests: [], orders: [], contracts: [], provisioningRoles: [], editing: null, invitingVendor: null, linkingUser: null };
  const moduleConfig = {
    vendors: { title: "Vendor management", path: "/vendors", singular: "Vendor", search: "Search company, registration or city", createRoles: ["Administrator", "Procurement Manager"] },
    procurement: { title: "Procurement requests", path: "/procurement-requests", singular: "Procurement request", search: "Search request title, department or status", createRoles: ["Procurement Manager"] },
    purchaseOrders: { title: "Purchase orders", path: "/purchase-orders", singular: "Purchase order", search: "Search PO number, vendor or status", createRoles: ["Procurement Manager"] },
    contracts: { title: "Contracts", path: "/contracts", singular: "Contract", search: "Search contract number, vendor or compliance", createRoles: ["Procurement Manager"] },
    users: { title: "User management", path: "/users", singular: "User", search: "Search users", createRoles: ["Administrator"] },
    auditLogs: { title: "Audit logs", path: "/audit-logs", singular: "Audit log", search: "Search logs", createRoles: [] }
  };
  const current = moduleConfig[page];
  const visibleFor = {
    vendors: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"],
    procurement: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"],
    purchaseOrders: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Vendor", "Auditor"],
    contracts: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Vendor", "Auditor"],
    users: ["Administrator"],
    auditLogs: ["Administrator", "Auditor"]
  };

  const escape = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
  const dateText = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
  const dateInput = (value) => value ? String(value).slice(0, 10) : "";
  const statusBadge = (value) => `<span class="status-badge status-${String(value || "pending").toLowerCase().replaceAll(" ", "-")}">${escape(value || "Pending")}</span>`;
  const hasRole = (...roles) => roles.some((role) => state.roles.includes(role));
  const canCreate = () => hasRole(...current.createRoles);
  const showToast = (message, type = "success") => { $("#toastMessage").textContent = message; const toast = $("#liveToast"); toast.className = `toast align-items-center text-bg-${type} border-0`; bootstrap.Toast.getOrCreateInstance(toast).show(); };
  const setBusy = (busy) => $("#spinnerOverlay").classList.toggle("show", busy);
  const optionList = (items, selected, label) => items.map((item) => `<option value="${item.id}" ${String(item.id) === String(selected) ? "selected" : ""}>${escape(label(item))}</option>`).join("");
  const request = (path, options = {}) => api.request(path, { token: auth.getAccessToken(), ...options });

  async function downloadCsv() {
    setBusy(true);
    try {
      const exportPaths = {
        vendors: "/exports/vendors",
        procurement: "/exports/procurement-requests",
        purchaseOrders: "/exports/purchase-orders",
        contracts: "/exports/contracts",
        auditLogs: "/exports/audit-logs"
      };
      const path = exportPaths[page];
      if (!path) return;
      const response = await fetch(`${api.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${auth.getAccessToken()}` }
      });
      if (!response.ok) throw new Error("Export failed.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${page}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("CSV exported successfully.");
    } catch (error) {
      showToast(error.message, "danger");
    } finally {
      setBusy(false);
    }
  }

  function shell() {
    $("#pageTitle").textContent = current.title;
    $("#topUser").textContent = `${state.user.first_name || "Account"} ${state.user.last_name || ""}`.trim();
    $("#topRole").textContent = state.roles.join(", ") || "Account";
    $("#addButton").classList.toggle("d-none", !canCreate());
    $("#addButton").textContent = `Add ${current.singular}`;

    const canExport = {
      vendors: ["Administrator", "Procurement Manager", "Auditor"],
      procurement: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"],
      purchaseOrders: ["Administrator", "Procurement Manager", "Finance Officer", "Auditor"],
      contracts: ["Administrator", "Procurement Manager", "Finance Officer", "Auditor"],
      auditLogs: ["Administrator", "Auditor"]
    }[page]?.some(role => state.roles.includes(role));

    $("#exportButton")?.remove();
    if (canExport) {
      const exportBtn = document.createElement("button");
      exportBtn.id = "exportButton";
      exportBtn.className = "btn btn-outline-secondary ms-2";
      exportBtn.innerHTML = `Export CSV`;
      exportBtn.onclick = () => downloadCsv();
      $("#addButton").parentNode.appendChild(exportBtn);
    }
    // The application-wide renderer is the only sidebar implementation.
    window.VendorIQNavigation?.render("#appSidebar", state.user, state.roles);
  }

  async function resolveUser() {
    try {
      state.user = auth.setUser(await request("/auth/me"));
    } catch (err) {
      if ((err instanceof api.ApiError && err.status === 401) || err?.message?.includes("expired")) {
        auth.clearSession();
        auth.redirectToLogin();
        return false;
      }
      state.user = auth.getUser();
    }
    if (!state.user) {
      auth.clearSession();
      auth.redirectToLogin();
      return false;
    }
    state.roles = auth.getRoleNames(state.user);
    return true;
  }

  async function loadSupportData() {
    const promises = [];
    if (["vendors", "purchaseOrders", "contracts"].includes(page)) promises.push(request("/vendors/categories").then((data) => { state.categories = data; }));
    if (["purchaseOrders", "contracts"].includes(page)) promises.push(request("/vendors?page_size=100&approval_status=Approved").then((data) => { state.vendors = data.items || []; }));
    if (page === "purchaseOrders" && !hasRole("Vendor")) promises.push(request("/procurement-requests").then((data) => { state.requests = data.filter((item) => item.status === "Approved"); }));
    if (page === "users") promises.push(Promise.all([request("/users/roles"), request("/vendors?page_size=100")]).then(([roles, vendors]) => { state.provisioningRoles = roles; state.vendors = vendors.items || []; }));
    await Promise.all(promises);
  }

  async function fetchItems() {
    let url = current.path;
    if (page === "vendors") {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      const search = $("#searchInput") ? $("#searchInput").value.trim() : ""; const category = $("#categoryFilter") ? $("#categoryFilter").value : ""; const status = $("#statusFilter")?.value || "";
      if (search) params.set("search", search); if (category) params.set("category_id", category); if (status) params.set("approval_status", status);
      url += `?${params}`;
    } else if (page === "users") {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      const search = $("#searchInput") ? $("#searchInput").value.trim() : ""; const status = $("#statusFilter")?.value || "";
      if (search) params.set("search", search);
      if (status) params.set("is_active", status === "Active" ? "true" : "false");
      url += `?${params}`;
    } else if (page === "auditLogs") {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      const search = $("#searchInput") ? $("#searchInput").value.trim() : "";
      if (search) params.set("search", search);
      url += `?${params}`;
    }
    const payload = await request(url);
    state.items = Array.isArray(payload) ? payload : payload.items || [];
    applyFilters();
  }

  function searchable(item) {
    const vendorName = vendorLabel(item.vendor_id);
    return [item.company_name, item.registration_number, item.city, item.approval_status, item.title, item.department, item.status, item.po_number, vendorName, item.contract_number, item.compliance_status, item.subject, item.message, item.first_name, item.last_name, item.email, item.action, item.entity].join(" ").toLowerCase();
  }
  function applyFilters() {
    const term = $("#searchInput") ? $("#searchInput").value.trim().toLowerCase() : "";
    const filterStatus = $("#statusFilter")?.value || "";
    state.filtered = state.items.filter((item) => (!term || searchable(item).includes(term)) && (!filterStatus || item.status === filterStatus || item.approval_status === filterStatus || item.compliance_status === filterStatus || (page === "users" && ((filterStatus === "Active" && item.is_active) || (filterStatus === "Inactive" && !item.is_active)))));
    state.page = Math.min(state.page, Math.max(1, Math.ceil(state.filtered.length / state.pageSize)));
    renderTable();
  }
  const vendorLabel = (id) => (state.vendors.find((vendor) => vendor.id === id) || {}).company_name || `Vendor #${id}`;
  const requestLabel = (id) => (state.requests.find((item) => item.id === id) || {}).title || `Request #${id}`;

  function renderTable() {
    const start = (state.page - 1) * state.pageSize; const rows = state.filtered.slice(start, start + state.pageSize);
    const body = $("#moduleRows");
    body.innerHTML = rows.length ? rows.map(rowHtml).join("") : `<tr><td colspan="7" class="text-center text-muted py-5">No ${current.title.toLowerCase()} found.</td></tr>`;
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    $("#paginationInfo").textContent = `${state.filtered.length ? start + 1 : 0}–${Math.min(start + state.pageSize, state.filtered.length)} of ${state.filtered.length}`;
    $("#previousPage").disabled = state.page === 1; $("#nextPage").disabled = state.page === totalPages;
    if (page === "procurement") {
      body.querySelectorAll('[data-action="review"]').forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const item = state.items.find((row) => String(row.id) === String(button.dataset.id));
          if (item) approvalReview(item);
        };
      });
    }
  }
  function actionButtons(item, extra = "") { return `<div class="btn-group btn-group-sm"><button class="btn btn-outline-primary" data-action="view" data-id="${item.id}">View</button>${canCreate() ? `<button class="btn btn-outline-secondary" data-action="edit" data-id="${item.id}">Edit</button><button class="btn btn-outline-danger" data-action="delete" data-id="${item.id}">Delete</button>` : ""}${extra}</div>`; }
  function rowHtml(item) {
    if (page === "vendors") { const transitions = hasRole("Administrator", "Procurement Manager") ? `<button class="btn btn-outline-success" data-action="approve" data-id="${item.id}">Approve</button><button class="btn btn-outline-warning" data-action="review" data-id="${item.id}">Review</button><button class="btn btn-outline-danger" data-action="reject" data-id="${item.id}">Reject</button><button class="btn btn-outline-primary" data-action="invite-vendor-user" data-id="${item.id}">Invite user</button>` : ""; return `<tr><td><strong>${escape(item.company_name)}</strong><small class="d-block text-muted">${escape(item.email)}</small></td><td>${escape(item.registration_number)}</td><td>${escape(item.city)}, ${escape(item.state)}</td><td>${categoryName(item.category_id)}</td><td>${statusBadge(item.approval_status)}</td><td>${actionButtons(item, transitions)}</td></tr>`; }
    if (page === "procurement") { const editable = hasRole("Procurement Manager") && item.created_by === state.user.id && ["Draft", "Rejected"].includes(item.status); const actions = item.status === "Pending Approval" && hasRole("Finance Officer") ? `<button class="btn btn-outline-secondary" data-action="review" data-id="${item.id}">Review</button><button class="btn btn-outline-success" data-action="approve-request" data-id="${item.id}">Approve</button><button class="btn btn-outline-danger" data-action="reject-request" data-id="${item.id}">Reject</button>` : editable ? `<button class="btn btn-outline-primary" data-action="submit" data-id="${item.id}">${item.status === "Rejected" ? "Resubmit" : "Submit for approval"}</button>` : item.status === "Pending Approval" ? `<span class="small text-muted">Awaiting finance approval</span>` : ""; return `<tr><td><strong>${escape(item.title)}</strong><small class="d-block text-muted">${escape(item.department)}</small></td><td>${money(item.estimated_cost)}</td><td>${statusBadge(item.priority)}</td><td>${dateText(item.required_date)}</td><td>${statusBadge(item.status)}</td><td><div class="btn-group btn-group-sm"><button class="btn btn-outline-primary" data-action="view" data-id="${item.id}">View</button>${editable ? `<button class="btn btn-outline-secondary" data-action="edit" data-id="${item.id}">Edit</button><button class="btn btn-outline-danger" data-action="delete" data-id="${item.id}">Delete</button>` : ""}${actions}</div></td></tr>`; }
    if (page === "purchaseOrders") { const send = hasRole("Procurement Manager") && item.status === "Created" ? `<button class="btn btn-outline-primary" data-action="send" data-id="${item.id}">Send</button>` : ""; const vendorReply = hasRole("Vendor") && item.status === "Sent" ? `<button class="btn btn-outline-success" data-action="accept" data-id="${item.id}">Accept</button><button class="btn btn-outline-danger" data-action="reject" data-id="${item.id}">Reject</button>` : ""; const operational = hasRole("Vendor", "Supply Chain Manager") ? `<a class="btn btn-outline-secondary" href="po-fulfillment.html?id=${item.id}">${hasRole("Supply Chain Manager") ? "Receive" : "Fulfillment"}</a>` : ""; return `<tr><td><strong>${escape(item.po_number)}</strong><small class="d-block text-muted">${escape(requestLabel(item.procurement_request_id))}</small></td><td>${escape(vendorLabel(item.vendor_id))}</td><td>${money(item.total_amount)}</td><td>${dateText(item.expected_delivery_date)}</td><td>${statusBadge(item.status)}</td><td><div class="btn-group btn-group-sm"><button class="btn btn-outline-primary" data-action="view" data-id="${item.id}">View</button>${canCreate() ? `<button class="btn btn-outline-secondary" data-action="edit" data-id="${item.id}">Edit</button>` : ""}${send}${vendorReply}${operational}${canCreate() ? `<button class="btn btn-outline-danger" data-action="delete" data-id="${item.id}">Delete</button>` : ""}</div></td></tr>`; }
    if (page === "contracts") return `<tr><td><strong>${escape(item.contract_number)}</strong><small class="d-block text-muted">${escape(vendorLabel(item.vendor_id))}</small></td><td>${dateText(item.start_date)} – ${dateText(item.end_date)}</td><td>${statusBadge(item.compliance_status)}</td><td>${expiryBadge(item.expiry_bucket)}</td><td>${item.documents.length}</td><td>${actionButtons(item, canCreate() ? `<button class="btn btn-outline-primary" data-action="upload-contract" data-id="${item.id}">Upload</button>` : "")}</td></tr>`;
    if (page === "users") { const toggleAction = hasRole("Administrator") ? `<button class="btn btn-outline-warning" data-action="toggle-active" data-id="${item.id}">${item.is_active ? "Deactivate" : "Activate"}</button>` : ""; const linkAction = item.roles.includes("Vendor") && !item.vendor_id ? `<button class="btn btn-outline-primary" data-action="link-vendor-user" data-id="${item.id}">Link company</button>` : ""; return `<tr><td><strong>${escape(item.first_name)} ${escape(item.last_name)}</strong>${item.vendor_company_name ? `<small class="d-block text-muted">${escape(item.vendor_company_name)}</small>` : ""}</td><td>${escape(item.email)}</td><td>${escape(item.phone || "—")}</td><td>${escape(item.roles.join(", "))}</td><td>${statusBadge(item.is_active ? "Active" : "Inactive")}</td><td><div class="btn-group btn-group-sm"><button class="btn btn-outline-primary" data-action="view" data-id="${item.id}">View</button>${linkAction}${toggleAction}</div></td></tr>`; }
    if (page === "auditLogs") return `<tr><td>${escape(item.created_at)}</td><td>User #${item.user_id}</td><td><strong>${escape(item.action)}</strong></td><td>${escape(item.entity)}</td><td>${escape(item.entity_id || "—")}</td></tr>`;
    return "";
  }
  const categoryName = (id) => escape((state.categories.find((category) => category.id === id) || {}).name || "—");
  const expiryBadge = (days) => days === null || days === undefined ? '<span class="text-muted">Active</span>' : `<span class="expiry-badge ${days <= 30 ? "expiry-urgent" : "expiry-warning"}">${days <= 0 ? "Expired" : `${days} days`}</span>`;

  function filters() {
    const category = page === "vendors" ? `<select id="categoryFilter" class="form-select"><option value="">All categories</option>${optionList(state.categories, "", (item) => item.name)}</select>` : "";
    const options = page === "vendors" ? ["Pending", "Under Review", "Approved", "Rejected"] : page === "procurement" ? ["Draft", "Pending Approval", "Approved", "Rejected", "Purchase Order Created"] : page === "purchaseOrders" ? ["Created", "Sent", "Accepted", "Rejected", "In Progress", "Processing", "Ready for Shipment", "Shipped", "Delivered", "Received", "Completed", "Cancelled"] : page === "contracts" ? ["Pending", "Compliant", "Non-Compliant"] : page === "users" ? ["Active", "Inactive"] : [];
    $("#filterSlot").innerHTML = `${category}${options.length ? `<select id="statusFilter" class="form-select"><option value="">All statuses</option>${options.map((value) => `<option value="${value}">${value}</option>`).join("")}</select>` : ""}`;
  }

  function lineItemHtml(item = {}) { return `<div class="line-item row g-2 align-items-end"><div class="col-md-5"><label class="form-label">Item</label><input class="form-control" name="item_name" value="${escape(item.item_name || "")}" required></div><div class="col-md-3"><label class="form-label">Quantity</label><input class="form-control" name="quantity" type="number" min="0.01" step="0.01" value="${escape(item.quantity || "")}" required></div><div class="col-md-3"><label class="form-label">Unit price</label><input class="form-control" name="unit_price" type="number" min="0" step="0.01" value="${escape(item.unit_price || item.estimated_price || "")}" required></div><div class="col-md-1"><button type="button" class="btn btn-outline-danger w-100" data-action="remove-line">×</button></div></div>`; }
  function userFormMarkup(vendorOnly = false) {
    const roles = vendorOnly ? state.provisioningRoles.filter((role) => role.name === "Vendor") : state.provisioningRoles;
    const selectedVendor = state.invitingVendor?.id || "";
    return `<div class="row g-3"><div class="col-md-6"><label class="form-label">First name</label><input class="form-control" name="first_name" required></div><div class="col-md-6"><label class="form-label">Last name</label><input class="form-control" name="last_name" required></div><div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" name="email" required></div><div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" name="phone"></div><div class="col-md-6"><label class="form-label">Temporary password</label><input type="password" class="form-control" name="password" minlength="8" required><div class="form-text">Use 8+ characters with upper/lowercase, a number and a special character.</div></div><div class="col-md-6"><label class="form-label">Role</label><select class="form-select" name="role_name" ${vendorOnly ? "disabled" : ""} required>${roles.map((role) => `<option value="${escape(role.name)}">${escape(role.name)}</option>`).join("")}</select>${vendorOnly ? '<input type="hidden" name="role_name" value="Vendor">' : ""}</div><div class="col-12"><label class="form-label">Vendor company</label><select class="form-select" name="vendor_id" ${vendorOnly ? "disabled" : ""}><option value="">Required only for Vendor role</option>${optionList(state.vendors, selectedVendor, (vendor) => vendor.company_name)}</select>${vendorOnly ? `<input type="hidden" name="vendor_id" value="${selectedVendor}">` : ""}</div></div>`;
  }
  function formMarkup(item) {
    if (state.invitingVendor) return `<div class="alert alert-info">This account will be restricted to <strong>${escape(state.invitingVendor.company_name)}</strong>.</div>${userFormMarkup(true)}`;
    if (state.linkingUser) return `<p>Link <strong>${escape(state.linkingUser.first_name)} ${escape(state.linkingUser.last_name)}</strong> to its supplier company.</p><select class="form-select" name="vendor_id" required><option value="">Select vendor company</option>${optionList(state.vendors, "", (vendor) => vendor.company_name)}</select>`;
    if (page === "users") return userFormMarkup();
    if (page === "vendors") return `<div class="row g-3"><div class="col-md-8"><label class="form-label">Company name</label><input class="form-control" name="company_name" value="${escape(item?.company_name || "")}" required></div><div class="col-md-4"><label class="form-label">Category</label><select class="form-select" name="category_id" required><option value="">Select category</option>${optionList(state.categories, item?.category_id, (category) => category.name)}</select></div><div class="col-md-6"><label class="form-label">Registration number</label><input class="form-control" name="registration_number" value="${escape(item?.registration_number || "")}" required></div><div class="col-md-6"><label class="form-label">GST number</label><input class="form-control" name="gst_number" value="${escape(item?.gst_number || "")}" required></div><div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" name="email" value="${escape(item?.email || "")}" required></div><div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" name="phone" value="${escape(item?.phone || "")}" required></div><div class="col-12"><label class="form-label">Address</label><textarea class="form-control" name="address" required>${escape(item?.address || "")}</textarea></div><div class="col-md-4"><label class="form-label">City</label><input class="form-control" name="city" value="${escape(item?.city || "")}" required></div><div class="col-md-4"><label class="form-label">State</label><input class="form-control" name="state" value="${escape(item?.state || "")}" required></div><div class="col-md-4"><label class="form-label">Country</label><input class="form-control" name="country" value="${escape(item?.country || "India")}" required></div><div class="col-md-6"><label class="form-label">Postal code</label><input class="form-control" name="postal_code" value="${escape(item?.postal_code || "")}" required></div><div class="col-md-6"><label class="form-label">Website</label><input class="form-control" name="website" value="${escape(item?.website || "")}"></div>${!item ? `<div class="col-12"><hr><h3 class="h6">Primary contact</h3></div><div class="col-md-4"><input class="form-control" name="contact_name" placeholder="Contact name"></div><div class="col-md-4"><input class="form-control" type="email" name="contact_email" placeholder="Contact email"></div><div class="col-md-4"><input class="form-control" name="contact_phone" placeholder="Contact phone"></div>` : ""}</div>`;
    if (page === "procurement") return `<div class="row g-3"><div class="col-md-8"><label class="form-label">Title</label><input class="form-control" name="title" value="${escape(item?.title || "")}" required></div><div class="col-md-4"><label class="form-label">Department</label><input class="form-control" name="department" value="${escape(item?.department || "")}" required></div><div class="col-12"><label class="form-label">Description</label><textarea class="form-control" name="description" required>${escape(item?.description || "")}</textarea></div><div class="col-md-6"><label class="form-label">Priority</label><select class="form-select" name="priority">${["Low", "Medium", "High", "Critical"].map((value) => `<option ${item?.priority === value ? "selected" : ""}>${value}</option>`).join("")}</select></div><div class="col-md-6"><label class="form-label">Required date</label><input class="form-control" name="required_date" type="date" value="${dateInput(item?.required_date)}" required></div><div class="col-12"><div class="d-flex justify-content-between align-items-center mb-2"><h3 class="h6 mb-0">Line items</h3><button type="button" class="btn btn-sm btn-outline-primary" data-action="add-line">Add item</button></div><div id="lineItems" class="vstack gap-2">${(item?.line_items || [{}]).map((line) => lineItemHtml({ ...line, unit_price: line.estimated_price })).join("")}</div></div></div>`;
    if (page === "purchaseOrders") return `<div class="row g-3">${item ? "" : `<div class="col-md-6"><label class="form-label">Approved vendor</label><select class="form-select" name="vendor_id" required><option value="">Select vendor</option>${optionList(state.vendors, "", (vendor) => vendor.company_name)}</select></div><div class="col-md-6"><label class="form-label">Approved procurement request</label><select class="form-select" name="procurement_request_id" required><option value="">Select request</option>${optionList(state.requests, "", (requestItem) => requestItem.title)}</select></div>`}<div class="col-md-6"><label class="form-label">Issue date</label><input class="form-control" name="issue_date" type="date" value="${dateInput(item?.issue_date) || dateInput(new Date().toISOString())}" ${item ? "disabled" : "required"}></div><div class="col-md-6"><label class="form-label">Expected delivery</label><input class="form-control" name="expected_delivery_date" type="date" value="${dateInput(item?.expected_delivery_date)}" required></div>${item ? "" : `<div class="col-12"><div class="d-flex justify-content-between align-items-center mb-2"><h3 class="h6 mb-0">Order items</h3><button type="button" class="btn btn-sm btn-outline-primary" data-action="add-line">Add item</button></div><div id="lineItems" class="vstack gap-2">${lineItemHtml()}</div></div>`}</div>`;
    if (page === "contracts") return `<div class="row g-3"><div class="col-md-6"><label class="form-label">Contract number</label><input class="form-control" name="contract_number" value="${escape(item?.contract_number || "")}" required></div><div class="col-md-6"><label class="form-label">Approved vendor</label><select class="form-select" name="vendor_id" required><option value="">Select vendor</option>${optionList(state.vendors, item?.vendor_id, (vendor) => vendor.company_name)}</select></div><div class="col-md-6"><label class="form-label">Start date</label><input class="form-control" name="start_date" type="date" value="${dateInput(item?.start_date)}" required></div><div class="col-md-6"><label class="form-label">End date</label><input class="form-control" name="end_date" type="date" value="${dateInput(item?.end_date)}" required></div><div class="col-md-6"><label class="form-label">Renewal notice days</label><input class="form-control" name="renewal_notice_days" type="number" min="1" max="365" value="${escape(item?.renewal_notice_days || 30)}" required></div><div class="col-md-6"><label class="form-label">Compliance</label><select class="form-select" name="compliance_status">${["Pending", "Compliant", "Non-Compliant"].map((value) => `<option ${item?.compliance_status === value ? "selected" : ""}>${value}</option>`).join("")}</select></div><div class="col-12"><label class="form-label">Terms</label><textarea class="form-control" name="terms" rows="4" required>${escape(item?.terms || "")}</textarea></div></div>`;
    return "";
  }

  function openForm(item = null) { state.editing = item; state.invitingVendor = null; state.linkingUser = null; $("#formTitle").textContent = `${item ? "Edit" : "Compose"} ${current.singular}`; $("#moduleFormBody").innerHTML = formMarkup(item); bootstrap.Modal.getOrCreateInstance($("#formModal")).show(); }
  function inviteVendorUser(vendor) { state.editing = null; state.invitingVendor = vendor; $("#formTitle").textContent = "Invite Vendor User"; $("#moduleFormBody").innerHTML = formMarkup(); bootstrap.Modal.getOrCreateInstance($("#formModal")).show(); }
  function linkVendorUser(user) { state.editing = null; state.invitingVendor = null; state.linkingUser = user; $("#formTitle").textContent = "Link Vendor Company"; $("#moduleFormBody").innerHTML = formMarkup(); bootstrap.Modal.getOrCreateInstance($("#formModal")).show(); }
  function formData() {
    const data = Object.fromEntries(new FormData($("#moduleForm")).entries());
    if (page === "vendors") { data.category_id = Number(data.category_id); if (!state.editing && data.contact_name && data.contact_email) data.contacts = [{ name: data.contact_name, email: data.contact_email, phone: data.contact_phone || null, designation: "Primary contact", is_primary: true }]; ["contact_name", "contact_email", "contact_phone"].forEach((key) => delete data[key]); }
    if (page === "procurement") { data.line_items = [...$("#lineItems").querySelectorAll(".line-item")].map((row) => ({ item_name: row.querySelector('[name="item_name"]').value, quantity: Number(row.querySelector('[name="quantity"]').value), estimated_price: Number(row.querySelector('[name="unit_price"]').value) })); }
    if (page === "purchaseOrders") { if (!state.editing) { data.vendor_id = Number(data.vendor_id); data.procurement_request_id = Number(data.procurement_request_id); data.items = [...$("#lineItems").querySelectorAll(".line-item")].map((row) => ({ item_name: row.querySelector('[name="item_name"]').value, quantity: Number(row.querySelector('[name="quantity"]').value), unit_price: Number(row.querySelector('[name="unit_price"]').value) })); } else delete data.issue_date; }
    if (page === "contracts") { data.vendor_id = Number(data.vendor_id); data.renewal_notice_days = Number(data.renewal_notice_days); }
    if (page === "users" || state.invitingVendor || state.linkingUser) data.vendor_id = data.vendor_id ? Number(data.vendor_id) : null;
    return data;
  }
  async function saveForm(event) { event.preventDefault(); const form = $("#moduleForm"); form.classList.add("was-validated"); if (!form.checkValidity()) return; setBusy(true); try { const data = formData(); const provisioning = page === "users" || state.invitingVendor; const linking = Boolean(state.linkingUser); await request(linking ? `/users/${state.linkingUser.id}/vendor-company` : (provisioning ? "/users" : (state.editing ? `${current.path}/${state.editing.id}` : current.path)), { method: linking ? "PATCH" : (provisioning ? "POST" : (state.editing ? "PUT" : "POST")), body: data }); bootstrap.Modal.getOrCreateInstance($("#formModal")).hide(); showToast(linking ? "Vendor account linked." : (provisioning ? "User account provisioned." : `${current.singular} saved.`)); await refresh(); } catch (error) { showToast(error.message, "danger"); } finally { setBusy(false); } }

  function details(item) {
    let content = "";
    if (page === "vendors") content = `<dl class="detail-grid"><dt>Company</dt><dd>${escape(item.company_name)}</dd><dt>Category</dt><dd>${categoryName(item.category_id)}</dd><dt>Registration / GST</dt><dd>${escape(item.registration_number)}<br>${escape(item.gst_number)}</dd><dt>Address</dt><dd>${escape(item.address)}, ${escape(item.city)}, ${escape(item.state)} ${escape(item.postal_code)}</dd><dt>Status</dt><dd>${statusBadge(item.approval_status)}</dd><dt>Contacts</dt><dd>${item.contacts.map((contact) => `${escape(contact.name)} · ${escape(contact.email)} · ${escape(contact.phone || "")}`).join("<br>") || "No contacts"}</dd></dl>`;
    if (page === "procurement") content = `<dl class="detail-grid"><dt>Request</dt><dd>${escape(item.title)}</dd><dt>Department</dt><dd>${escape(item.department)}</dd><dt>Status</dt><dd>${statusBadge(item.status)}</dd><dt>Required</dt><dd>${dateText(item.required_date)}</dd><dt>Amount</dt><dd>${money(item.estimated_cost)}</dd><dt>Requester</dt><dd>User #${escape(item.created_by)}</dd><dt>Approval history</dt><dd>${item.approved_at ? `Approved by user #${escape(item.approved_by)} on ${escape(item.approved_at)}${item.approval_comment ? `<br>${escape(item.approval_comment)}` : ""}` : item.rejected_at ? `Rejected by user #${escape(item.rejected_by)} on ${escape(item.rejected_at)}<br>${escape(item.rejection_reason || "")}` : "No decision recorded."}</dd><dt>Items</dt><dd>${item.line_items.map((line) => `${escape(line.item_name)} — ${line.quantity} × ${money(line.estimated_price)}`).join("<br>")}</dd></dl>`;
    if (page === "purchaseOrders") content = `<dl class="detail-grid"><dt>PO</dt><dd>${escape(item.po_number)}</dd><dt>Vendor</dt><dd>${escape(vendorLabel(item.vendor_id))}</dd><dt>Timeline</dt><dd>Issued ${dateText(item.issue_date)}<br>Expected ${dateText(item.expected_delivery_date)}</dd><dt>Items</dt><dd>${item.items.map((line) => `${escape(line.item_name)} — ${line.quantity} × ${money(line.unit_price)}`).join("<br>")}</dd><dt>Files</dt><dd>${item.invoice_path ? "Invoice uploaded" : "No invoice"}<br>${item.delivery_proof_path ? "Delivery proof uploaded" : "No delivery proof"}</dd></dl>`;
    if (page === "contracts") content = `<dl class="detail-grid"><dt>Contract</dt><dd>${escape(item.contract_number)}</dd><dt>Vendor</dt><dd>${escape(vendorLabel(item.vendor_id))}</dd><dt>Expiry</dt><dd>${dateText(item.end_date)} ${expiryBadge(item.expiry_bucket)}</dd><dt>Terms</dt><dd>${escape(item.terms)}</dd><dt>Documents</dt><dd>${item.documents.map((document) => escape(document.file_name)).join("<br>") || "No documents"}</dd></dl>`;
    if (page === "users") content = `<dl class="detail-grid"><dt>Name</dt><dd>${escape(item.first_name)} ${escape(item.last_name)}</dd><dt>Email</dt><dd>${escape(item.email)}</dd><dt>Phone</dt><dd>${escape(item.phone || "—")}</dd><dt>Roles</dt><dd>${escape(item.roles.join(", "))}</dd><dt>Status</dt><dd>${statusBadge(item.is_active ? "Active" : "Inactive")}</dd><dt>Created At</dt><dd>${escape(item.created_at)}</dd></dl>`;
    $("#detailTitle").textContent = current.singular; $("#detailBody").innerHTML = content; bootstrap.Modal.getOrCreateInstance($("#detailModal")).show();
  }
  function approvalReview(item) {
    const lineItems = Array.isArray(item.line_items) ? item.line_items : [];
    const lines = lineItems.length ? lineItems.map((line) => `<tr><td>${escape(line.item_name)}</td><td>${escape(line.quantity)}</td><td>${money(line.estimated_price)}</td><td>${money(line.subtotal)}</td></tr>`).join("") : '<tr><td colspan="4" class="text-muted">No line items were supplied for this request.</td></tr>';
    $("#detailTitle").textContent = "Review procurement request";
    $("#detailBody").innerHTML = `<div class="vstack gap-3"><dl class="detail-grid mb-0"><dt>Title</dt><dd>${escape(item.title)}</dd><dt>Department</dt><dd>${escape(item.department)}</dd><dt>Priority</dt><dd>${statusBadge(item.priority)}</dd><dt>Required date</dt><dd>${dateText(item.required_date)}</dd><dt>Estimated cost</dt><dd>${money(item.estimated_cost)}</dd><dt>Requester</dt><dd>User #${escape(item.created_by)}</dd></dl><div><h3 class="h6">Description</h3><p class="mb-0">${escape(item.description)}</p></div><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th></tr></thead><tbody>${lines}</tbody></table></div><div><label for="approvalComment" class="form-label">Decision comment <span class="text-muted">(required for rejection)</span></label><textarea id="approvalComment" class="form-control" rows="3" maxlength="2000" placeholder="Record the approval comment or rejection reason"></textarea></div><div class="d-flex justify-content-end gap-2"><button class="btn btn-outline-danger" data-action="reject-request" data-id="${item.id}">Reject</button><button class="btn btn-success" data-action="approve-request" data-id="${item.id}">Approve</button></div></div>`;
    bootstrap.Modal.getOrCreateInstance($("#detailModal")).show();
  }
  function confirm(item) { $("#confirmText").textContent = `Delete ${current.singular.toLowerCase()} “${item.company_name || item.title || item.po_number || item.contract_number || item.subject}”? This cannot be undone.`; $("#confirmButton").onclick = async () => { setBusy(true); try { await request(`${current.path}/${item.id}`, { method: "DELETE" }); bootstrap.Modal.getOrCreateInstance($("#confirmModal")).hide(); showToast(`${current.singular} deleted.`); await refresh(); } catch (error) { showToast(error.message, "danger"); } finally { setBusy(false); } }; bootstrap.Modal.getOrCreateInstance($("#confirmModal")).show(); }
  async function upload(item, target) { const input = $("#uploadFile"); input.accept = target === "documents" ? ".pdf,application/pdf" : ".pdf,.png,.jpg,.jpeg"; $("#uploadTitle").textContent = target === "documents" ? "Upload contract document" : `Upload ${target === "invoice" ? "invoice" : "delivery proof"}`; $("#uploadForm").onsubmit = async (event) => { event.preventDefault(); if (!input.files[0]) return; setBusy(true); try { const response = await fetch(`${api.baseUrl}${current.path}/${item.id}/${target}`, { method: "POST", headers: { Authorization: `Bearer ${auth.getAccessToken()}` }, body: new FormData($("#uploadForm")) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(api.getErrorMessage(payload, "Upload failed.")); bootstrap.Modal.getOrCreateInstance($("#uploadModal")).hide(); showToast("File uploaded."); await refresh(); } catch (error) { showToast(error.message, "danger"); } finally { setBusy(false); } }; bootstrap.Modal.getOrCreateInstance($("#uploadModal")).show(); }
  async function action(event) {
    const button = event.target.closest("[data-action]"); if (!button) return;
    const kind = button.dataset.action;
    if (kind === "add") return openForm(); if (kind === "add-line") return $("#lineItems").insertAdjacentHTML("beforeend", lineItemHtml()); if (kind === "remove-line") return button.closest(".line-item").remove(); if (kind === "close-menu") return document.body.classList.remove("sidebar-open");
    const item = state.items.find((row) => String(row.id) === String(button.dataset.id)); if (!item) return;
    if (kind === "review" && page === "procurement") return approvalReview(item);
    if (kind === "submit") { setBusy(true); try { await request(`/procurement-requests/${item.id}/submit`, { method: "POST" }); showToast("Request submitted for Finance Officer approval."); await refresh(); } catch (error) { showToast(error.message, "danger"); } finally { setBusy(false); } return; }
    if (kind === "approve-request" || kind === "reject-request") { const rejected = kind === "reject-request"; const reviewComment = $("#approvalComment")?.value; const comment = reviewComment !== undefined ? reviewComment : window.prompt(rejected ? "Enter the required rejection reason:" : "Approval comment (optional):", ""); if (comment === null || (rejected && !comment.trim())) { if (rejected) showToast("A rejection reason is required.", "danger"); return; } if (!window.confirm(`${rejected ? "Reject" : "Approve"} this procurement request?`)) return; setBusy(true); try { await request(`/procurement-requests/${item.id}/${rejected ? "reject" : "approve"}`, { method: "POST", body: { comment } }); bootstrap.Modal.getOrCreateInstance($("#detailModal")).hide(); showToast(rejected ? "Request rejected." : "Request approved."); await refresh(); } catch (error) { showToast(error.message, "danger"); } finally { setBusy(false); } return; }
    if (kind === "view") { const detailPage = { vendors: "vendor-details.html", procurement: "procurement-request-details.html", purchaseOrders: "purchase-order-details.html", contracts: "contract-details.html" }[page]; if (detailPage) { location.href = `${detailPage}?id=${item.id}`; return; } return details(item); } if (kind === "edit") return openForm(item); if (kind === "delete") return confirm(item); if (kind === "invite-vendor-user") return inviteVendorUser(item); if (kind === "link-vendor-user") return linkVendorUser(item); if (kind === "upload-contract") return upload(item, "documents"); if (kind === "upload-invoice") return upload(item, "invoice"); if (kind === "upload-proof") return upload(item, "delivery-proof");
    if (kind === "toggle-active") { setBusy(true); try { await request(`/users/${item.id}/toggle-active`, { method: "PATCH" }); showToast("User active status toggled."); await refresh(); } catch (error) { showToast(error.message, "danger"); } finally { setBusy(false); } }
    if (["accept", "approve", "read", "review", "reject", "send"].includes(kind)) { const endpoint = kind === "read" ? `${current.path}/${item.id}/read` : kind === "approve" ? `${current.path}/${item.id}/approve` : kind === "accept" ? `${current.path}/${item.id}/accept` : `${current.path}/${item.id}/${kind}`; setBusy(true); try { await request(endpoint, { method: "PATCH" }); showToast("Action completed."); await refresh(); } catch (error) { showToast(error.message, "danger"); } finally { setBusy(false); } }
  }
  async function refresh() { setBusy(true); try { await loadSupportData(); filters(); await fetchItems(); } catch (error) { if ((error instanceof api.ApiError && error.status === 401) || error?.message?.includes("expired")) { auth.clearSession(); auth.redirectToLogin(); return; } showToast(error.message || "Unable to load data.", "danger"); } finally { setBusy(false); } }
  function bind() { document.addEventListener("click", action); $("#moduleForm").addEventListener("submit", saveForm); $("#addButton").addEventListener("click", () => openForm()); $("#searchInput")?.addEventListener("input", () => { state.page = 1; if (page === "vendors") clearTimeout(state.searchTimer), state.searchTimer = setTimeout(fetchItems, 300); else applyFilters(); }); $("#filterSlot").addEventListener("change", () => { state.page = 1; if (page === "vendors") fetchItems(); else applyFilters(); }); $("#previousPage").addEventListener("click", () => { state.page--; renderTable(); }); $("#nextPage").addEventListener("click", () => { state.page++; renderTable(); }); $("#menuToggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open")); $("#logoutButton").addEventListener("click", () => { auth.clearSession(); location.replace("login.html"); }); }
  async function init() { if (!auth || !api || !auth.requireAuthentication()) return; try { await window.VendorIQNavigationReady; const ok = await resolveUser(); if (!ok || !state.user) return; if (!visibleFor[page].some((allowedRole) => state.roles.includes(allowedRole))) { window.VendorIQNavigation?.render("#appSidebar", state.user, state.roles); window.VendorIQNavigation?.accessDenied(document.querySelector(".app-content section")); return; } shell(); filters(); bind(); await refresh(); } catch (error) { if ((error instanceof api.ApiError && error.status === 401) || error?.message?.includes("expired")) { auth.clearSession(); auth.redirectToLogin(); return; } showToast(error.message || "Unable to initialise this page.", "danger"); } }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init, { once: true }) : init();
})();
