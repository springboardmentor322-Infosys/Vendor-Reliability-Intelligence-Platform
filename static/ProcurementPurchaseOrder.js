/* ============================================================
   VENDORIQ - PROCUREMENT PURCHASE ORDERS
   Complete ProcurementPurchaseOrder.js

   Supports:
   - PO list
   - Search
   - Filters
   - Statistics
   - Pagination
   - View PO
   - Edit PO
   - Delete PO
   - CSV export
   - Rich 3-step Create PO modal
   - PO items
   - Automatic subtotal/tax/total calculation
   - Finance approval workflow
   ============================================================ */

const API_BASE = "http://127.0.0.1:8000";

let currentPage = 1;
let pageSize = 10;
let currentTab = "all";
/* Store vendor master data loaded from backend */
let procurementVendors = [];

/* ============================================================
   AUTH TOKEN
   ============================================================ */

const token =
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("jwt_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token");


/* ============================================================
   CREATE PO MODAL STATE
   ============================================================ */

let currentModalStep = 1;

let poItems = [];

let selectedFiles = [];


/* ============================================================
   API HELPER
   ============================================================ */

async function apiFetch(url, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        alert(
            "Your session has expired. Please log in again."
        );

        return null;
    }

    if (!response.ok) {

        const text = await response.text();

        throw new Error(
            `HTTP ${response.status}: ${text}`
        );
    }

    const contentType =
        response.headers.get("content-type") || "";

    if (
        contentType.includes("application/json")
    ) {
        return response.json();
    }

    return response;
}


/* ============================================================
   LOAD USER
   ============================================================ */

async function loadUser() {

    try {

        const data =
            await apiFetch("/api/auth/me");

        if (!data) return;

        const name =
            data.name ||
            "Procurement Manager";

        const role =
            data.role ||
            "Procurement Manager";

        const userName =
            document.getElementById("userName");

        const profileName =
            document.getElementById("profileName");

        const userRole =
            document.getElementById("userRole");

        if (userName) {
            userName.textContent = name;
        }

        if (profileName) {
            profileName.textContent = name;
        }

        if (userRole) {
            userRole.textContent = role;
        }

    } catch (error) {

        console.error(
            "User loading error:",
            error
        );
    }
}


/* ============================================================
   LOAD FILTER OPTIONS
   ============================================================ */

async function loadFilterOptions() {

    try {

        const data =
            await apiFetch(
                "/api/procurement/purchase-orders/options"
            );

        if (!data) return;

        const departmentSelect =
            document.getElementById(
                "departmentFilter"
            );

        const vendorSelect =
            document.getElementById(
                "vendorFilter"
            );

        const createVendor =
            document.getElementById(
                "createVendor"
            );

        const createDepartment =
            document.getElementById(
                "createDepartment"
            );

        /* ----------------------------------------------------
           DEPARTMENTS
           ---------------------------------------------------- */

        if (departmentSelect) {

            departmentSelect.innerHTML =
                `<option value="All">All</option>`;

            (data.departments || []).forEach(
                department => {

                    departmentSelect.innerHTML += `
                        <option value="${escapeHtml(department)}">
                            ${escapeHtml(department)}
                        </option>
                    `;
                }
            );
        }

        if (createDepartment) {

            createDepartment.innerHTML =
                `<option value="">
                    Select department
                </option>`;

            (data.departments || []).forEach(
                department => {

                    createDepartment.innerHTML += `
                        <option value="${escapeHtml(department)}">
                            ${escapeHtml(department)}
                        </option>
                    `;
                }
            );
        }

        /* ----------------------------------------------------
           VENDORS
           ---------------------------------------------------- */

        if (vendorSelect) {

            /* =========================================================
            STORE COMPLETE VENDOR DATA
            ========================================================= */

            procurementVendors = data.vendors || [];


            /* =========================================================
            LOAD VENDORS INTO FILTER
            ========================================================= */

            vendorSelect.innerHTML =
                `<option value="All">All Vendors</option>`;


            /* =========================================================
            LOAD VENDORS INTO CREATE PO MODAL
            ========================================================= */

            createVendor.innerHTML =
                `<option value="">Select vendor</option>`;


            procurementVendors.forEach(vendor => {

                vendorSelect.innerHTML += `
                    <option value="${escapeHtml(vendor.vendor_id)}">
                        ${escapeHtml(vendor.vendor_name)}
                    </option>
                `;

                createVendor.innerHTML += `
                    <option value="${escapeHtml(vendor.vendor_id)}">
                        ${escapeHtml(vendor.vendor_name)}
                    </option>
                `;
            });
        }

        if (createVendor) {

            createVendor.innerHTML =
                `<option value="">
                    Select vendor
                </option>`;

            (data.vendors || []).forEach(
                vendor => {

                    createVendor.innerHTML += `
                        <option
                            value="${escapeHtml(vendor.vendor_id)}"
                            data-vendor-name="${escapeHtml(vendor.vendor_name)}"
                            data-contact="${escapeHtml(vendor.contact_person || "")}"
                            data-phone="${escapeHtml(vendor.phone || "")}"
                            data-email="${escapeHtml(vendor.email || "")}"
                        >
                            ${escapeHtml(vendor.vendor_name)}
                        </option>
                    `;
                }
            );
        }

    } catch (error) {

        console.error(
            "Filter options error:",
            error
        );
    }
}


/* ============================================================
   LOAD STATISTICS
   ============================================================ */

async function loadStatistics() {

    try {

        const data =
            await apiFetch(
                "/api/procurement/purchase-orders/statistics"
            );

        if (!data) return;

        const s =
            data.statistics || {};

        setText(
            "totalPOs",
            formatNumber(s.total_pos || 0)
        );

        setText(
            "totalSpend",
            formatCurrency(s.mtd_spend || 0)
        );

        setText(
            "pendingPOs",
            formatNumber(s.pending || 0)
        );

        setText(
            "orderedPOs",
            formatNumber(s.ordered || 0)
        );

        setText(
            "partialPOs",
            formatNumber(s.partially_received || 0)
        );

        setText(
            "completedPOs",
            formatNumber(s.completed || 0)
        );

        updateChange(
            "totalPOChange",
            s.total_change
        );

        updateChange(
            "spendChange",
            s.spend_change
        );

        updateChange(
            "pendingChange",
            s.pending_change
        );

        updateChange(
            "orderedChange",
            s.ordered_change
        );

        updateChange(
            "partialChange",
            s.partial_change
        );

        updateChange(
            "completedChange",
            s.completed_change
        );

    } catch (error) {

        console.error(
            "Statistics error:",
            error
        );
    }
}


/* ============================================================
   LOAD PURCHASE ORDERS
   ============================================================ */

async function loadPurchaseOrders() {

    const tbody =
        document.getElementById(
            "poTableBody"
        );

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="loading">
                Loading purchase orders...
            </td>
        </tr>
    `;

    const params =
        new URLSearchParams();

    const searchElement =
        document.getElementById(
            "poSearch"
        );

    const statusElement =
        document.getElementById(
            "statusFilter"
        );

    const departmentElement =
        document.getElementById(
            "departmentFilter"
        );

    const vendorElement =
        document.getElementById(
            "vendorFilter"
        );

    const fromDateElement =
        document.getElementById(
            "fromDate"
        );

    const toDateElement =
        document.getElementById(
            "toDate"
        );

    const categoryElement =
        document.getElementById(
            "categoryFilter"
        );

    const search =
        searchElement
            ? searchElement.value.trim()
            : "";

    const status =
        statusElement
            ? statusElement.value
            : "All";

    const department =
        departmentElement
            ? departmentElement.value
            : "All";

    const vendor =
        vendorElement
            ? vendorElement.value
            : "All";

    const fromDate =
        fromDateElement
            ? fromDateElement.value
            : "";

    const toDate =
        toDateElement
            ? toDateElement.value
            : "";

    const category =
        categoryElement
            ? categoryElement.value
            : "All";


    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (
        status &&
        status !== "All"
    ) {
        params.set(
            "status",
            status
        );
    }

    if (
        department &&
        department !== "All"
    ) {
        params.set(
            "department",
            department
        );
    }

    if (
        vendor &&
        vendor !== "All"
    ) {
        params.set(
            "vendor_id",
            vendor
        );
    }

    if (fromDate) {
        params.set(
            "from_date",
            fromDate
        );
    }

    if (toDate) {
        params.set(
            "to_date",
            toDate
        );
    }

    if (
        category &&
        category !== "All"
    ) {
        params.set(
            "category",
            category
        );
    }

    params.set(
        "tab",
        currentTab
    );

    params.set(
        "page",
        currentPage
    );

    params.set(
        "page_size",
        pageSize
    );


    try {

        const data =
            await apiFetch(
                `/api/procurement/purchase-orders/page?${params.toString()}`
            );

        if (!data) return;

        renderPurchaseOrders(
            data.items || []
        );

        renderPagination(
            data.pagination || {}
        );

    } catch (error) {

        console.error(
            "Purchase order loading error:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading">
                    Unable to load purchase orders.
                </td>
            </tr>
        `;
    }
}


/* ============================================================
   RENDER PURCHASE ORDER TABLE
   ============================================================ */

function renderPurchaseOrders(orders) {

    const tbody =
        document.getElementById(
            "poTableBody"
        );

    if (!tbody) return;

    if (!orders.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading">
                    No purchase orders found.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        orders
            .map(order => {

                const received =
                    Number(
                        order.received_percentage || 0
                    );

                return `
                    <tr>

                        <td>
                            <span class="po-number">
                                ${escapeHtml(
                                    order.po_number || "-"
                                )}
                            </span>
                        </td>

                        <td>
                            <div class="vendor-cell">

                                <div class="vendor-logo">
                                    ${getInitials(
                                        order.vendor_name
                                    )}
                                </div>

                                ${escapeHtml(
                                    order.vendor_name || "-"
                                )}

                            </div>
                        </td>

                        <td>
                            ${escapeHtml(
                                order.department || "-"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                order.order_date
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                order.expected_delivery
                            )}
                        </td>

                        <td>
                            ${statusBadge(
                                order.status
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatCurrency(
                                    order.amount || 0
                                )}
                            </strong>
                        </td>

                        <td>

                            <div class="received">

                                <span>
                                    ${received}%
                                </span>

                                <div class="progress">

                                    <div
                                        class="progress-bar"
                                        style="width:${Math.min(
                                            Math.max(
                                                received,
                                                0
                                            ),
                                            100
                                        )}%"
                                    ></div>

                                </div>

                            </div>

                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="action-btn"
                                    title="View"
                                    onclick="viewPO(${Number(order.id)})"
                                >
                                    <i class="fa-regular fa-eye"></i>
                                </button>

                                <button
                                    class="action-btn"
                                    title="More"
                                    onclick="showPOMenu(${Number(order.id)})"
                                >
                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            })
            .join("");
}


/* ============================================================
   STATUS BADGE
   ============================================================ */

function statusBadge(status) {

    const value =
        String(status || "Pending").trim();

    const normalized =
        value.toLowerCase();

    let css = "draft";

    if (
        normalized === "pending" ||
        normalized === "pending finance approval"
    ) {
        css = "pending";
    }
    else if (
        normalized === "approved"
    ) {
        css = "approved";
    }
    else if (
        normalized === "ordered"
    ) {
        css = "ordered";
    }
    else if (
        normalized === "partially received"
    ) {
        css = "partial";
    }
    else if (
        normalized === "completed"
    ) {
        css = "completed";
    }
    else if (
        normalized === "cancelled"
    ) {
        css = "cancelled";
    }

    return `
        <span class="status ${css}">
            ${escapeHtml(value)}
        </span>
    `;
}


/* ============================================================
   VIEW PO
   ============================================================ */

async function viewPO(id) {

    if (!id) {
        alert("Invalid purchase order ID.");
        return;
    }

    try {

        const data =
            await apiFetch(
                `/api/purchase-orders/${id}`
            );

        if (!data) return;

        const details =
            data.details ||
            data.purchase_order_details ||
            {};

        const items =
            data.items ||
            [];

        let itemText = "";

        if (items.length) {

            itemText =
                "\n\nItems:\n" +
                items
                    .map(
                        (item, index) =>
                            `${index + 1}. ${
                                item.item_description ||
                                item.description ||
                                "-"
                            } | Qty: ${
                                item.quantity || 0
                            } | Unit Price: ${
                                formatCurrency(
                                    item.unit_price || 0
                                )
                            }`
                    )
                    .join("\n");
        }

        alert(
            `Purchase Order\n\n` +

            `PO: ${
                data.po_number || "-"
            }\n` +

            `Vendor: ${
                data.vendor_name ||
                data.vendor_id ||
                "-"
            }\n` +

            `Department: ${
                data.department || "-"
            }\n` +

            `Category: ${
                data.category || "-"
            }\n` +

            `Amount: ${
                formatCurrency(
                    data.amount || 0
                )
            }\n` +

            `Status: ${
                data.status || "-"
            }\n` +

            `Order Date: ${
                formatDate(
                    data.order_date
                )
            }\n` +

            `Expected Delivery: ${
                formatDate(
                    data.expected_delivery
                )
            }` +

            (
                details.po_type
                    ? `\nPO Type: ${details.po_type}`
                    : ""
            ) +

            (
                details.payment_terms
                    ? `\nPayment Terms: ${details.payment_terms}`
                    : ""
            ) +

            (
                details.currency
                    ? `\nCurrency: ${details.currency}`
                    : ""
            ) +

            itemText
        );

    } catch (error) {

        console.error(
            "PO detail error:",
            error
        );

        alert(
            "Unable to load purchase order."
        );
    }
}


/* ============================================================
   MORE MENU
   ============================================================ */

async function showPOMenu(id) {

    try {

        const existing =
            await apiFetch(
                `/api/purchase-orders/${id}`
            );

        if (!existing) {
            return;
        }

        if (
            String(existing.status || "")
                .toLowerCase() ===
            "pending finance approval"
                .toLowerCase()
        ) {

            alert(
                "This purchase order is awaiting Finance Officer approval. It cannot be edited or deleted until Finance makes a decision."
            );

            return;
        }

        const action =
            prompt(
                "Enter action:\n\n" +
                "1 = Edit\n" +
                "2 = Delete"
            );

        if (action === "1") {

            await editPO(id);

        }
        else if (action === "2") {

            await deletePO(id);
        }

    } catch (error) {

        console.error(
            "PO action error:",
            error
        );

        alert(
            "Unable to process purchase order action."
        );
    }
}


/* ============================================================
   DELETE PO
   ============================================================ */

async function deletePO(id) {

    if (
        !confirm(
            "Are you sure you want to delete this purchase order?"
        )
    ) {
        return;
    }

    try {

        const data =
            await apiFetch(
                `/api/purchase-orders/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!data) return;

        alert(
            data.message ||
            "Purchase order deleted successfully."
        );

        await loadPurchaseOrders();

        await loadStatistics();

    } catch (error) {

        console.error(
            "Delete PO error:",
            error
        );

        alert(
            error.message ||
            "Unable to delete purchase order."
        );
    }
}


/* ============================================================
   EDIT PO
   ============================================================ */

async function editPO(id) {

    const amount =
        prompt(
            "Enter new PO amount:"
        );

    if (amount === null) {
        return;
    }

    const numericAmount =
        Number(amount);

    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount <= 0
    ) {

        alert(
            "Please enter a valid amount."
        );

        return;
    }

    try {

        const existing =
            await apiFetch(
                `/api/purchase-orders/${id}`
            );

        if (!existing) return;

        existing.amount =
            numericAmount;

        const updated =
            await apiFetch(
                `/api/purchase-orders/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(
                        existing
                    )
                }
            );

        if (!updated) return;

        alert(
            "Purchase order updated successfully."
        );

        await loadPurchaseOrders();

        await loadStatistics();

    } catch (error) {

        console.error(
            "Update PO error:",
            error
        );

        alert(
            error.message ||
            "Unable to update purchase order."
        );
    }
}


/* ============================================================
   PAGINATION
   ============================================================ */

function renderPagination(pagination) {

    const page =
        Number(
            pagination.page || 1
        );

    const total =
        Number(
            pagination.total || 0
        );

    const totalPages =
        Number(
            pagination.total_pages ||
            Math.ceil(
                total / pageSize
            ) ||
            1
        );

    const start =
        total === 0
            ? 0
            : ((page - 1) * pageSize) + 1;

    const end =
        Math.min(
            page * pageSize,
            total
        );


    const paginationText =
        document.getElementById(
            "paginationText"
        );

    if (paginationText) {

        paginationText.textContent =
            `Showing ${start} to ${end} of ${total} purchase orders`;
    }


    const prevPage =
        document.getElementById(
            "prevPage"
        );

    if (prevPage) {

        prevPage.disabled =
            page <= 1;
    }


    const nextPage =
        document.getElementById(
            "nextPage"
        );

    if (nextPage) {

        nextPage.disabled =
            page >= totalPages;
    }


    const container =
        document.getElementById(
            "pageNumbers"
        );

    if (!container) return;

    container.innerHTML = "";


    /*
       Display a maximum of 7 page buttons.
    */

    const maxVisible =
        Math.min(
            totalPages,
            7
        );

    for (
        let i = 1;
        i <= maxVisible;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.className =
            `page-number ${
                i === page
                    ? "active"
                    : ""
            }`;

        button.textContent = i;

        button.onclick = () => {

            currentPage = i;

            loadPurchaseOrders();
        };

        container.appendChild(
            button
        );
    }
}


/* ============================================================
   CREATE PO MODAL
   ============================================================ */

async function openCreateModal() {

    const modal =
        document.getElementById(
            "poModal"
        );

    if (!modal) {

        console.error(
            "poModal element not found."
        );

        return;
    }

    modal.classList.remove(
        "hidden"
    );

    resetPOModal();

    setModalStep(1);


    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const orderDate =
        document.getElementById(
            "createOrderDate"
        );

    if (orderDate) {

        orderDate.value =
            today;
    }


    const paymentTerms =
        document.getElementById(
            "paymentTerms"
        );

    if (paymentTerms &&
        !paymentTerms.value) {

        paymentTerms.value =
            "Net 30";
    }


    const currency =
        document.getElementById(
            "currency"
        );

    if (currency &&
        !currency.value) {

        currency.value =
            "INR";
    }


    const exchangeRate =
        document.getElementById(
            "exchangeRate"
        );

    if (exchangeRate &&
        !exchangeRate.value) {

        exchangeRate.value =
            "1";
    }


    try {

        const data =
            await apiFetch(
                "/api/purchase-orders/generate-number"
            );

        if (data) {

            const poNumber =
                document.getElementById(
                    "poNumber"
                );

            if (poNumber) {

                poNumber.value =
                    data.po_number || "";
            }
        }

    } catch (error) {

        console.error(
            "PO number generation error:",
            error
        );
    }

    renderPOItems();

    updatePOSummary();

    updateModalChecklist();
}


/* ============================================================
   CLOSE CREATE PO MODAL
   ============================================================ */

function closeCreateModal() {

    const modal =
        document.getElementById(
            "poModal"
        );

    if (modal) {

        modal.classList.add(
            "hidden"
        );
    }

    resetPOModal();
}


/* ============================================================
   RESET CREATE PO MODAL
   ============================================================ */

function resetPOModal() {

    currentModalStep = 1;

    poItems = [];

    selectedFiles = [];


    const form =
        document.getElementById(
            "poForm"
        );

    if (form) {

        form.reset();
    }


    const status =
        document.getElementById(
            "createStatus"
        );

    if (status) {

        status.value =
            "Pending Finance Approval";
    }


    const currency =
        document.getElementById(
            "currency"
        );

    if (currency) {

        currency.value =
            "INR";
    }


    const exchangeRate =
        document.getElementById(
            "exchangeRate"
        );

    if (exchangeRate) {

        exchangeRate.value =
            "1";
    }


    const itemsBody =
        document.getElementById(
            "itemsBody"
        );

    if (itemsBody) {

        itemsBody.innerHTML = "";
    }


    const fileList =
        document.getElementById(
            "fileList"
        );

    if (fileList) {

        fileList.innerHTML = "";
    }


    const review =
        document.getElementById(
            "reviewContent"
        );

    if (review) {

        review.innerHTML = "";
    }


    updatePOSummary();

    updateModalChecklist();

    setModalStep(1);
}


/* ============================================================
   MODAL STEPPER
   ============================================================ */

function setModalStep(step) {

    currentModalStep =
        Math.min(
            Math.max(
                Number(step),
                1
            ),
            3
        );


    /*
       Step indicators
    */

    document
        .querySelectorAll(
            ".po-modal-step"
        )
        .forEach(
            stepElement => {

                const stepNumber =
                    Number(
                        stepElement.dataset.step
                    );

                stepElement.classList.toggle(
                    "active",
                    stepNumber ===
                    currentModalStep
                );

                stepElement.classList.toggle(
                    "completed",
                    stepNumber <
                    currentModalStep
                );
            }
        );


    /*
       Sections
    */

    document
        .querySelectorAll(
            ".po-modal-section"
        )
        .forEach(
            section => {

                const sectionStep =
                    Number(
                        section.dataset.modalStep
                    );

                section.classList.toggle(
                    "active",
                    sectionStep ===
                    currentModalStep
                );
            }
        );


    /*
       Navigation buttons
    */

    const backButton =
        document.getElementById(
            "modalBackBtn"
        );

    const nextButton =
        document.getElementById(
            "modalNextBtn"
        );

    const submitButton =
        document.getElementById(
            "modalSubmitBtn"
        );


    if (backButton) {

        backButton.style.display =
            currentModalStep > 1
                ? ""
                : "none";
    }


    if (nextButton) {

        nextButton.style.display =
            currentModalStep < 3
                ? ""
                : "none";
    }


    if (submitButton) {
        if (currentModalStep === 3) {
            submitButton.classList.remove("hidden");
        } else {
            submitButton.classList.add("hidden");
        }
    }


    if (
        currentModalStep === 3
    ) {

        buildPOReview();
    }

    updatePOSummary();

    updateModalChecklist();
}


/* ============================================================
   VALIDATE STEP 1
   ============================================================ */

function validateModalStep1() {

    const vendor =
        getValue(
            "createVendor"
        );

    const department =
        getValue(
            "createDepartment"
        );

    const category =
        getValue(
            "createCategory"
        );

    const orderDate =
        getValue(
            "createOrderDate"
        );

    const deliveryDate =
        getValue(
            "createDeliveryDate"
        );


    if (!vendor) {

        alert(
            "Please select a vendor."
        );

        focusElement(
            "createVendor"
        );

        return false;
    }


    if (!department) {

        alert(
            "Please select a department."
        );

        focusElement(
            "createDepartment"
        );

        return false;
    }


    if (!category) {

        alert(
            "Please select a purchase order category."
        );

        focusElement(
            "createCategory"
        );

        return false;
    }


    if (!orderDate) {

        alert(
            "Please select the order date."
        );

        focusElement(
            "createOrderDate"
        );

        return false;
    }


    if (!deliveryDate) {

        alert(
            "Please select the expected delivery date."
        );

        focusElement(
            "createDeliveryDate"
        );

        return false;
    }


    if (
        deliveryDate <
        orderDate
    ) {

        alert(
            "Expected delivery date cannot be earlier than the order date."
        );

        focusElement(
            "createDeliveryDate"
        );

        return false;
    }


    const exchangeRate =
        Number(
            getValue(
                "exchangeRate"
            ) || 1
        );

    if (
        !Number.isFinite(
            exchangeRate
        ) ||
        exchangeRate <= 0
    ) {

        alert(
            "Please enter a valid exchange rate."
        );

        focusElement(
            "exchangeRate"
        );

        return false;
    }


    const contactEmail =
        getValue(
            "contactEmail"
        );

    if (
        contactEmail &&
        !isValidEmail(
            contactEmail
        )
    ) {

        alert(
            "Please enter a valid contact email address."
        );

        focusElement(
            "contactEmail"
        );

        return false;
    }


    return true;
}


/* ============================================================
   VALIDATE STEP 2
   ============================================================ */

function validateModalStep2() {

    if (!poItems.length) {

        alert(
            "Please add at least one item to the purchase order."
        );

        return false;
    }


    for (
        let index = 0;
        index < poItems.length;
        index++
    ) {

        const item =
            poItems[index];


        if (
            !item.item_code
        ) {

            alert(
                `Please enter the item code for item ${index + 1}.`
            );

            return false;
        }


        if (
            !item.item_description
        ) {

            alert(
                `Please enter the item description for item ${index + 1}.`
            );

            return false;
        }


        if (
            !item.uom
        ) {

            alert(
                `Please enter the UOM for item ${index + 1}.`
            );

            return false;
        }


        if (
            !Number.isFinite(
                Number(item.quantity)
            ) ||
            Number(item.quantity) <= 0
        ) {

            alert(
                `Please enter a valid quantity for item ${index + 1}.`
            );

            return false;
        }


        if (
            !Number.isFinite(
                Number(item.unit_price)
            ) ||
            Number(item.unit_price) < 0
        ) {

            alert(
                `Please enter a valid unit price for item ${index + 1}.`
            );

            return false;
        }


        if (
            !Number.isFinite(
                Number(item.tax_rate)
            ) ||
            Number(item.tax_rate) < 0
        ) {

            alert(
                `Please enter a valid tax percentage for item ${index + 1}.`
            );

            return false;
        }
    }


    return true;
}


/* ============================================================
   NEXT MODAL STEP
   ============================================================ */

function nextModalStep() {

    if (
        currentModalStep === 1
    ) {

        if (
            !validateModalStep1()
        ) {
            return;
        }
    }


    if (
        currentModalStep === 2
    ) {

        if (
            !validateModalStep2()
        ) {
            return;
        }
    }


    setModalStep(
        currentModalStep + 1
    );
}


/* ============================================================
   PREVIOUS MODAL STEP
   ============================================================ */

function previousModalStep() {

    if (
        currentModalStep > 1
    ) {

        setModalStep(
            currentModalStep - 1
        );
    }
}


/* ============================================================
   GENERATE PO NUMBER
   ============================================================ */

async function generatePONumber() {

    try {

        const data =
            await apiFetch(
                "/api/purchase-orders/generate-number"
            );

        if (!data) return;

        const input =
            document.getElementById(
                "poNumber"
            );

        if (input) {

            input.value =
                data.po_number || "";
        }

        updatePOSummary();

    } catch (error) {

        console.error(
            "PO number generation error:",
            error
        );

        alert(
            "Unable to generate purchase order number."
        );
    }
}


/* ============================================================
   ADD PO ITEM
   ============================================================ */

function addPOItem() {

    poItems.push({

        inventory_item_id:
            null,

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
            0,

        tax_amount:
            0,

        amount:
            0
    });


    renderPOItems();

    updatePOSummary();

    updateModalChecklist();
}


/* ============================================================
   REMOVE PO ITEM
   ============================================================ */

function removePOItem(index) {

    if (
        index < 0 ||
        index >= poItems.length
    ) {
        return;
    }

    poItems.splice(
        index,
        1
    );

    renderPOItems();

    updatePOSummary();

    updateModalChecklist();
}


/* ============================================================
   UPDATE PO ITEM
   ============================================================ */

function updatePOItem(
    index,
    field,
    value
) {

    if (
        !poItems[index]
    ) {
        return;
    }


    if (
        field ===
        "quantity" ||
        field ===
        "unit_price" ||
        field ===
        "tax_rate"
    ) {

        poItems[index][field] =
            Number(value) || 0;

    } else {

        poItems[index][field] =
            value;
    }


    calculateItemAmount(
        index
    );

    updatePOSummary();

    updateModalChecklist();
}


/* ============================================================
   CALCULATE ITEM AMOUNT
   ============================================================ */

function calculateItemAmount(index) {

    const item =
        poItems[index];

    if (!item) {
        return;
    }


    const quantity =
        Number(
            item.quantity || 0
        );

    const unitPrice =
        Number(
            item.unit_price || 0
        );

    const taxRate =
        Number(
            item.tax_rate || 0
        );


    const subtotal =
        quantity *
        unitPrice;


    const tax =
        subtotal *
        (
            taxRate /
            100
        );


    const total =
        subtotal +
        tax;


    item.tax_amount =
        roundMoney(
            tax
        );

    item.amount =
        roundMoney(
            total
        );
}


/* ============================================================
   RENDER PO ITEMS
   ============================================================ */

function renderPOItems() {

    const tbody =
        document.getElementById(
            "itemsBody"
        );

    if (!tbody) return;


    if (!poItems.length) {

        tbody.innerHTML = `
            <tr class="empty-items-row">
                <td
                    colspan="9"
                    style="text-align:center;padding:30px;"
                >
                    No items added yet.
                    Click <strong>Add Item</strong>
                    to add products/services.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        poItems
            .map(
                (item, index) => {

                    calculateItemAmount(
                        index
                    );

                    return `
                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                <input
                                    type="text"
                                    class="po-item-input"
                                    value="${escapeHtml(
                                        item.item_description
                                    )}"
                                    placeholder="Item / Description"
                                    data-item-index="${index}"
                                    data-item-field="item_description"
                                >
                            </td>

                            <td>
                                <input
                                    type="text"
                                    class="po-item-input"
                                    value="${escapeHtml(
                                        item.item_code
                                    )}"
                                    placeholder="Item Code"
                                    data-item-index="${index}"
                                    data-item-field="item_code"
                                >
                            </td>

                            <td>
                                <input
                                    type="text"
                                    class="po-item-input"
                                    value="${escapeHtml(
                                        item.uom
                                    )}"
                                    placeholder="UOM"
                                    data-item-index="${index}"
                                    data-item-field="uom"
                                >
                            </td>

                            <td>
                                <input
                                    type="number"
                                    class="po-item-input numeric-input"
                                    value="${Number(
                                        item.quantity || 0
                                    )}"
                                    min="0.01"
                                    step="0.01"
                                    data-item-index="${index}"
                                    data-item-field="quantity"
                                >
                            </td>

                            <td>
                                <input
                                    type="number"
                                    class="po-item-input numeric-input"
                                    value="${Number(
                                        item.unit_price || 0
                                    )}"
                                    min="0"
                                    step="0.01"
                                    data-item-index="${index}"
                                    data-item-field="unit_price"
                                >
                            </td>

                            <td>
                                <input
                                    type="number"
                                    class="po-item-input numeric-input"
                                    value="${Number(
                                        item.tax_rate || 0
                                    )}"
                                    min="0"
                                    step="0.01"
                                    data-item-index="${index}"
                                    data-item-field="tax_rate"
                                >
                            </td>

                            <td>
                                <strong class="item-amount">
                                    ${formatCurrency(
                                        item.amount || 0
                                    )}
                                </strong>
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="remove-item-btn"
                                    title="Remove Item"
                                    data-remove-item="${index}"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");


    /*
       Input events
    */

    tbody
        .querySelectorAll(
            "[data-item-index]"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    event => {

                        const index =
                            Number(
                                event.target
                                    .dataset
                                    .itemIndex
                            );

                        const field =
                            event.target
                                .dataset
                                .itemField;

                        updatePOItem(
                            index,
                            field,
                            event.target.value
                        );

                        refreshItemAmounts();
                    }
                );
            }
        );


    /*
       Remove buttons
    */

    tbody
        .querySelectorAll(
            "[data-remove-item]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        removePOItem(
                            Number(
                                button.dataset
                                    .removeItem
                            )
                        );
                    }
                );
            }
        );
}


/* ============================================================
   REFRESH ITEM AMOUNTS WITHOUT REBUILDING INPUTS
   ============================================================ */

function refreshItemAmounts() {

    const tbody =
        document.getElementById(
            "itemsBody"
        );

    if (!tbody) return;


    poItems.forEach(
        (item, index) => {

            calculateItemAmount(
                index
            );

            const row =
                tbody.children[index];

            if (!row) return;

            const amountElement =
                row.querySelector(
                    ".item-amount"
                );

            if (amountElement) {

                amountElement.textContent =
                    formatCurrency(
                        item.amount || 0
                    );
            }
        }
    );
}


/* ============================================================
   CALCULATE PO TOTALS
   ============================================================ */

function calculatePOTotals() {

    let subtotal = 0;

    let tax = 0;


    poItems.forEach(
        item => {

            const quantity =
                Number(
                    item.quantity || 0
                );

            const unitPrice =
                Number(
                    item.unit_price || 0
                );

            const taxRate =
                Number(
                    item.tax_rate || 0
                );


            const lineSubtotal =
                quantity *
                unitPrice;


            const lineTax =
                lineSubtotal *
                (
                    taxRate /
                    100
                );


            subtotal +=
                lineSubtotal;

            tax +=
                lineTax;
        }
    );


    const shippingInput =
        document.getElementById(
            "shippingAmount"
        );


    /*
       The current modal may not have a shippingAmount field.
       If it does, use it.
       Otherwise shipping = 0.
    */

    const shipping =
        shippingInput
            ? Number(
                shippingInput.value || 0
            )
            : 0;


    const total =
        subtotal +
        tax +
        shipping;


    return {

        subtotal:
            roundMoney(
                subtotal
            ),

        tax:
            roundMoney(
                tax
            ),

        shipping:
            roundMoney(
                shipping
            ),

        total:
            roundMoney(
                total
            )
    };
}


/* ============================================================
   UPDATE PO SUMMARY
   ============================================================ */

function updatePOSummary() {

    const totals =
        calculatePOTotals();


    setText(
        "summaryPONumber",
        getValue(
            "poNumber"
        ) || "-"
    );

    setText(
        "summaryDate",
        formatDate(
            getValue(
                "createOrderDate"
            )
        )
    );


    const vendorSelect =
        document.getElementById(
            "createVendor"
        );

    let vendorName = "-";

    if (
        vendorSelect &&
        vendorSelect.selectedIndex >= 0
    ) {

        const option =
            vendorSelect.options[
                vendorSelect.selectedIndex
            ];

        if (
            option &&
            option.value
        ) {

            vendorName =
                option.dataset.vendorName ||
                option.textContent.trim() ||
                option.value;
        }
    }


    setText(
        "summarySupplier",
        vendorName
    );


    const warehouse =
        getValue(
            "warehouseId"
        );

    setText(
        "summaryWarehouse",
        warehouse || "-"
    );


    setText(
        "summaryDelivery",
        formatDate(
            getValue(
                "createDeliveryDate"
            )
        )
    );


    setText(
        "summaryPayment",
        getValue(
            "paymentTerms"
        ) ||
        getValue(
            "paymentMethod"
        ) ||
        "-"
    );


    setText(
        "summaryCurrency",
        getValue(
            "currency"
        ) || "INR"
    );


    setText(
        "summarySubtotal",
        formatCurrency(
            totals.subtotal
        )
    );


    setText(
        "summaryTax",
        formatCurrency(
            totals.tax
        )
    );


    setText(
        "summaryShipping",
        formatCurrency(
            totals.shipping
        )
    );


    setText(
        "summaryTotal",
        formatCurrency(
            totals.total
        )
    );
}


/* ============================================================
   BUILD REVIEW
   ============================================================ */

function buildPOReview() {

    const review =
        document.getElementById(
            "reviewContent"
        );

    if (!review) return;


    const totals =
        calculatePOTotals();


    const poNumber =
        getValue(
            "poNumber"
        ) || "-";


    const poType =
        getValue(
            "poType"
        ) || "Standard Purchase Order";


    const vendorSelect =
        document.getElementById(
            "createVendor"
        );


    let vendorName =
        getValue(
            "createVendor"
        ) || "-";


    if (
        vendorSelect &&
        vendorSelect.selectedIndex >= 0
    ) {

        const option =
            vendorSelect.options[
                vendorSelect.selectedIndex
            ];

        if (
            option &&
            option.value
        ) {

            vendorName =
                option.dataset.vendorName ||
                option.textContent.trim();
        }
    }


    review.innerHTML = `

        <div class="review-card">

            <div class="review-section">

                <h4>
                    <i class="fa-solid fa-file-invoice"></i>
                    Purchase Order
                </h4>

                <div class="review-grid">

                    <div>
                        <span>PO Number</span>
                        <strong>
                            ${escapeHtml(
                                poNumber
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>PO Type</span>
                        <strong>
                            ${escapeHtml(
                                poType
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Order Date</span>
                        <strong>
                            ${formatDate(
                                getValue(
                                    "createOrderDate"
                                )
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Expected Delivery</span>
                        <strong>
                            ${formatDate(
                                getValue(
                                    "createDeliveryDate"
                                )
                            )}
                        </strong>
                    </div>

                </div>

            </div>


            <div class="review-section">

                <h4>
                    <i class="fa-solid fa-building"></i>
                    Supplier
                </h4>

                <div class="review-grid">

                    <div>
                        <span>Vendor</span>
                        <strong>
                            ${escapeHtml(
                                vendorName
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Department</span>
                        <strong>
                            ${escapeHtml(
                                getValue(
                                    "createDepartment"
                                ) || "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Category</span>
                        <strong>
                            ${escapeHtml(
                                getValue(
                                    "createCategory"
                                ) || "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Supplier Reference</span>
                        <strong>
                            ${escapeHtml(
                                getValue(
                                    "supplierReference"
                                ) || "-"
                            )}
                        </strong>
                    </div>

                </div>

            </div>


            <div class="review-section">

                <h4>
                    <i class="fa-solid fa-credit-card"></i>
                    Payment
                </h4>

                <div class="review-grid">

                    <div>
                        <span>Payment Method</span>
                        <strong>
                            ${escapeHtml(
                                getValue(
                                    "paymentMethod"
                                ) || "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Payment Terms</span>
                        <strong>
                            ${escapeHtml(
                                getValue(
                                    "paymentTerms"
                                ) || "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Incoterms</span>
                        <strong>
                            ${escapeHtml(
                                getValue(
                                    "incoterms"
                                ) || "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Currency</span>
                        <strong>
                            ${escapeHtml(
                                getValue(
                                    "currency"
                                ) || "INR"
                            )}
                        </strong>
                    </div>

                </div>

            </div>


            <div class="review-section">

                <h4>
                    <i class="fa-solid fa-list"></i>
                    Items
                </h4>

                <div class="review-items">

                    ${poItems.length
                        ? poItems.map(
                            (item, index) => `

                                <div class="review-item">

                                    <div>
                                        <strong>
                                            ${index + 1}.
                                            ${escapeHtml(
                                                item.item_description
                                            )}
                                        </strong>

                                        <small>
                                            Code:
                                            ${escapeHtml(
                                                item.item_code
                                            )}
                                            |
                                            UOM:
                                            ${escapeHtml(
                                                item.uom
                                            )}
                                        </small>
                                    </div>

                                    <div>
                                        Qty:
                                        ${Number(
                                            item.quantity || 0
                                        )}
                                    </div>

                                    <div>
                                        ${formatCurrency(
                                            item.amount || 0
                                        )}
                                    </div>

                                </div>
                            `
                        ).join("")
                        : `
                            <div>
                                No items added.
                            </div>
                        `
                    }

                </div>

            </div>


            <div class="review-total">

                <div>
                    <span>Subtotal</span>
                    <strong>
                        ${formatCurrency(
                            totals.subtotal
                        )}
                    </strong>
                </div>

                <div>
                    <span>Tax</span>
                    <strong>
                        ${formatCurrency(
                            totals.tax
                        )}
                    </strong>
                </div>

                <div>
                    <span>Shipping</span>
                    <strong>
                        ${formatCurrency(
                            totals.shipping
                        )}
                    </strong>
                </div>

                <div class="grand-total">
                    <span>Total</span>
                    <strong>
                        ${formatCurrency(
                            totals.total
                        )}
                    </strong>
                </div>

            </div>


            <div class="finance-approval-hint">

                <i class="fa-solid fa-shield-halved"></i>

                <div>

                    <strong>
                        Finance Approval Required
                    </strong>

                    <p>
                        This purchase order will be created with
                        <strong>
                            Pending Finance Approval
                        </strong>
                        status and routed to the Finance Officer.
                    </p>

                </div>

            </div>

        </div>
    `;
}


/* ============================================================
   MODAL CHECKLIST
   ============================================================ */

function updateModalChecklist() {

    setCheck(
        "checkSupplier",
        Boolean(
            getValue(
                "createVendor"
            )
        )
    );


    setCheck(
        "checkWarehouse",
        Boolean(
            getValue(
                "warehouseId"
            )
        )
    );


    setCheck(
        "checkItems",
        poItems.length > 0
    );


    const orderDate =
        getValue(
            "createOrderDate"
        );

    const deliveryDate =
        getValue(
            "createDeliveryDate"
        );


    setCheck(
        "checkDate",
        Boolean(
            orderDate &&
            deliveryDate &&
            deliveryDate >=
            orderDate
        )
    );


    setCheck(
        "checkDocs",
        selectedFiles.length > 0
    );


    setCheck(
        "checkReview",
        currentModalStep === 3
    );
}


/* ============================================================
   SET CHECKLIST ITEM
   ============================================================ */

function setCheck(
    id,
    completed
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) return;


    const icon =
        element.querySelector(
            "i"
        );


    element.classList.toggle(
        "completed",
        Boolean(completed)
    );


    if (icon) {

        icon.className =
            completed
                ? "fa-solid fa-circle-check"
                : "fa-regular fa-circle";
    }
}


/* ============================================================
   FILE HANDLING
   ============================================================ */

function handlePOFiles(
    files
) {

    if (!files) return;


    Array.from(files)
        .forEach(
            file => {

                const exists =
                    selectedFiles.some(
                        existing =>
                            existing.name ===
                                file.name &&
                            existing.size ===
                                file.size
                    );

                if (!exists) {

                    selectedFiles.push(
                        file
                    );
                }
            }
        );


    renderFileList();

    updateModalChecklist();
}


/* ============================================================
   RENDER FILE LIST
   ============================================================ */

function renderFileList() {

    const container =
        document.getElementById(
            "fileList"
        );

    if (!container) return;


    if (!selectedFiles.length) {

        container.innerHTML = "";

        return;
    }


    container.innerHTML =
        selectedFiles
            .map(
                (file, index) => `

                    <div class="selected-file">

                        <div class="file-info">

                            <i class="fa-regular fa-file"></i>

                            <div>

                                <strong>
                                    ${escapeHtml(
                                        file.name
                                    )}
                                </strong>

                                <small>
                                    ${formatFileSize(
                                        file.size
                                    )}
                                </small>

                            </div>

                        </div>

                        <button
                            type="button"
                            class="remove-file-btn"
                            data-remove-file="${index}"
                            title="Remove file"
                        >
                            <i class="fa-solid fa-xmark"></i>
                        </button>

                    </div>
                `
            )
            .join("");


    container
        .querySelectorAll(
            "[data-remove-file]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        removePOFile(
                            Number(
                                button.dataset
                                    .removeFile
                            )
                        );
                    }
                );
            }
        );
}


/* ============================================================
   REMOVE FILE
   ============================================================ */

function removePOFile(index) {

    if (
        index < 0 ||
        index >= selectedFiles.length
    ) {
        return;
    }


    selectedFiles.splice(
        index,
        1
    );

    renderFileList();

    updateModalChecklist();
}


/* ============================================================
   CREATE PURCHASE ORDER
   ============================================================ */

async function createPO(
    event
) {

    if (event) {
        event.preventDefault();
    }


    /*
       The final submit button is available only on Step 3.
    */

    if (
        !validateModalStep1()
    ) {

        setModalStep(1);

        return;
    }


    if (
        !validateModalStep2()
    ) {

        setModalStep(2);

        return;
    }


    const totals =
        calculatePOTotals();


    const poNumber =
        getValue(
            "poNumber"
        ).trim();


    const vendorId =
        getValue(
            "createVendor"
        );


    const department =
        getValue(
            "createDepartment"
        );


    const category =
        getValue(
            "createCategory"
        );


    const amount =
        poItems.length
            ? totals.total
            : Number(
                getValue(
                    "createAmount"
                ) || 0
            );


    /*
       The rich modal normally calculates amount
       from items.

       If the old amount field is still present,
       use it only when no items exist.
    */

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "The purchase order total must be greater than zero."
        );

        setModalStep(
            poItems.length
                ? 2
                : 1
        );

        return;
    }


    if (!poNumber) {

        alert(
            "Please generate or enter the PO number."
        );

        setModalStep(1);

        focusElement(
            "poNumber"
        );

        return;
    }


    if (!vendorId) {

        alert(
            "Please select a vendor."
        );

        setModalStep(1);

        focusElement(
            "createVendor"
        );

        return;
    }


    /*
       Build item payload.
    */

    const itemsPayload =
        poItems.map(
            item => {

                calculateItemAmount(
                    poItems.indexOf(item)
                );

                return {

                    inventory_item_id:
                        item.inventory_item_id ||
                        null,

                    item_code:
                        String(
                            item.item_code || ""
                        ).trim(),

                    item_description:
                        String(
                            item.item_description || ""
                        ).trim(),

                    uom:
                        String(
                            item.uom || "PCS"
                        ).trim(),

                    quantity:
                        Number(
                            item.quantity || 0
                        ),

                    unit_price:
                        Number(
                            item.unit_price || 0
                        ),

                    tax_rate:
                        Number(
                            item.tax_rate || 0
                        )
                };
            }
        );


    /*
       IMPORTANT:
       The backend schema from the previous change
       accepts these names.
    */

    const payload = {

        /* ----------------------------------------------------
           CORE PO FIELDS
           ---------------------------------------------------- */

        po_number:
            poNumber,

        vendor_id:
            vendorId,

        category:
            category,

        amount:
            amount,

        /*
           Always create new POs as Pending Finance Approval.
           The backend also enforces this.
        */

        status:
            "Pending Finance Approval",

        order_date:
            getValue(
                "createOrderDate"
            ),

        expected_delivery:
            getValue(
                "createDeliveryDate"
            ),

        department:
            department,


        /* ----------------------------------------------------
           STEP 1 - PO DETAILS
           ---------------------------------------------------- */

        po_type:
            getValue(
                "poType"
            ) ||
            "Standard Purchase Order",

        supplier_reference:
            getValue(
                "supplierReference"
            ) || null,

        contact_person:
            getValue(
                "contactPerson"
            ) || null,

        contact_phone:
            getValue(
                "contactPhone"
            ) || null,

        contact_email:
            getValue(
                "contactEmail"
            ) || null,

        payment_method:
            getValue(
                "paymentMethod"
            ) || null,

        payment_terms:
            getValue(
                "paymentTerms"
            ) || null,

        incoterms:
            getValue(
                "incoterms"
            ) || null,

        currency:
            getValue(
                "currency"
            ) ||
            "INR",

        exchange_rate:
            Number(
                getValue(
                    "exchangeRate"
                ) || 1
            ),

        warehouse_id:
            getValue(
                "warehouseId"
            )
                ? Number(
                    getValue(
                        "warehouseId"
                    )
                )
                : null,

        warehouse_info:
            getValue(
                "warehouseInfo"
            ) || null,

        notes:
            getValue(
                "notes"
            ) || null,


        /* ----------------------------------------------------
           TOTALS
           ---------------------------------------------------- */

        subtotal:
            totals.subtotal,

        tax_amount:
            totals.tax,

        shipping_amount:
            totals.shipping,

        total_amount:
            totals.total,


        /* ----------------------------------------------------
           STEP 2 - ITEMS
           ---------------------------------------------------- */

        items:
            itemsPayload
    };


    /*
       Remove warehouse_id when the field is a non-numeric
       warehouse name/code rather than a database ID.
    */

    if (
        payload.warehouse_id !== null &&
        (
            !Number.isFinite(
                payload.warehouse_id
            ) ||
            payload.warehouse_id <= 0
        )
    ) {

        payload.warehouse_id =
            null;
    }


    /*
       Disable submit while request is running.
    */

    const submitButton =
        document.getElementById(
            "modalSubmitBtn"
        );

    const originalSubmitText =
        submitButton
            ? submitButton.innerHTML
            : "";


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Creating PO...
        `;
    }


    try {

        console.log(
            "Creating purchase order:",
            payload
        );


        const data =
            await apiFetch(
                "/api/procurement/purchase-orders",
                {
                    method: "POST",
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!data) {
            return;
        }


        const createdPO =
            data.purchase_order ||
            data;


        const createdNumber =
            createdPO.po_number ||
            poNumber;


        alert(
            `Purchase order ${createdNumber} was created successfully and sent to the Finance Officer for approval.`
        );


        closeCreateModal();


        await Promise.all([
            loadPurchaseOrders(),
            loadStatistics()
        ]);


    } catch (error) {

        console.error(
            "Create PO error:",
            error
        );


        /*
           Show backend validation errors directly.
        */

        let message =
            error.message ||
            "Unable to create purchase order.";


        /*
           Make common 422 errors easier to understand.
        */

        if (
            message.includes(
                "422"
            )
        ) {

            message =
                `Purchase order validation failed.\n\n${message}`;
        }


        alert(
            message
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.innerHTML =
                originalSubmitText ||
                `
                    <i class="fa-solid fa-paper-plane"></i>
                    Create Purchase Order
                `;
        }
    }
}


/* ============================================================
   EXPORT PURCHASE ORDERS
   ============================================================ */

async function exportPurchaseOrders() {

    const params =
        new URLSearchParams();


    const search =
        getValue(
            "poSearch"
        ).trim();

    const status =
        getValue(
            "statusFilter"
        );

    const department =
        getValue(
            "departmentFilter"
        );

    const vendor =
        getValue(
            "vendorFilter"
        );

    const fromDate =
        getValue(
            "fromDate"
        );

    const toDate =
        getValue(
            "toDate"
        );


    if (search) {

        params.set(
            "search",
            search
        );
    }


    if (
        status &&
        status !== "All"
    ) {

        params.set(
            "status",
            status
        );
    }


    if (
        department &&
        department !== "All"
    ) {

        params.set(
            "department",
            department
        );
    }


    if (
        vendor &&
        vendor !== "All"
    ) {

        params.set(
            "vendor_id",
            vendor
        );
    }


    if (fromDate) {

        params.set(
            "from_date",
            fromDate
        );
    }


    if (toDate) {

        params.set(
            "to_date",
            toDate
        );
    }


    try {

        const url =
            `/api/procurement/purchase-orders/export/csv?${params.toString()}`;


        const headers = {};

        if (token) {

            headers.Authorization =
                `Bearer ${token}`;
        }


        const response =
            await fetch(
                `${API_BASE}${url}`,
                {
                    headers
                }
            );


        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `HTTP ${response.status}: ${text}`
            );
        }


        const blob =
            await response.blob();


        const downloadUrl =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            downloadUrl;

        link.download =
            "purchase_orders.csv";


        document.body.appendChild(
            link
        );

        link.click();

        link.remove();


        URL.revokeObjectURL(
            downloadUrl
        );


    } catch (error) {

        console.error(
            "Export error:",
            error
        );

        alert(
            error.message ||
            "Unable to export purchase orders."
        );
    }
}


/* ============================================================
   RESET FILTERS
   ============================================================ */

function resetFilters() {

    setValue(
        "poSearch",
        ""
    );

    setValue(
        "statusFilter",
        "All"
    );

    setValue(
        "departmentFilter",
        "All"
    );

    setValue(
        "vendorFilter",
        "All"
    );

    setValue(
        "fromDate",
        ""
    );

    setValue(
        "toDate",
        ""
    );


    const category =
        document.getElementById(
            "categoryFilter"
        );

    if (category) {

        category.value =
            "All";
    }


    currentPage = 1;

    loadPurchaseOrders();
}


/* ============================================================
   VENDOR SELECTION
   AUTO-FILL CONTACT INFORMATION
   ============================================================ */

function handleVendorSelection() {

    const select =
        document.getElementById(
            "createVendor"
        );

    if (!select) return;


    const option =
        select.options[
            select.selectedIndex
        ];


    if (
        !option ||
        !option.value
    ) {

        setValue(
            "contactPerson",
            ""
        );

        setValue(
            "contactPhone",
            ""
        );

        setValue(
            "contactEmail",
            ""
        );

        updatePOSummary();

        updateModalChecklist();

        return;
    }


    /*
       Only auto-fill when backend options
       supplied the values.
    */

    const contact =
        option.dataset.contact ||
        "";

    const phone =
        option.dataset.phone ||
        "";

    const email =
        option.dataset.email ||
        "";


    if (
        contact &&
        !getValue(
            "contactPerson"
        )
    ) {

        setValue(
            "contactPerson",
            contact
        );
    }


    if (
        phone &&
        !getValue(
            "contactPhone"
        )
    ) {

        setValue(
            "contactPhone",
            phone
        );
    }


    if (
        email &&
        !getValue(
            "contactEmail"
        )
    ) {

        setValue(
            "contactEmail",
            email
        );
    }


    updatePOSummary();

    updateModalChecklist();
}


/* ============================================================
   WAREHOUSE INFO
   ============================================================ */

function updateWarehouseInfo() {

    const warehouseId =
        getValue(
            "warehouseId"
        );

    const warehouseInfo =
        document.getElementById(
            "warehouseInfo"
        );


    if (
        warehouseInfo &&
        warehouseId
    ) {

        /*
           Do not invent warehouse data.
           Keep user-entered information.
        */

        if (
            !warehouseInfo.value
        ) {

            warehouseInfo.value =
                warehouseId;
        }
    }


    updatePOSummary();

    updateModalChecklist();
}


/* ============================================================
   MODAL FORM LIVE UPDATES
   ============================================================ */

function handleModalInputChange() {

    updatePOSummary();

    updateModalChecklist();


    if (
        currentModalStep === 3
    ) {

        buildPOReview();
    }
}


/* ============================================================
   FILE INPUT SETUP
   ============================================================ */

function setupFileUpload() {

    const dropZone =
        document.getElementById(
            "dropZone"
        );

    const fileInput =
        document.getElementById(
            "fileInput"
        );

    const browseFiles =
        document.getElementById(
            "browseFiles"
        );


    if (
        browseFiles &&
        fileInput
    ) {

        browseFiles.addEventListener(
            "click",
            event => {

                event.preventDefault();

                fileInput.click();
            }
        );
    }


    if (fileInput) {

        fileInput.addEventListener(
            "change",
            event => {

                handlePOFiles(
                    event.target.files
                );

                /*
                   Allow selecting the same file again.
                */

                event.target.value =
                    "";
            }
        );
    }


    if (!dropZone) {
        return;
    }


    dropZone.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            dropZone.classList.add(
                "dragover"
            );
        }
    );


    dropZone.addEventListener(
        "dragleave",
        event => {

            event.preventDefault();

            dropZone.classList.remove(
                "dragover"
            );
        }
    );


    dropZone.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            dropZone.classList.remove(
                "dragover"
            );

            handlePOFiles(
                event.dataTransfer.files
            );
        }
    );
}


/* ============================================================
   MODAL EVENT SETUP
   ============================================================ */

function setupCreatePOModal() {

    const createPOBtn =
        document.getElementById(
            "createPOBtn"
        );

    if (createPOBtn) {

        createPOBtn.addEventListener(
            "click",
            openCreateModal
        );
    }


    const closeModal =
        document.getElementById(
            "closeModal"
        );

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeCreateModal
        );
    }


    const cancelPO =
        document.getElementById(
            "cancelPO"
        );

    if (cancelPO) {

        cancelPO.addEventListener(
            "click",
            closeCreateModal
        );
    }


    const form =
        document.getElementById(
            "poForm"
        );

    if (form) {

        form.addEventListener(
            "submit",
            createPO
        );
    }


    const backButton =
        document.getElementById(
            "modalBackBtn"
        );

    if (backButton) {

        backButton.addEventListener(
            "click",
            previousModalStep
        );
    }


    const nextButton =
        document.getElementById(
            "modalNextBtn"
        );

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            nextModalStep
        );
    }


    const submitButton =
        document.getElementById(
            "modalSubmitBtn"
        );

    if (submitButton) {

        submitButton.addEventListener(
            "click",
            createPO
        );
    }


    const generateNumber =
        document.getElementById(
            "generateNumber"
        );

    if (generateNumber) {

        generateNumber.addEventListener(
            "click",
            generatePONumber
        );
    }


    const addItem =
        document.getElementById(
            "addItem"
        );

    if (addItem) {

        addItem.addEventListener(
            "click",
            addPOItem
        );
    }


    const addRow =
        document.getElementById(
            "addRow"
        );

    if (addRow) {

        addRow.addEventListener(
            "click",
            addPOItem
        );
    }


    const vendor =
        document.getElementById(
            "createVendor"
        );

    if (vendor) {

        vendor.addEventListener(
            "change",
            handleVendorSelection
        );
    }


    /* =========================================================
    VENDOR SELECTION
    ========================================================= */

    const createVendor =
        document.getElementById("createVendor");

    if (createVendor) {

        createVendor.addEventListener(
            "change",
            loadVendorContactDetails
        );
    }


    const warehouse =
        document.getElementById(
            "warehouseId"
        );

    if (warehouse) {

        warehouse.addEventListener(
            "input",
            updateWarehouseInfo
        );

        warehouse.addEventListener(
            "change",
            updateWarehouseInfo
        );
    }


    /*
       Live summary updates.
    */

    [
        "poType",
        "poNumber",
        "supplierReference",
        "createDepartment",
        "createCategory",
        "createAmount",
        "createOrderDate",
        "createDeliveryDate",
        "contactPerson",
        "contactPhone",
        "contactEmail",
        "paymentMethod",
        "paymentTerms",
        "incoterms",
        "currency",
        "exchangeRate",
        "warehouseId",
        "warehouseInfo",
        "notes",
        "shippingAmount"
    ]
        .forEach(
            id => {

                const element =
                    document.getElementById(
                        id
                    );

                if (!element) {
                    return;
                }

                element.addEventListener(
                    "input",
                    handleModalInputChange
                );

                element.addEventListener(
                    "change",
                    handleModalInputChange
                );
            }
        );


    /*
       Escape key closes modal.
    */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }


            const modal =
                document.getElementById(
                    "poModal"
                );


            if (
                modal &&
                !modal.classList.contains(
                    "hidden"
                )
            ) {

                closeCreateModal();
            }
        }
    );


    setupFileUpload();
}


/* ============================================================
   GENERAL PAGE EVENTS
   ============================================================ */

function setupPageEvents() {

    const exportBtn =
        document.getElementById(
            "exportBtn"
        );

    if (exportBtn) {

        exportBtn.addEventListener(
            "click",
            exportPurchaseOrders
        );
    }


    const resetBtn =
        document.getElementById(
            "resetBtn"
        );

    if (resetBtn) {

        resetBtn.addEventListener(
            "click",
            resetFilters
        );
    }


    const prevPage =
        document.getElementById(
            "prevPage"
        );

    if (prevPage) {

        prevPage.addEventListener(
            "click",
            () => {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    loadPurchaseOrders();
                }
            }
        );
    }


    const nextPage =
        document.getElementById(
            "nextPage"
        );

    if (nextPage) {

        nextPage.addEventListener(
            "click",
            () => {

                currentPage++;

                loadPurchaseOrders();
            }
        );
    }


    const pageSizeElement =
        document.getElementById(
            "pageSize"
        );

    if (pageSizeElement) {

        pageSizeElement.addEventListener(
            "change",
            event => {

                pageSize =
                    Number(
                        event.target.value
                    ) || 10;

                currentPage = 1;

                loadPurchaseOrders();
            }
        );
    }


    /*
       Filters
    */

    [
        "statusFilter",
        "departmentFilter",
        "vendorFilter",
        "categoryFilter",
        "fromDate",
        "toDate"
    ]
        .forEach(
            id => {

                const element =
                    document.getElementById(
                        id
                    );

                if (!element) {
                    return;
                }

                element.addEventListener(
                    "change",
                    () => {

                        currentPage = 1;

                        loadPurchaseOrders();
                    }
                );
            }
        );


    /*
       Search
    */

    const searchElement =
        document.getElementById(
            "poSearch"
        );


    if (searchElement) {

        let searchTimer;


        searchElement.addEventListener(
            "input",
            () => {

                clearTimeout(
                    searchTimer
                );


                searchTimer =
                    setTimeout(
                        () => {

                            currentPage = 1;

                            loadPurchaseOrders();

                        },
                        350
                    );
            }
        );
    }


    /*
       Tabs
    */

    document
        .querySelectorAll(
            ".tab"
        )
        .forEach(
            tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".tab"
                            )
                            .forEach(
                                x => {

                                    x.classList.remove(
                                        "active"
                                    );
                                }
                            );


                        tab.classList.add(
                            "active"
                        );


                        currentTab =
                            tab.dataset.tab ||
                            "all";


                        currentPage =
                            1;


                        loadPurchaseOrders();
                    }
                );
            }
        );
}


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            setupCreatePOModal();

            setupPageEvents();


            await loadUser();

            await loadFilterOptions();

            await loadStatistics();

            await loadPurchaseOrders();


        } catch (error) {

            console.error(
                "Procurement Purchase Order initialization error:",
                error
            );
        }
    }
);


/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function getValue(id) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return "";
    }

    return String(
        element.value ?? ""
    ).trim();
}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }

    element.value =
        value ?? "";
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }

    element.textContent =
        value ?? "";
}


function focusElement(id) {

    const element =
        document.getElementById(
            id
        );

    if (element) {

        setTimeout(
            () => {

                element.focus();

            },
            50
        );
    }
}


function roundMoney(value) {

    return Math.round(
        (
            Number(value || 0) +
            Number.EPSILON
        ) * 100
    ) / 100;
}


function formatNumber(value) {

    return Number(
        value || 0
    )
        .toLocaleString(
            "en-US"
        );
}


function formatCurrency(value) {

    return Number(
        value || 0
    )
        .toLocaleString(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            }
        );
}


function formatDate(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function getInitials(name) {

    if (!name) {
        return "VN";
    }


    return String(name)
        .trim()
        .split(/\s+/)
        .map(
            word =>
                word.charAt(0)
        )
        .slice(0, 2)
        .join("")
        .toUpperCase();
}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function updateChange(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }


    const number =
        Number(
            value || 0
        );


    element.textContent =
        `${number >= 0 ? "↑" : "↓"} ${Math.abs(number)}%`;


    element.className =
        number >= 0
            ? "up"
            : "down";
}


function formatFileSize(bytes) {

    const value =
        Number(bytes || 0);


    if (value < 1024) {

        return `${value} B`;
    }


    if (
        value <
        1024 * 1024
    ) {

        return `${(
            value / 1024
        ).toFixed(1)} KB`;
    }


    return `${(
        value /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}


function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            String(email || "")
                .trim()
        );
}


function openProfile() {

    window.location.href =
        "/ProcurementProfile";
}


function statusClass(
    status
) {

    const normalized =
        String(
            status || ""
        )
            .toLowerCase();


    if (
        normalized ===
        "pending finance approval"
    ) {

        return "pending";
    }


    return normalized
        .replace(
            /\s+/g,
            "-"
        );
}


/* =========================================================
   AUTO-FILL VENDOR CONTACT DETAILS
   ========================================================= */

function loadVendorContactDetails() {

    const vendorSelect =
        document.getElementById("createVendor");

    const contactPerson =
        document.getElementById("contactPerson");

    const contactPhone =
        document.getElementById("contactPhone");

    const contactEmail =
        document.getElementById("contactEmail");

    if (!vendorSelect) return;


    const vendorId =
        vendorSelect.value;


    /* Clear fields if no vendor is selected */
    if (!vendorId) {

        if (contactPerson) {
            contactPerson.value = "";
        }

        if (contactPhone) {
            contactPhone.value = "";
        }

        if (contactEmail) {
            contactEmail.value = "";
        }

        return;
    }


    /* Find selected vendor from vendor master data */
    const vendor =
        procurementVendors.find(
            item => item.vendor_id === vendorId
        );


    if (!vendor) {

        console.warn(
            "Vendor not found:",
            vendorId
        );

        if (contactPerson) {
            contactPerson.value = "";
        }

        if (contactPhone) {
            contactPhone.value = "";
        }

        if (contactEmail) {
            contactEmail.value = "";
        }

        return;
    }


    /* =====================================================
       AUTO-FILL CONTACT PERSON
       ===================================================== */

    if (contactPerson) {

        contactPerson.value =
            vendor.contact_person || "";
    }


    /* =====================================================
       AUTO-FILL PHONE
       ===================================================== */

    if (contactPhone) {

        contactPhone.value =
            vendor.phone || "";
    }


    /* =====================================================
       AUTO-FILL EMAIL
       ===================================================== */

    if (contactEmail) {

        contactEmail.value =
            vendor.email || "";
    }


    console.log(
        "Vendor contact details loaded:",
        {
            vendor_id: vendor.vendor_id,
            contact_person: vendor.contact_person,
            phone: vendor.phone,
            email: vendor.email
        }
    );
}


/* ============================================================
   OPTIONAL GLOBAL FUNCTIONS
   These remain available for inline HTML onclick handlers.
   ============================================================ */

window.openCreateModal =
    openCreateModal;

window.closeCreateModal =
    closeCreateModal;

window.viewPO =
    viewPO;

window.showPOMenu =
    showPOMenu;

window.deletePO =
    deletePO;

window.editPO =
    editPO;

window.addPOItem =
    addPOItem;

window.removePOItem =
    removePOItem;

window.createPO =
    createPO;

window.exportPurchaseOrders =
    exportPurchaseOrders;

window.resetFilters =
    resetFilters;

window.openProfile =
    openProfile;