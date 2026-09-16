(() => {
  "use strict";

  const api = window.VendorIQApi;
  const auth = window.VendorIQAuth;
  const $ = (selector) => document.querySelector(selector);
  const pageSize = 10;
  let user;
  let roleNames = [];
  let invoices = [];
  let purchaseOrders = [];
  let currentPage = 1;
  let saveAndSubmit = false;
  let paymentInvoice = null;

  const roleSet = () => new Set(roleNames);
  const isVendor = () => roleSet().has("Vendor") && !["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"].some((role) => roleSet().has(role));
  const isFinance = () => roleSet().has("Finance Officer");
  const canView = () => ["Vendor", "Finance Officer", "Procurement Manager", "Supply Chain Manager", "Administrator", "Auditor"].some((role) => roleSet().has(role));
  const request = (path, options = {}) => api.request(path, { token: auth.getAccessToken(), ...options });
  const escapeHtml = (value) => String(value ?? "—").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
  const money = (value) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2
  }).format(Number(value || 0));
  const dateText = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "—";
  const today = () => new Date().toISOString().slice(0, 10);

  function statusBadge(status) {
    const className = String(status || "Draft").toLowerCase().replaceAll(" ", "-");
    return `<span class="status-badge status-${className}">${escapeHtml(status)}</span>`;
  }

  function showToast(message, type = "success") {
    const toast = $("#toast");
    toast.className = `toast text-bg-${type}`;
    $("#toastText").textContent = message;
    bootstrap.Toast.getOrCreateInstance(toast).show();
  }

  function showError(message) {
    const target = $("#pageError");
    target.textContent = message;
    target.classList.remove("d-none");
  }

  function hideError() {
    $("#pageError").classList.add("d-none");
  }

  function filteredInvoices() {
    const term = $("#searchInput").value.trim().toLowerCase();
    const status = $("#statusFilter").value;
    return invoices.filter((invoice) => {
      const searchable = [invoice.invoice_number, invoice.vendor_name, invoice.po_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!term || searchable.includes(term)) && (!status || invoice.status === status);
    });
  }

  function actionButtons(invoice) {
    const actions = [`<button class="btn btn-sm btn-outline-primary" type="button" data-action="view" data-id="${invoice.id}">View</button>`];
    if (invoice.document_path) {
      actions.push(`<button class="btn btn-sm btn-outline-secondary" type="button" data-action="download" data-id="${invoice.id}" title="Download invoice document"><i class="bi bi-download"></i></button>`);
    }
    if (isVendor() && ["Draft", "Rejected"].includes(invoice.status)) {
      actions.push(`<button class="btn btn-sm btn-primary" type="button" data-action="submit" data-id="${invoice.id}">Submit</button>`);
      actions.push(`<button class="btn btn-sm btn-outline-secondary" type="button" data-action="upload" data-id="${invoice.id}">Document</button>`);
    }
    if (isFinance() && invoice.status === "Submitted") {
      actions.push(`<button class="btn btn-sm btn-outline-secondary" type="button" data-action="review" data-id="${invoice.id}">Review</button>`);
    }
    if (isFinance() && invoice.status === "Under Review") {
      actions.push(`<button class="btn btn-sm btn-success" type="button" data-action="approve" data-id="${invoice.id}">Approve</button>`);
      actions.push(`<button class="btn btn-sm btn-outline-danger" type="button" data-action="reject" data-id="${invoice.id}">Reject</button>`);
    }
    if (isFinance() && invoice.status === "Approved") {
      actions.push(`<button class="btn btn-sm btn-outline-primary" type="button" data-action="prepare-payment" data-id="${invoice.id}">Prepare payment</button>`);
    }
    if (isFinance() && invoice.status === "Payment Pending") {
      actions.push(`<button class="btn btn-sm btn-success" type="button" data-action="payment" data-id="${invoice.id}">Pay</button>`);
    }
    return actions.join(" ");
  }

  function render() {
    const filtered = filteredInvoices();
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    const hasRecords = filtered.length > 0;

    $("#loadingState").classList.add("d-none");
    $("#invoiceTableWrap").classList.toggle("d-none", !hasRecords);
    $("#emptyState").classList.toggle("d-none", hasRecords);
    $("#tableFooter").classList.toggle("d-none", !hasRecords);
    $("#emptyMessage").textContent = invoices.length
      ? "No invoices match the current search or status filter."
      : "No invoices have been submitted yet.";

    $("#invoiceRows").innerHTML = pageItems.map((invoice) => `
      <tr>
        <td><strong>${escapeHtml(invoice.invoice_number)}</strong><br><small class="text-muted">${invoice.document_path ? "Document attached" : "No document"}</small></td>
        <td>${escapeHtml(invoice.vendor_name || (isVendor() ? "My company" : `Vendor #${invoice.vendor_id}`))}</td>
        <td><a href="purchase-order-details.html?id=${invoice.purchase_order_id}">${escapeHtml(invoice.po_number || `PO #${invoice.purchase_order_id}`)}</a></td>
        <td>${dateText(invoice.invoice_date)}<br><small class="text-muted">Due ${dateText(invoice.due_date)}</small></td>
        <td>${money(invoice.total_amount)}</td>
        <td>${statusBadge(invoice.status)}</td>
        <td>${invoice.payments?.length ? `${statusBadge("Paid")}<br><small class="text-muted">${dateText(invoice.payments[0].payment_date)}</small>` : "<span class=\"text-muted\">Pending</span>"}</td>
        <td class="text-end"><div class="d-inline-flex flex-wrap gap-1 justify-content-end">${actionButtons(invoice)}</div></td>
      </tr>
    `).join("");
    $("#pageInfo").textContent = `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`;
    $("#previousPage").disabled = currentPage <= 1;
    $("#nextPage").disabled = currentPage >= pageCount;
  }

  async function loadInvoices() {
    hideError();
    $("#loadingState").classList.remove("d-none");
    $("#invoiceTableWrap").classList.add("d-none");
    $("#emptyState").classList.add("d-none");
    $("#tableFooter").classList.add("d-none");
    try {
      const response = await request("/invoices");
      invoices = Array.isArray(response) ? response : (response.items || []);
      render();
    } catch (error) {
      $("#loadingState").classList.add("d-none");
      showError(error.message || "Unable to load invoices. Please try again.");
    }
  }

  function selectedPurchaseOrder() {
    return purchaseOrders.find((order) => order.id === Number($("#poSelect").value));
  }

  function updatePurchaseOrderHint() {
    const order = selectedPurchaseOrder();
    const hint = $("#poAmountHint");
    if (!order) {
      hint.textContent = "";
      return;
    }
    hint.textContent = `PO total: ${money(order.total_amount)}`;
    if (!$("#subtotal").value) $("#subtotal").value = Number(order.total_amount).toFixed(2);
  }

  async function prepareInvoiceForm() {
    try {
      purchaseOrders = await request("/purchase-orders");
      const completed = purchaseOrders.filter((order) => !["Cancelled", "Rejected", "Draft"].includes(order.status));
      $("#poSelect").innerHTML = `<option value="">Select a purchase order</option>${completed.map((order) => `<option value="${order.id}">${escapeHtml(order.po_number)} — ${money(order.total_amount)} (${order.status})</option>`).join("")}`;
      $("#invoiceDate").value = today();
      $("#dueDate").value = today();
      $("#invoiceForm").reset();
      $("#invoiceDate").value = today();
      $("#dueDate").value = today();
      $("#invoiceFormError").classList.add("d-none");
      $("#poAmountHint").textContent = "";
      bootstrap.Modal.getOrCreateInstance($("#invoiceModal")).show();
    } catch (error) {
      showToast(error.message || "Unable to load completed purchase orders.", "danger");
    }
  }

  async function uploadDocument(invoiceId, file) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${api.baseUrl}/invoices/${invoiceId}/document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.getAccessToken()}` },
      body: formData
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(api.getErrorMessage(payload, "Unable to upload invoice document."));
  }

  async function saveInvoice(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formError = $("#invoiceFormError");
    formError.classList.add("d-none");
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }
    const formData = new FormData(form);
    const payload = {
      purchase_order_id: Number(formData.get("purchase_order_id")),
      invoice_number: String(formData.get("invoice_number") || "").trim(),
      invoice_date: formData.get("invoice_date"),
      due_date: formData.get("due_date"),
      subtotal: Number(formData.get("subtotal")),
      tax_amount: Number(formData.get("tax_amount") || 0),
      notes: String(formData.get("notes") || "").trim() || null
    };
    const file = $("#invoiceDocument").files[0];
    const buttons = form.querySelectorAll("button");
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const created = await request("/invoices", { method: "POST", body: payload });
      await uploadDocument(created.id, file);
      if (saveAndSubmit) await request(`/invoices/${created.id}/submit`, { method: "POST" });
      bootstrap.Modal.getOrCreateInstance($("#invoiceModal")).hide();
      showToast(saveAndSubmit ? "Invoice saved and submitted to Finance." : "Invoice draft saved.");
      await loadInvoices();
    } catch (error) {
      formError.textContent = error.message || "Unable to save the invoice.";
      formError.classList.remove("d-none");
    } finally {
      saveAndSubmit = false;
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  async function downloadDocument(invoice) {
    try {
      const response = await fetch(`${api.baseUrl}/files/download?path=${encodeURIComponent(invoice.document_path)}`, {
        headers: { Authorization: `Bearer ${auth.getAccessToken()}` }
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(api.getErrorMessage(payload, "Unable to download the invoice document."));
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = invoice.document_path.split("/").pop() || `${invoice.invoice_number}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message || "Unable to download invoice document.", "danger");
    }
  }

  function evidenceHtml(invoice) {
    const evidence = invoice.receiving_evidence;
    if (!evidence) return "<p class=\"text-muted mb-0\">Receiving evidence is not available.</p>";
    return `<dl class="detail-grid mb-0">
      <dt>PO status</dt><dd>${statusBadge(evidence.purchase_order_status)}</dd>
      <dt>PO total</dt><dd>${money(evidence.purchase_order_total)}</dd>
      <dt>Expected delivery</dt><dd>${dateText(evidence.expected_delivery_date)}</dd>
      <dt>Delivery received</dt><dd>${dateText(evidence.actual_delivery_date)}</dd>
      <dt>Quantity</dt><dd>${escapeHtml(evidence.received_quantity)} received / ${escapeHtml(evidence.accepted_quantity)} accepted / ${escapeHtml(evidence.rejected_quantity)} rejected</dd>
      <dt>Quality</dt><dd>${escapeHtml(evidence.quality_status)}</dd>
    </dl>`;
  }

  async function showDetails(id) {
    try {
      const invoice = await request(`/invoices/${id}`);
      $("#detailTitle").textContent = invoice.invoice_number;
      const paymentRows = invoice.payments?.length
        ? invoice.payments.map((payment) => `<tr><td>${dateText(payment.payment_date)}</td><td>${money(payment.amount)}</td><td>${escapeHtml(payment.payment_method)}</td><td>${escapeHtml(payment.reference_number)}</td><td>${statusBadge(payment.status)}</td></tr>`).join("")
        : "<tr><td colspan=\"5\" class=\"text-muted\">No payment has been processed.</td></tr>";
      $("#detailBody").innerHTML = `
        <div class="row g-4">
          <div class="col-md-6"><h3 class="h6">Invoice</h3><dl class="detail-grid">
            <dt>Vendor</dt><dd>${escapeHtml(invoice.vendor_name || `Vendor #${invoice.vendor_id}`)}</dd>
            <dt>Purchase order</dt><dd><a href="purchase-order-details.html?id=${invoice.purchase_order_id}">${escapeHtml(invoice.po_number || `PO #${invoice.purchase_order_id}`)}</a></dd>
            <dt>Invoice date</dt><dd>${dateText(invoice.invoice_date)}</dd>
            <dt>Due date</dt><dd>${dateText(invoice.due_date)}</dd>
            <dt>Amounts</dt><dd>Subtotal ${money(invoice.subtotal)}<br>Tax ${money(invoice.tax_amount)}<br><strong>Total ${money(invoice.total_amount)}</strong></dd>
            <dt>Status</dt><dd>${statusBadge(invoice.status)}</dd>
            <dt>Review note</dt><dd>${escapeHtml(invoice.review_comment || "Not reviewed")}</dd>
            <dt>Document</dt><dd>${invoice.document_path ? `<button class="btn btn-sm btn-outline-secondary" type="button" data-action="download" data-id="${invoice.id}"><i class="bi bi-download me-1"></i>Download</button>` : "No document attached"}</dd>
          </dl></div>
          <div class="col-md-6"><h3 class="h6">Receiving &amp; quality evidence</h3>${evidenceHtml(invoice)}</div>
          <div class="col-12"><h3 class="h6">Notes</h3><p class="mb-0">${escapeHtml(invoice.notes || "No notes provided.")}</p></div>
          <div class="col-12"><h3 class="h6">Payment history</h3><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead><tbody>${paymentRows}</tbody></table></div></div>
        </div>`;
      bootstrap.Modal.getOrCreateInstance($("#detailModal")).show();
    } catch (error) {
      showToast(error.message || "Unable to load invoice details.", "danger");
    }
  }

  async function changeStatus(invoice, action) {
    let comment = null;
    if (action === "review") comment = window.prompt("Review note (optional):", "");
    if (action === "approve") comment = window.prompt("Approval note (optional):", "");
    if (action === "reject") {
      comment = window.prompt("Rejection reason:", "");
      if (!comment || !comment.trim()) {
        showToast("A rejection reason is required.", "danger");
        return;
      }
    }
    if (action === "prepare-payment") comment = window.prompt("Payment preparation note (optional):", "");
    const endpoint = {
      review: "review",
      approve: "approve",
      reject: "reject",
      "prepare-payment": "payment-pending"
    }[action];
    try {
      await request(`/invoices/${invoice.id}/${endpoint}`, { method: "POST", body: { comment: comment || null } });
      const messages = { review: "Invoice moved to review.", approve: "Invoice approved.", reject: "Invoice rejected.", "prepare-payment": "Invoice is ready for payment." };
      showToast(messages[action]);
      await loadInvoices();
    } catch (error) {
      showToast(error.message || "Unable to update the invoice.", "danger");
    }
  }

  async function submitInvoice(invoice) {
    try {
      await request(`/invoices/${invoice.id}/submit`, { method: "POST" });
      showToast("Invoice submitted to Finance.");
      await loadInvoices();
    } catch (error) {
      showToast(error.message || "Unable to submit invoice.", "danger");
    }
  }

  function openPayment(invoice) {
    paymentInvoice = invoice;
    $("#paymentForm").reset();
    $("#paymentDate").value = today();
    $("#paymentAmount").value = Number(invoice.total_amount).toFixed(2);
    $("#paymentInvoiceSummary").textContent = `${invoice.invoice_number} — ${money(invoice.total_amount)}`;
    $("#paymentFormError").classList.add("d-none");
    bootstrap.Modal.getOrCreateInstance($("#paymentModal")).show();
  }

  async function processPayment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!paymentInvoice || !form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }
    const formData = new FormData(form);
    const payload = {
      payment_date: formData.get("payment_date"),
      amount: Number(formData.get("amount")),
      payment_method: formData.get("payment_method"),
      reference_number: String(formData.get("reference_number") || "").trim(),
      notes: String(formData.get("notes") || "").trim() || null
    };
    try {
      await request(`/invoices/${paymentInvoice.id}/payments`, { method: "POST", body: payload });
      bootstrap.Modal.getOrCreateInstance($("#paymentModal")).hide();
      showToast("Payment processed and invoice marked paid.");
      await loadInvoices();
    } catch (error) {
      $("#paymentFormError").textContent = error.message || "Unable to process payment.";
      $("#paymentFormError").classList.remove("d-none");
    }
  }

  function openDocumentPicker(invoice) {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";
    picker.addEventListener("change", async () => {
      if (!picker.files[0]) return;
      try {
        await uploadDocument(invoice.id, picker.files[0]);
        showToast("Invoice document uploaded.");
        await loadInvoices();
      } catch (error) {
        showToast(error.message || "Unable to upload invoice document.", "danger");
      }
    }, { once: true });
    picker.click();
  }

  async function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const invoice = invoices.find((item) => item.id === Number(button.dataset.id));
    if (!invoice) return;
    const action = button.dataset.action;
    if (action === "view") return showDetails(invoice.id);
    if (action === "download") return downloadDocument(invoice);
    if (action === "submit") return submitInvoice(invoice);
    if (action === "upload") return openDocumentPicker(invoice);
    if (["review", "approve", "reject", "prepare-payment"].includes(action)) return changeStatus(invoice, action);
    if (action === "payment") return openPayment(invoice);
  }

  async function initialise() {
    if (!api || !auth || !auth.requireAuthentication()) return;
    try {
      await window.VendorIQNavigationReady;
      user = auth.setUser(await request("/auth/me"));
      roleNames = auth.getRoleNames(user);
      if (!canView()) {
        $("main").innerHTML = "<div class=\"p-4 alert alert-warning\"><h2 class=\"h5\">Access denied</h2><p class=\"mb-0\">You do not have permission to view invoice records.</p></div>";
        return;
      }
      $("#topUser").textContent = `${user.first_name} ${user.last_name}`.trim();
      $("#topRole").textContent = roleNames.join(", ");
      window.VendorIQNavigation.render("#appSidebar", user, roleNames, "invoices-payments.html");
      if (isVendor()) $("#addInvoice").classList.remove("d-none");
      $("#addInvoice").addEventListener("click", prepareInvoiceForm);
      $("#poSelect").addEventListener("change", updatePurchaseOrderHint);
      $("#invoiceForm").addEventListener("submit", saveInvoice);
      $("#submitAfterSave").addEventListener("click", () => { saveAndSubmit = true; $("#invoiceForm").requestSubmit(); });
      $("#paymentForm").addEventListener("submit", processPayment);
      $("#searchInput").addEventListener("input", () => { currentPage = 1; render(); });
      $("#statusFilter").addEventListener("change", () => { currentPage = 1; render(); });
      $("#previousPage").addEventListener("click", () => { currentPage -= 1; render(); });
      $("#nextPage").addEventListener("click", () => { currentPage += 1; render(); });
      document.addEventListener("click", handleAction);
      $("#menuToggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
      $("#logoutButton").addEventListener("click", () => { auth.clearSession(); window.location.replace("login.html"); });
      await loadInvoices();
    } catch (error) {
      if ((error instanceof api.ApiError && error.status === 401) || error?.message?.includes("expired")) {
        auth.clearSession();
        auth.redirectToLogin();
        return;
      }
      showError(error.message || "Unable to initialise invoices and payments.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
