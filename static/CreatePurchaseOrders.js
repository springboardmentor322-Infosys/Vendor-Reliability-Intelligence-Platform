"use strict";


/* ============================================================
   API
============================================================ */

const API_BASE = "";


/* ============================================================
   STATE
============================================================ */

let vendors = [];

let warehouses = [];

let inventoryItems = [];

let items = [];

let selectedFiles = [];

let currentStep = 1;


/* ============================================================
   DOM
============================================================ */

const $ = id =>
    document.getElementById(id);


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token");

    const headers = {
        "Content-Type": "application/json",

        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            API_BASE + url,
            {
                ...options,

                headers,

                credentials: "include"
            }
        );

    const text =
        await response.text();

    let data = null;

    try {

        data = text
            ? JSON.parse(text)
            : null;

    } catch {

        data = text;

    }

    if (response.status === 401) {

        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    if (response.status === 403) {

        throw new Error(
            data?.detail ||
            "You are not authorized to create purchase orders."
        );
    }

    if (!response.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            `HTTP ${response.status}`
        );
    }

    return data;
}


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);


async function initializePage() {

    setToday();

    updateClock();

    setInterval(
        updateClock,
        1000
    );

    addItemRow();

    try {

        await Promise.all([
            loadVendors(),
            loadWarehouses(),
            loadInventoryItems(),
            loadPONumber()
        ]);

        updateSummary();

        updateChecklist();

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ============================================================
   DATE / CLOCK
============================================================ */

function setToday() {

    const today =
        new Date();

    const value =
        today
            .toISOString()
            .split("T")[0];

    $("orderDate").value =
        value;
}


function updateClock() {

    const now =
        new Date();

    $("currentDate")
        .textContent =
        now.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );

    $("currentTime")
        .textContent =
        now.toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


/* ============================================================
   LOAD PO NUMBER
============================================================ */

async function loadPONumber() {

    const data =
        await apiFetch(
            "/api/purchase-orders/generate-number"
        );

    $("poNumber").value =
        data.po_number;

    updateSummary();
}


$("generateNumber")
    ?.addEventListener(
        "click",
        loadPONumber
    );


/* ============================================================
   LOAD VENDORS
============================================================ */

async function loadVendors() {

    vendors =
        await apiFetch(
            "/api/purchase-orders/vendors"
        );

    const select =
        $("vendorId");

    select.innerHTML =
        `
        <option value="">
            Select Supplier
        </option>
        `;

    vendors.forEach(
        vendor => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                vendor.vendor_id;

            option.textContent =
                `${vendor.vendor_name} (${vendor.vendor_id})`;

            select.appendChild(
                option
            );
        }
    );
}


/* ============================================================
   LOAD WAREHOUSES
============================================================ */

async function loadWarehouses() {

    warehouses =
        await apiFetch(
            "/api/warehouses"
        );

    const select =
        $("warehouseId");

    select.innerHTML =
        `
        <option value="">
            Select Warehouse
        </option>
        `;

    warehouses.forEach(
        warehouse => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                warehouse.id;

            option.textContent =
                `${warehouse.warehouse_name} - ${warehouse.warehouse_code}`;

            select.appendChild(
                option
            );
        }
    );
}


/* ============================================================
   LOAD INVENTORY ITEMS
============================================================ */

async function loadInventoryItems() {

    inventoryItems =
        await apiFetch(
            "/api/purchase-orders/items"
        );
}


/* ============================================================
   VENDOR CHANGE
============================================================ */

$("vendorId")
    ?.addEventListener(
        "change",
        async event => {

            const vendorId =
                event.target.value;

            if (!vendorId) {

                clearVendorFields();

                updateSummary();

                return;
            }

            try {

                const vendor =
                    await apiFetch(
                        `/api/purchase-orders/vendors/${encodeURIComponent(vendorId)}`
                    );

                $("contactPerson")
                    .value =
                    vendor.contact_person || "";

                $("contactPhone")
                    .value =
                    vendor.phone || "";

                $("contactEmail")
                    .value =
                    vendor.email || "";

                updateSummary();

                updateChecklist();

            } catch (error) {

                showToast(
                    error.message
                );
            }
        }
    );


function clearVendorFields() {

    $("contactPerson").value = "";

    $("contactPhone").value = "";

    $("contactEmail").value = "";
}


/* ============================================================
   VIEW SUPPLIER
============================================================ */

$("viewSupplier")
    ?.addEventListener(
        "click",
        () => {

            const vendorId =
                $("vendorId").value;

            if (!vendorId) {

                showToast(
                    "Please select a supplier first."
                );

                return;
            }

            const vendor =
                vendors.find(
                    v =>
                        v.vendor_id ===
                        vendorId
                );

            if (!vendor) return;

            alert(
                `Supplier: ${vendor.vendor_name}\n` +
                `Vendor ID: ${vendor.vendor_id}\n` +
                `Email: ${vendor.email || "-"}\n` +
                `Phone: ${vendor.phone || "-"}\n` +
                `Address: ${vendor.address || "-"}`
            );
        }
    );


/* ============================================================
   WAREHOUSE CHANGE
============================================================ */

$("warehouseId")
    ?.addEventListener(
        "change",
        event => {

            const warehouse =
                warehouses.find(
                    w =>
                        String(w.id) ===
                        String(event.target.value)
                );

            const box =
                $("warehouseInfo");

            if (!warehouse) {

                box.style.display =
                    "none";

                box.innerHTML = "";

                updateSummary();

                return;
            }

            box.innerHTML =
                `
                <strong>
                    ${escapeHtml(
                        warehouse.warehouse_name
                    )}
                </strong>
                <br>
                ${escapeHtml(
                    warehouse.location || ""
                )}
                <br>
                Code:
                ${escapeHtml(
                    warehouse.warehouse_code
                )}
                `;

            box.style.display =
                "block";

            updateSummary();

            updateChecklist();
        }
    );


/* ============================================================
   ADD ITEM
============================================================ */

$("addItem")
    ?.addEventListener(
        "click",
        addItemRow
    );

$("addRow")
    ?.addEventListener(
        "click",
        addItemRow
    );


function addItemRow() {

    const item = {

        id:
            Date.now() +
            Math.random(),

        inventory_item_id:
            "",

        item_code:
            "",

        item_description:
            "",

        uom:
            "PCS",

        quantity:
            1,

        unit_price:
            0,

        tax_rate:
            5,

        amount:
            0
    };

    items.push(item);

    renderItems();

    updateSummary();

    updateChecklist();
}


/* ============================================================
   RENDER ITEMS
============================================================ */

function renderItems() {

    const body =
        $("itemsBody");

    body.innerHTML = "";

    items.forEach(
        (item, index) => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>
                    ${index + 1}
                </td>

                <td>

                    <select
                        class="item-description"
                        onchange="selectInventoryItem(${index}, this.value)"
                    >

                        <option value="">
                            Select Item
                        </option>

                        ${inventoryItems
                            .map(
                                inventory =>
                                    `
                                    <option
                                        value="${inventory.id}"
                                        ${String(
                                            inventory.id
                                        ) ===
                                        String(
                                            item.inventory_item_id
                                        )
                                        ? "selected"
                                        : ""}
                                    >
                                        ${escapeHtml(
                                            inventory.item_name
                                        )}
                                    </option>
                                    `
                            )
                            .join("")
                        }

                    </select>

                    <input
                        class="item-description"
                        value="${escapeHtml(
                            item.item_description
                        )}"
                        placeholder="Description"
                        onchange="updateItemField(${index}, 'item_description', this.value)"
                    >

                </td>

                <td>

                    <input
                        class="item-code"
                        value="${escapeHtml(
                            item.item_code
                        )}"
                        onchange="updateItemField(${index}, 'item_code', this.value)"
                    >

                </td>

                <td>

                    <select
                        onchange="updateItemField(${index}, 'uom', this.value)"
                    >

                        <option
                            ${item.uom === "PCS" ? "selected" : ""}
                        >
                            PCS
                        </option>

                        <option
                            ${item.uom === "KG" ? "selected" : ""}
                        >
                            KG
                        </option>

                        <option
                            ${item.uom === "LTR" ? "selected" : ""}
                        >
                            LTR
                        </option>

                        <option
                            ${item.uom === "BOX" ? "selected" : ""}
                        >
                            BOX
                        </option>

                    </select>

                </td>

                <td>

                    <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value="${item.quantity}"
                        onchange="updateItemField(${index}, 'quantity', this.value)"
                    >

                </td>

                <td>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value="${item.unit_price}"
                        onchange="updateItemField(${index}, 'unit_price', this.value)"
                    >

                </td>

                <td>

                    <select
                        onchange="updateItemField(${index}, 'tax_rate', this.value)"
                    >

                        <option
                            value="0"
                            ${item.tax_rate == 0 ? "selected" : ""}
                        >
                            0%
                        </option>

                        <option
                            value="5"
                            ${item.tax_rate == 5 ? "selected" : ""}
                        >
                            5%
                        </option>

                        <option
                            value="12"
                            ${item.tax_rate == 12 ? "selected" : ""}
                        >
                            12%
                        </option>

                        <option
                            value="18"
                            ${item.tax_rate == 18 ? "selected" : ""}
                        >
                            18%
                        </option>

                    </select>

                </td>

                <td>
                    ${formatMoney(
                        item.amount
                    )}
                </td>

                <td>

                    <button
                        class="row-action delete"
                        onclick="deleteItem(${index})"
                        title="Delete"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>
                `;

            body.appendChild(
                tr
            );
        }
    );
}


/* ============================================================
   INVENTORY ITEM SELECT
============================================================ */

function selectInventoryItem(
    index,
    inventoryId
) {

    const inventory =
        inventoryItems.find(
            item =>
                String(item.id) ===
                String(inventoryId)
        );

    if (!inventory) return;

    items[index]
        .inventory_item_id =
        inventory.id;

    items[index]
        .item_code =
        inventory.item_code;

    items[index]
        .item_description =
        inventory.item_name;

    items[index]
        .unit_price =
        Number(
            inventory.unit_price || 0
        );

    renderItems();

    updateSummary();
}


/* ============================================================
   UPDATE ITEM
============================================================ */

function updateItemField(
    index,
    field,
    value
) {

    if (
        field === "quantity" ||
        field === "unit_price" ||
        field === "tax_rate"
    ) {

        value =
            Number(value) || 0;
    }

    items[index][field] =
        value;

    calculateItemAmount(
        index
    );

    renderItems();

    updateSummary();

    updateChecklist();
}


function calculateItemAmount(
    index
) {

    const item =
        items[index];

    const base =
        Number(item.quantity) *
        Number(item.unit_price);

    const tax =
        base *
        Number(item.tax_rate) /
        100;

    item.amount =
        base;

    item.tax_amount =
        tax;
}


/* ============================================================
   DELETE ITEM
============================================================ */

function deleteItem(index) {

    items.splice(
        index,
        1
    );

    renderItems();

    updateSummary();

    updateChecklist();
}


/* ============================================================
   TOTALS
============================================================ */

function calculateTotals() {

    let subtotal = 0;

    let tax = 0;

    items.forEach(
        item => {

            const base =
                Number(item.quantity) *
                Number(item.unit_price);

            const itemTax =
                base *
                Number(item.tax_rate) /
                100;

            subtotal += base;

            tax += itemTax;

            item.amount =
                base;

            item.tax_amount =
                itemTax;
        }
    );

    const shipping =
        Number(
            $("shippingAmount")?.value ||
            0
        );

    const total =
        subtotal +
        tax +
        shipping;

    return {
        subtotal,
        tax,
        shipping,
        total
    };
}


/* ============================================================
   SUMMARY
============================================================ */

function updateSummary() {

    const totals =
        calculateTotals();

    $("summaryPONumber")
        .textContent =
        $("poNumber").value ||
        "--";

    $("summaryDate")
        .textContent =
        formatDate(
            $("orderDate").value
        );

    const vendor =
        vendors.find(
            v =>
                v.vendor_id ===
                $("vendorId").value
        );

    $("summarySupplier")
        .textContent =
        vendor
            ? vendor.vendor_name
            : "--";

    const warehouse =
        warehouses.find(
            w =>
                String(w.id) ===
                String(
                    $("warehouseId").value
                )
        );

    $("summaryWarehouse")
        .textContent =
        warehouse
            ? warehouse.warehouse_name
            : "--";

    $("summaryDelivery")
        .textContent =
        formatDate(
            $("requiredDeliveryDate").value
        );

    $("summaryPayment")
        .textContent =
        $("paymentTerms").value ||
        "--";

    $("summaryCurrency")
        .textContent =
        $("currency").value ||
        "--";

    $("summarySubtotal")
        .textContent =
        formatMoney(
            totals.subtotal
        );

    $("summaryTax")
        .textContent =
        formatMoney(
            totals.tax
        );

    $("summaryShipping")
        .textContent =
        formatMoney(
            totals.shipping
        );

    $("summaryTotal")
        .textContent =
        formatMoney(
            totals.total
        );
}


/* ============================================================
   CHECKLIST
============================================================ */

function updateChecklist() {

    setCheck(
        "checkSupplier",
        Boolean(
            $("vendorId").value
        )
    );

    setCheck(
        "checkWarehouse",
        Boolean(
            $("warehouseId").value
        )
    );

    setCheck(
        "checkItems",
        items.length > 0
    );

    setCheck(
        "checkDate",
        Boolean(
            $("requiredDeliveryDate").value
        )
    );

    const docs =
        selectedFiles.length > 0;

    $("checkDocs")
        .className =
        docs
            ? "check"
            : "check warning";

    $("checkDocs")
        .innerHTML =
        docs
            ? `
                <i class="fa-solid fa-circle-check"></i>
                Documents attached
              `
            : `
                <i class="fa-solid fa-triangle-exclamation"></i>
                Documents attached
              `;
}


function setCheck(
    id,
    value
) {

    const element =
        $(id);

    element.className =
        value
            ? "check"
            : "check pending";

    element.innerHTML =
        value
            ? `
                <i class="fa-solid fa-circle-check"></i>
                ${getCheckText(id)}
              `
            : `
                <i class="fa-regular fa-circle"></i>
                ${getCheckText(id)}
              `;
}


function getCheckText(id) {

    const text = {

        checkSupplier:
            "Supplier selected",

        checkWarehouse:
            "Delivery address selected",

        checkItems:
            "Items added",

        checkDate:
            "Required delivery date set"
    };

    return text[id] || "";
}


/* ============================================================
   STEP NAVIGATION
============================================================ */

function goToStep(
    step
) {

    currentStep =
        step;

    document
        .querySelectorAll(
            ".step-panel"
        )
        .forEach(
            panel => {

                panel.classList.toggle(
                    "active",
                    Number(
                        panel.dataset.panel
                    ) === step
                );
            }
        );

    document
        .querySelectorAll(
            ".step"
        )
        .forEach(
            element => {

                const number =
                    Number(
                        element.dataset.step
                    );

                element.classList.toggle(
                    "active",
                    number <= step
                );
            }
        );

    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

    if (step === 3) {

        renderReview();

        $("checkReview")
            .className =
            "check";

        $("checkReview")
            .innerHTML =
            `
            <i class="fa-solid fa-circle-check"></i>
            Review & submit
            `;
    }
}


$("toItems")
    ?.addEventListener(
        "click",
        () => {

            if (!validateDetails())
                return;

            goToStep(2);
        }
    );


$("backDetails")
    ?.addEventListener(
        "click",
        () => goToStep(1)
    );


$("toReview")
    ?.addEventListener(
        "click",
        () => {

            if (!validateItems())
                return;

            goToStep(3);
        }
    );


$("backItems")
    ?.addEventListener(
        "click",
        () => goToStep(2)
    );


$("submitPO2")
    ?.addEventListener(
        "click",
        () => {

            if (!validateItems())
                return;

            goToStep(3);
        }
    );


/* ============================================================
   VALIDATE DETAILS
============================================================ */

function validateDetails() {

    if (!$("vendorId").value) {

        showToast(
            "Please select a supplier."
        );

        return false;
    }

    if (!$("orderDate").value) {

        showToast(
            "Please select PO date."
        );

        return false;
    }

    if (!$("requiredDeliveryDate").value) {

        showToast(
            "Please select required delivery date."
        );

        return false;
    }

    if (!$("warehouseId").value) {

        showToast(
            "Please select delivery warehouse."
        );

        return false;
    }

    return true;
}


/* ============================================================
   VALIDATE ITEMS
============================================================ */

function validateItems() {

    if (!items.length) {

        showToast(
            "Add at least one item."
        );

        return false;
    }

    for (
        const item of items
    ) {

        if (!item.item_code) {

            showToast(
                "Every item needs an item code."
            );

            return false;
        }

        if (
            Number(item.quantity) <= 0
        ) {

            showToast(
                "Quantity must be greater than zero."
            );

            return false;
        }

        if (
            Number(item.unit_price) < 0
        ) {

            showToast(
                "Unit price cannot be negative."
            );

            return false;
        }
    }

    return true;
}


/* ============================================================
   REVIEW
============================================================ */

function renderReview() {

    const vendor =
        vendors.find(
            v =>
                v.vendor_id ===
                $("vendorId").value
        );

    const warehouse =
        warehouses.find(
            w =>
                String(w.id) ===
                String(
                    $("warehouseId").value
                )
        );

    const totals =
        calculateTotals();

    $("reviewContent")
        .innerHTML =
        `

        <div class="review-section">

            <h3>
                Purchase Order Details
            </h3>

            <div class="review-grid">

                ${reviewField(
                    "PO Number",
                    $("poNumber").value
                )}

                ${reviewField(
                    "PO Type",
                    $("poType").value
                )}

                ${reviewField(
                    "Supplier",
                    vendor?.vendor_name
                )}

                ${reviewField(
                    "Supplier Reference",
                    $("supplierReference").value
                )}

                ${reviewField(
                    "PO Date",
                    $("orderDate").value
                )}

                ${reviewField(
                    "Required Delivery",
                    $("requiredDeliveryDate").value
                )}

                ${reviewField(
                    "Delivery Warehouse",
                    warehouse?.warehouse_name
                )}

                ${reviewField(
                    "Payment Terms",
                    $("paymentTerms").value
                )}

                ${reviewField(
                    "Currency",
                    $("currency").value
                )}

            </div>

        </div>


        <div class="review-section">

            <h3>
                Items
            </h3>

            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>
                            <th>Item</th>
                            <th>Code</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Tax</th>
                            <th>Amount</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${items
                            .map(
                                item =>
                                    `
                                    <tr>

                                        <td>
                                            ${escapeHtml(
                                                item.item_description
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                item.item_code
                                            )}
                                        </td>

                                        <td>
                                            ${item.quantity}
                                        </td>

                                        <td>
                                            ${formatMoney(
                                                item.unit_price
                                            )}
                                        </td>

                                        <td>
                                            ${item.tax_rate}%
                                        </td>

                                        <td>
                                            ${formatMoney(
                                                item.amount
                                            )}
                                        </td>

                                    </tr>
                                    `
                            )
                            .join("")
                        }

                    </tbody>

                </table>

            </div>

        </div>


        <div class="review-section">

            <div class="review-grid">

                ${reviewField(
                    "Subtotal",
                    formatMoney(
                        totals.subtotal
                    )
                )}

                ${reviewField(
                    "Tax",
                    formatMoney(
                        totals.tax
                    )
                )}

                ${reviewField(
                    "Total",
                    formatMoney(
                        totals.total
                    )
                )}

            </div>

        </div>

        `;
}


function reviewField(
    label,
    value
) {

    return `
        <div class="review-field">

            <label>
                ${label}
            </label>

            <strong>
                ${escapeHtml(
                    value ?? "--"
                )}
            </strong>

        </div>
    `;
}


/* ============================================================
   SUBMIT
============================================================ */

$("submitPO")
    ?.addEventListener(
        "click",
        submitPurchaseOrder
    );


async function submitPurchaseOrder() {

    if (!validateDetails())
        return;

    if (!validateItems())
        return;

    const totals =
        calculateTotals();

    const payload = {

        po_type:
            $("poType").value,

        vendor_id:
            $("vendorId").value,

        supplier_reference:
            $("supplierReference").value ||
            null,

        contact_person:
            $("contactPerson").value ||
            null,

        contact_phone:
            $("contactPhone").value ||
            null,

        contact_email:
            $("contactEmail").value ||
            null,

        payment_method:
            $("paymentMethod").value,

        payment_terms:
            $("paymentTerms").value,

        incoterms:
            $("incoterms").value,

        currency:
            $("currency").value,

        exchange_rate:
            Number(
                $("exchangeRate").value
            ) || 1,

        order_date:
            $("orderDate").value,

        required_delivery_date:
            $("requiredDeliveryDate").value,

        delivery_warehouse_id:
            Number(
                $("warehouseId").value
            ),

        notes:
            $("notes").value ||
            $("itemNotes").value ||
            null,

        shipping_amount:
            totals.shipping,

        items:
            items.map(
                item => ({

                    inventory_item_id:
                        item.inventory_item_id
                            ? Number(
                                item.inventory_item_id
                              )
                            : null,

                    item_code:
                        item.item_code,

                    item_description:
                        item.item_description,

                    uom:
                        item.uom,

                    quantity:
                        Number(
                            item.quantity
                        ),

                    unit_price:
                        Number(
                            item.unit_price
                        ),

                    tax_rate:
                        Number(
                            item.tax_rate
                        )
                })
            )
    };

    const button =
        $("submitPO");

    button.disabled =
        true;

    button.innerHTML =
        `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
        `;

    try {

        const result =
            await apiFetch(
                "/api/purchase-orders",
                {
                    method: "POST",
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        showToast(
            `PO ${result.po_number} created successfully and sent to Finance Officer for approval.`
        );

        if (
            selectedFiles.length &&
            result.po_id
        ) {

            await uploadDocuments(
                result.po_id
            );
        }

        setTimeout(
            () => {

                window.location.href =
                    "/CreatePurchaseOrder";

            },
            2000
        );

    } catch (error) {

        showToast(
            error.message
        );

        button.disabled =
            false;

        button.innerHTML =
            `
            Submit Purchase Order
            <i class="fa-solid fa-check"></i>
            `;
    }
}


/* ============================================================
   FILE UPLOAD
============================================================ */

$("browseFiles")
    ?.addEventListener(
        "click",
        () =>
            $("fileInput").click()
    );


$("fileInput")
    ?.addEventListener(
        "change",
        event => {

            selectedFiles =
                Array.from(
                    event.target.files
                );

            renderFiles();

            updateChecklist();
        }
    );


function renderFiles() {

    $("fileList")
        .innerHTML =
        selectedFiles
            .map(
                file =>
                    `
                    <div class="file-item">

                        <i class="fa-regular fa-file"></i>

                        ${escapeHtml(
                            file.name
                        )}

                    </div>
                    `
            )
            .join("");
}


async function uploadDocuments(
    poId
) {

    for (
        const file of selectedFiles
    ) {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );

        await fetch(
            `/api/purchase-orders/${poId}/documents`,
            {
                method: "POST",
                body: formData
            }
        );
    }
}


/* ============================================================
   DRAG DROP
============================================================ */

const dropZone =
    $("dropZone");


dropZone?.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        dropZone.style.background =
            "#f0f6ff";
    }
);


dropZone?.addEventListener(
    "dragleave",
    () => {

        dropZone.style.background =
            "";
    }
);


dropZone?.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        selectedFiles =
            Array.from(
                event.dataTransfer.files
            );

        renderFiles();

        updateChecklist();

        dropZone.style.background =
            "";
    }
);


/* ============================================================
   SAVE DRAFT
============================================================ */

$("saveDraft")
    ?.addEventListener(
        "click",
        () => {

            showToast(
                "The current form is ready to be saved as a draft."
            );

            /*
            * Purchase orders created from this form
            * are submitted for Finance Officer approval.
            *
            * The backend always creates them with:
            *
            * status: "Pending Finance Approval"
            *
            * The frontend cannot directly approve
            * or order the purchase order.
            */
        }
    );


/* ============================================================
   FORM EVENTS
============================================================ */

[
    "orderDate",
    "requiredDeliveryDate",
    "paymentTerms",
    "currency",
    "vendorId",
    "warehouseId"
].forEach(
    id => {

        $(id)?.addEventListener(
            "change",
            () => {

                updateSummary();

                updateChecklist();
            }
        );
    }
);


/* ============================================================
   UTILITIES
============================================================ */

function formatMoney(
    value
) {

    return new Intl.NumberFormat(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        Number(value || 0)
    );
}


function formatDate(
    value
) {

    if (!value)
        return "--";

    const date =
        new Date(
            value + "T00:00:00"
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    )
        return value;

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


function showToast(
    message
) {

    const toast =
        $("toast");

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );
}