const DATA_ROLES = ["administrator", "procurement_manager"];
const ADMIN_ROLE = "administrator";
const importForm = document.getElementById("dataco-form");
const importResult = document.getElementById("import-result");
const seedResult = document.getElementById("seed-result");

function showResult(node, message, success = true) {
  node.textContent = message;
  node.className = `banner show ${success ? "banner-success" : "banner-error"}`;
}

function ensureAccess() {
  const role = Auth.getUser()?.role;
  if (!DATA_ROLES.includes(role)) {
    document.querySelector("main").innerHTML = '<div class="auth-card"><h1>Data Management</h1><p class="lead">Only Administrators and Procurement Managers can import business data.</p><a class="btn btn-primary" href="dashboard.html">Return to dashboard</a></div>';
    return false;
  }
  if (role !== ADMIN_ROLE) {
    const seedButton = document.getElementById("seed-button");
    seedButton.disabled = true;
    seedButton.title = "An Administrator loads generated supporting data.";
  }
  return true;
}

importForm.addEventListener("submit", async event => {
  event.preventDefault();
  const file = document.getElementById("dataco-file").files[0];
  const button = document.getElementById("import-button");
  if (!file) return showResult(importResult, "Choose the DataCo CSV file first.", false);
  const body = new FormData();
  body.append("file", file);
  body.append("max_rows", document.getElementById("max-rows").value);
  button.disabled = true; button.textContent = "Importing...";
  try {
    const result = await Api.request("/imports/dataco", { method:"POST", body });
    showResult(importResult, `${result.message} ${result.rows_read} rows read; ${result.products_created} products, ${result.purchase_orders_created} purchase orders and ${result.delivery_records_created} deliveries created.`);
  } catch (error) {
    showResult(importResult, error.message || "Import failed.", false);
  } finally {
    button.disabled = false; button.textContent = "Import primary dataset";
  }
});

document.getElementById("seed-button").addEventListener("click", async () => {
  const button = document.getElementById("seed-button");
  button.disabled = true; button.textContent = "Loading...";
  try {
    const result = await Api.post("/imports/demo-data", {});
    showResult(seedResult, `${result.message} Created: ${result.vendors} vendors, ${result.products} products, ${result.purchase_orders} purchase orders, ${result.invoices} invoices, and ${result.contracts} contracts.`);
  } catch (error) {
    showResult(seedResult, error.message || "Could not load supporting data.", false);
  } finally {
    button.disabled = false; button.textContent = "Load supporting demo data";
  }
});

ensureAccess();
