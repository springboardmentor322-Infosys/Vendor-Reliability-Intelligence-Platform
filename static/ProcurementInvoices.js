const API = "http://127.0.0.1:8000";

let currentPage = 1;
let pageSize = 10;
let totalPages = 1;

let selectedInvoice = null;


/* =========================================
   AUTH
========================================= */

function authHeaders() {

    const token =
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token");

    return token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
        : {
            "Content-Type": "application/json"
        };
}


/* =========================================
   FETCH
========================================= */

async function apiFetch(url, options = {}) {

    const response = await fetch(
        API + url,
        {
            ...options,
            headers: {
                ...authHeaders(),
                ...(options.headers || {})
            }
        }
    );

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const error =
                await response.json();

            message =
                error.detail ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


async function getJSON(url, options = {}) {
    return await apiFetch(url, options);
}


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEvents();

        await loadVendors();

        await loadDashboard();

        await loadInvoices();

        await loadProfile();

    }
);


/* =========================================
   EVENTS
========================================= */

function setupEvents() {

    const search =
        document.getElementById(
            "invoiceSearch"
        );

    const status =
        document.getElementById(
            "statusFilter"
        );

    const vendor =
        document.getElementById(
            "vendorFilter"
        );

    const due =
        document.getElementById(
            "dueFilter"
        );

    const reset =
        document.getElementById(
            "resetFilters"
        );

    const pageSizeSelect =
        document.getElementById(
            "pageSize"
        );

    if (search) {

        let timer;

        search.addEventListener(
            "input",
            () => {

                clearTimeout(timer);

                timer = setTimeout(
                    () => {

                        currentPage = 1;
                        loadInvoices();

                    },
                    350
                );
            }
        );
    }

    [
        status,
        vendor,
        due
    ].forEach(element => {

        if (!element) return;

        element.addEventListener(
            "change",
            () => {

                currentPage = 1;

                loadInvoices();

            }
        );
    });


    document
        .getElementById("dateFrom")
        ?.addEventListener(
            "change",
            () => {

                currentPage = 1;
                loadInvoices();

            }
        );


    document
        .getElementById("dateTo")
        ?.addEventListener(
            "change",
            () => {

                currentPage = 1;
                loadInvoices();

            }
        );


    reset?.addEventListener(
        "click",
        resetFilters
    );


    pageSizeSelect?.addEventListener(
        "change",
        () => {

            pageSize =
                Number(
                    pageSizeSelect.value
                );

            currentPage = 1;

            loadInvoices();

        }
    );


    document
        .getElementById("previousPage")
        ?.addEventListener(
            "click",
            () => {

                if (currentPage > 1) {

                    currentPage--;

                    loadInvoices();
                }

            }
        );


    document
        .getElementById("nextPage")
        ?.addEventListener(
            "click",
            () => {

                if (currentPage < totalPages) {

                    currentPage++;

                    loadInvoices();
                }

            }
        );


    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".tab")
                        .forEach(
                            x =>
                                x.classList.remove(
                                    "active"
                                )
                        );

                    tab.classList.add(
                        "active"
                    );

                    const value =
                        tab.dataset.status;

                    document
                        .getElementById(
                            "statusFilter"
                        ).value = value;

                    currentPage = 1;

                    loadInvoices();

                }
            );
        });


    document
        .getElementById("closeDetails")
        ?.addEventListener(
            "click",
            closeDetails
        );


    document
        .getElementById("uploadInvoiceBtn")
        ?.addEventListener(
            "click",
            openUploadModal
        );


    document
        .getElementById("closeUpload")
        ?.addEventListener(
            "click",
            closeUploadModal
        );


    document
        .getElementById("cancelUpload")
        ?.addEventListener(
            "click",
            closeUploadModal
        );


    document
        .getElementById("invoiceForm")
        ?.addEventListener(
            "submit",
            createInvoice
        );


    document
        .getElementById("exportBtn")
        ?.addEventListener(
            "click",
            exportInvoices
        );

}


/* =========================================
   VENDORS
========================================= */

async function loadVendors() {

    try {

        const result =
            await apiFetch(
                "/api/vendors?page=1&limit=100"
            );

        const vendors =
            result.vendors ||
            result.items ||
            [];

        const filter =
            document.getElementById(
                "vendorFilter"
            );

        const modal =
            document.getElementById(
                "newVendor"
            );

        vendors.forEach(vendor => {

            const id =
                vendor.vendor_id;

            const name =
                vendor.vendor_name ||
                vendor.name;

            if (!id) return;

            if (filter) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = id;

                option.textContent =
                    name || id;

                filter.appendChild(
                    option
                );
            }

            if (modal) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = id;

                option.textContent =
                    name || id;

                modal.appendChild(
                    option
                );
            }

        });

    } catch (error) {

        console.error(
            "Vendor loading failed:",
            error
        );

    }
}


/* =========================================
   DASHBOARD
========================================= */

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                "/api/admin/invoices/dashboard"
            );

        const kpis =
            data.kpis || {};

        setText(
            "totalInvoices",
            kpis.total_invoices ?? 0
        );

        setText(
            "paidInvoices",
            data.payment_distribution?.paid ?? 0
        );

        setText(
            "pendingInvoices",
            data.payment_distribution?.pending ?? 0
        );

        setText(
            "overdueInvoices",
            data.payment_distribution?.overdue ?? 0
        );

        const trends =
            data.trends || [];

        let draftCount = 0;

        /*
         * Dashboard API may not expose Draft count.
         * The list itself handles Draft filtering.
         */

        setText(
            "draftInvoices",
            draftCount
        );

        setText(
            "mtdAmount",
            formatCurrency(
                kpis.total_invoice_amount || 0
            )
        );

    } catch (error) {

        console.error(
            "Dashboard loading failed:",
            error
        );

    }
}


/* =========================================
   INVOICE LIST
========================================= */

async function loadInvoices() {

    const tbody =
        document.getElementById(
            "invoiceTable"
        );

    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="loading">
                Loading invoices...
            </td>
        </tr>
    `;

    const params =
        new URLSearchParams();

    const search =
        document.getElementById(
            "invoiceSearch"
        )?.value.trim();

    const status =
        document.getElementById(
            "statusFilter"
        )?.value;

    const vendor =
        document.getElementById(
            "vendorFilter"
        )?.value;

    const fromDate =
        document.getElementById(
            "dateFrom"
        )?.value;

    const toDate =
        document.getElementById(
            "dateTo"
        )?.value;

    const due =
        document.getElementById(
            "dueFilter"
        )?.value;


    if (search)
        params.set(
            "search",
            search
        );

    if (status && status !== "All")
        params.set(
            "status",
            status
        );

    if (vendor && vendor !== "All")
        params.set(
            "vendor_id",
            vendor
        );

    if (fromDate)
        params.set(
            "from_date",
            fromDate
        );

    if (toDate)
        params.set(
            "to_date",
            toDate
        );

    if (due && due !== "All")
        params.set(
            "due_status",
            due
        );

    params.set(
        "page",
        currentPage
    );

    params.set(
        "limit",
        pageSize
    );


    try {

        const result =
            await apiFetch(
                `/api/admin/invoices?${params}`
            );

        const invoices =
            result.items || [];

        const pagination =
            result.pagination || {};

        totalPages =
            pagination.pages || 1;

        renderInvoices(
            invoices
        );

        renderPagination(
            pagination
        );

    } catch (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="error-message">
                        ${escapeHtml(
                            error.message
                        )}
                    </div>
                </td>
            </tr>
        `;
    }
}


/* =========================================
   RENDER TABLE
========================================= */

function renderInvoices(
    invoices
) {

    const tbody =
        document.getElementById(
            "invoiceTable"
        );

    if (!invoices.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-details">
                        <i class="fa-regular fa-file"></i>
                        <p>No invoices found</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        invoices.map(
            invoice => {

                const statusClass =
                    getStatusClass(
                        invoice.status
                    );

                return `
                    <tr>

                        <td>
                            <span
                                class="invoice-number"
                            >
                                ${escapeHtml(
                                    invoice.invoice_number
                                )}
                            </span>
                        </td>

                        <td>
                            <span
                                class="vendor-name"
                            >
                                ${escapeHtml(
                                    invoice.vendor_name ||
                                    invoice.vendor_id ||
                                    "Unknown"
                                )}
                            </span>
                        </td>

                        <td>
                            <span
                                class="po-number"
                            >
                                ${escapeHtml(
                                    invoice.po_number ||
                                    "-"
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatDate(
                                invoice.invoice_date
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                invoice.due_date
                            )}
                        </td>

                        <td>

                            <span
                                class="status-pill ${statusClass}"
                            >
                                ${escapeHtml(
                                    invoice.status ||
                                    "Pending"
                                )}
                            </span>

                        </td>

                        <td>
                            <span class="amount">
                                ${formatCurrency(
                                    invoice.amount
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="balance">
                                ${formatCurrency(
                                    invoice.balance_due ??
                                    invoice.amount
                                )}
                            </span>
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="action-btn"
                                    title="View"
                                    onclick="viewInvoice(
                                        ${invoice.id}
                                    )"
                                >
                                    <i
                                        class="fa-regular fa-eye"
                                    ></i>
                                </button>

                                <button
                                    class="action-btn"
                                    title="More"
                                    onclick="viewInvoice(
                                        ${invoice.id}
                                    )"
                                >
                                    <i
                                        class="fa-solid fa-ellipsis-vertical"
                                    ></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            }
        ).join("");
}


/* =========================================
   DETAIL
========================================= */

async function viewInvoice(
    invoiceId
) {

    const container =
        document.getElementById(
            "invoiceDetails"
        );

    container.innerHTML = `
        <div class="empty-details">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Loading invoice...</p>
        </div>
    `;

    try {

        const invoice =
            await apiFetch(
                `/api/admin/invoices/${invoiceId}/details`
            );

        selectedInvoice =
            invoice;

        renderInvoiceDetails(
            invoice
        );

    } catch (error) {

        container.innerHTML = `
            <div class="empty-details">
                <p>
                    ${escapeHtml(
                        error.message
                    )}
                </p>
            </div>
        `;
    }
}


/* =========================================
   DETAIL UI
========================================= */

function renderInvoiceDetails(
    invoice
) {

    const container =
        document.getElementById(
            "invoiceDetails"
        );

    const workflow =
        invoice.workflow || [];

    const items =
        invoice.items || [];

    const history =
        invoice.history || [];

    const attachments =
        invoice.attachments || [];


    container.innerHTML = `

        <div class="detail-body">

            <div class="detail-title">

                <h2>
                    ${escapeHtml(
                        invoice.invoice_number
                    )}
                </h2>

                <span
                    class="status-pill
                    ${getStatusClass(
                        invoice.status
                    )}"
                >
                    ${escapeHtml(
                        invoice.status
                    )}
                </span>

            </div>


            <div class="detail-vendor">
                ${escapeHtml(
                    invoice.vendor_name ||
                    invoice.vendor_id ||
                    ""
                )}
            </div>


            <div class="detail-meta">

                <span>
                    PO-${escapeHtml(
                        invoice.po_number ||
                        "-"
                    )}
                </span>

                <span>
                    Due
                    ${formatDate(
                        invoice.due_date
                    )}
                </span>

            </div>


            <div class="detail-tabs">

                <button
                    class="detail-tab active"
                    data-detail-tab="overview"
                >
                    Overview
                </button>

                <button
                    class="detail-tab"
                    data-detail-tab="items"
                >
                    Items (${items.length})
                </button>

                <button
                    class="detail-tab"
                    data-detail-tab="history"
                >
                    History
                </button>

                <button
                    class="detail-tab"
                    data-detail-tab="attachments"
                >
                    Attachments (${attachments.length})
                </button>

            </div>


            <div
                id="detailOverview"
                class="detail-tab-content"
            >

                <div class="detail-section">

                    <div class="detail-row">
                        <span>
                            Invoice Date
                        </span>

                        <strong>
                            ${formatDate(
                                invoice.invoice_date
                            )}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>
                            Due Date
                        </span>

                        <strong>
                            ${formatDate(
                                invoice.due_date
                            )}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>
                            Payment Terms
                        </span>

                        <strong>
                            Net 15 Days
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>
                            Currency
                        </span>

                        <strong>
                            USD
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>
                            Total Amount
                        </span>

                        <strong>
                            ${formatCurrency(
                                invoice.amount
                            )}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>
                            Paid
                        </span>

                        <strong>
                            ${formatCurrency(
                                invoice.total_paid
                            )}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>
                            Balance Due
                        </span>

                        <strong
                            style="color:#ef3340"
                        >
                            ${formatCurrency(
                                invoice.balance_due
                            )}
                        </strong>
                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        Workflow Status
                    </h4>

                    <div class="workflow">

                        ${
                            workflow.length
                            ?
                            workflow.map(
                                step => `

                                    <div
                                        class="
                                            workflow-step
                                            ${
                                                String(
                                                    step.status
                                                ).toLowerCase()
                                                === "completed"
                                                ? "completed"
                                                : String(
                                                    step.status
                                                ).toLowerCase()
                                                === "current"
                                                ? "current"
                                                : ""
                                            }
                                        "
                                    >

                                        <div
                                            class="workflow-dot"
                                        ></div>

                                        <strong>
                                            ${escapeHtml(
                                                step.step_name
                                            )}
                                        </strong>

                                        <small>
                                            ${escapeHtml(
                                                step.status
                                            )}
                                        </small>

                                    </div>

                                `
                            ).join("")
                            :
                            `
                                <div class="workflow-step current">

                                    <div
                                        class="workflow-dot"
                                    ></div>

                                    <strong>
                                        Pending Approval
                                    </strong>

                                    <small>
                                        Waiting for Procurement Manager
                                    </small>

                                </div>
                            `
                        }

                    </div>

                </div>

            </div>


            <div
                id="detailItems"
                class="detail-tab-content"
                style="display:none"
            >

                <div class="detail-section">

                    ${
                        items.length
                        ?
                        items.map(
                            item => `

                                <div
                                    class="item-row"
                                >

                                    <strong>
                                        ${escapeHtml(
                                            item.description
                                        )}
                                    </strong>

                                    <small>
                                        Code:
                                        ${escapeHtml(
                                            item.item_code ||
                                            "-"
                                        )}
                                        |
                                        Quantity:
                                        ${item.quantity}
                                    </small>

                                    <small>
                                        ${formatCurrency(
                                            item.amount
                                        )}
                                    </small>

                                </div>
                            `
                        ).join("")
                        :
                        `
                            <p>
                                No invoice items available.
                            </p>
                        `
                    }

                </div>

            </div>


            <div
                id="detailHistory"
                class="detail-tab-content"
                style="display:none"
            >

                <div class="detail-section">

                    ${
                        history.length
                        ?
                        history.map(
                            h => `

                                <div
                                    class="item-row"
                                >

                                    <strong>
                                        ${escapeHtml(
                                            h.action
                                        )}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            h.description ||
                                            ""
                                        )}
                                    </small>

                                    <small>
                                        ${formatDateTime(
                                            h.created_at
                                        )}
                                    </small>

                                </div>

                            `
                        ).join("")
                        :
                        `
                            <p>
                                No history available.
                            </p>
                        `
                    }

                </div>

            </div>


            <div
                id="detailAttachments"
                class="detail-tab-content"
                style="display:none"
            >

                <div class="detail-section">

                    ${
                        attachments.length
                        ?
                        attachments.map(
                            a => `

                                <div
                                    class="item-row"
                                >

                                    <strong>
                                        <i
                                            class="fa-regular
                                            fa-file"
                                        ></i>

                                        ${escapeHtml(
                                            a.file_name
                                        )}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            a.file_type ||
                                            "File"
                                        )}
                                    </small>

                                </div>

                            `
                        ).join("")
                        :
                        `
                            <p>
                                No attachments available.
                            </p>
                        `
                    }

                </div>

            </div>


            ${
                invoice.status ===
                "Pending Approval"
                ?
                `
                    <div class="detail-actions">

                        <button
                            class="primary-btn"
                            onclick="
                                decideInvoice(
                                    ${invoice.id},
                                    'approve'
                                )
                            "
                        >
                            <i
                                class="fa-solid
                                fa-circle-check"
                            ></i>
                            Approve Invoice
                        </button>

                        <button
                            class="secondary-btn"
                            style="
                                color:#ef3340;
                                border-color:#ef3340
                            "
                            onclick="
                                decideInvoice(
                                    ${invoice.id},
                                    'reject'
                                )
                            "
                        >
                            <i
                                class="fa-solid
                                fa-xmark"
                            ></i>
                            Reject Invoice
                        </button>

                    </div>
                `
                :
                ""
            }

        </div>
    `;


    setupDetailTabs();
}


/* =========================================
   DETAIL TABS
========================================= */

function setupDetailTabs() {

    document
        .querySelectorAll(
            ".detail-tab"
        )
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".detail-tab"
                        )
                        .forEach(
                            x =>
                                x.classList.remove(
                                    "active"
                                )
                        );

                    tab.classList.add(
                        "active"
                    );

                    document
                        .querySelectorAll(
                            ".detail-tab-content"
                        )
                        .forEach(
                            x =>
                                x.style.display =
                                    "none"
                        );

                    const name =
                        tab.dataset.detailTab;

                    document.getElementById(
                        `detail${
                            name.charAt(0).toUpperCase()
                            + name.slice(1)
                        }`
                    ).style.display =
                        "block";
                }
            );
        });
}


/* =========================================
   APPROVE / REJECT
========================================= */

async function decideInvoice(
    invoiceId,
    decision
) {

    const question =
        decision === "approve"
        ? "Approve this invoice?"
        : "Reject this invoice?";

    if (!confirm(question))
        return;

    try {

        await apiFetch(
            `/api/admin/invoices/${invoiceId}/decision?decision=${decision}`,
            {
                method: "PUT"
            }
        );

        alert(
            decision === "approve"
            ? "Invoice approved successfully."
            : "Invoice rejected successfully."
        );

        await loadDashboard();

        await loadInvoices();

        await viewInvoice(
            invoiceId
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================
   RESET
========================================= */

function resetFilters() {

    document.getElementById(
        "invoiceSearch"
    ).value = "";

    document.getElementById(
        "statusFilter"
    ).value = "All";

    document.getElementById(
        "vendorFilter"
    ).value = "All";

    document.getElementById(
        "dateFrom"
    ).value = "";

    document.getElementById(
        "dateTo"
    ).value = "";

    document.getElementById(
        "dueFilter"
    ).value = "All";


    document
        .querySelectorAll(".tab")
        .forEach(
            x =>
                x.classList.remove(
                    "active"
                )
        );

    document
        .querySelector(
            '.tab[data-status="All"]'
        )
        ?.classList.add(
            "active"
        );


    currentPage = 1;

    loadInvoices();
}


/* =========================================
   UPLOAD MODAL
========================================= */

function openUploadModal() {

    document
        .getElementById(
            "uploadModal"
        )
        .classList.remove(
            "hidden"
        );
}

function closeUploadModal() {

    document
        .getElementById(
            "uploadModal"
        )
        .classList.add(
            "hidden"
        );
}


/* =========================================
   CREATE INVOICE
========================================= */

async function createInvoice(
    event
) {

    event.preventDefault();

    const payload = {

        invoice_number:
            document.getElementById(
                "newInvoiceNumber"
            ).value.trim(),

        vendor_id:
            document.getElementById(
                "newVendor"
            ).value,

        po_id:
            Number(
                document.getElementById(
                    "newPO"
                ).value
            ) || null,

        amount:
            Number(
                document.getElementById(
                    "newAmount"
                ).value
            ),

        invoice_date:
            document.getElementById(
                "newInvoiceDate"
            ).value,

        due_date:
            document.getElementById(
                "newDueDate"
            ).value || null,

        status:
            "Pending Approval"
    };


    try {

        await apiFetch(
            "/api/invoices",
            {
                method: "POST",
                body: JSON.stringify(
                    payload
                )
            }
        );

        alert(
            "Invoice created successfully."
        );

        closeUploadModal();

        document
            .getElementById(
                "invoiceForm"
            )
            .reset();

        await loadDashboard();

        currentPage = 1;

        await loadInvoices();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================
   EXPORT
========================================= */

async function exportInvoices() {

    const params =
        new URLSearchParams();

    const search =
        document.getElementById(
            "invoiceSearch"
        ).value.trim();

    const status =
        document.getElementById(
            "statusFilter"
        ).value;

    const vendor =
        document.getElementById(
            "vendorFilter"
        ).value;


    if (search)
        params.set(
            "search",
            search
        );

    if (
        status &&
        status !== "All"
    )
        params.set(
            "status",
            status
        );

    if (
        vendor &&
        vendor !== "All"
    )
        params.set(
            "vendor_id",
            vendor
        );


    /*
     * Add your CSV endpoint here when implemented.
     */

    alert(
        "Invoice export endpoint can be connected here."
    );
}


/* =========================================
   PAGINATION
========================================= */

function renderPagination(
    pagination
) {

    const total =
        pagination.total || 0;

    totalPages =
        pagination.pages || 1;

    const start =
        total === 0
        ? 0
        : (
            (currentPage - 1)
            * pageSize
        ) + 1;

    const end =
        Math.min(
            currentPage * pageSize,
            total
        );

    setText(
        "paginationText",
        `Showing ${start} to ${end} of ${total} invoices`
    );


    const buttons =
        document.getElementById(
            "pageButtons"
        );

    buttons.innerHTML = "";


    const maxButtons = 5;

    let startPage =
        Math.max(
            1,
            currentPage - 2
        );

    let endPage =
        Math.min(
            totalPages,
            startPage + maxButtons - 1
        );


    if (
        endPage - startPage
        < maxButtons - 1
    ) {

        startPage =
            Math.max(
                1,
                endPage - maxButtons + 1
            );
    }


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.className =
            "page-number";

        if (
            page === currentPage
        ) {
            button.classList.add(
                "active"
            );
        }

        button.textContent =
            page;

        button.addEventListener(
            "click",
            () => {

                currentPage = page;

                loadInvoices();

            }
        );

        buttons.appendChild(
            button
        );
    }


    document.getElementById(
        "previousPage"
    ).disabled =
        currentPage <= 1;

    document.getElementById(
        "nextPage"
    ).disabled =
        currentPage >= totalPages;
}


/* =========================================
   CLOSE DETAIL
========================================= */

function closeDetails() {

    selectedInvoice = null;

    document.getElementById(
        "invoiceDetails"
    ).innerHTML = `
        <div class="empty-details">

            <i
                class="fa-regular
                fa-file-invoice"
            ></i>

            <p>
                Select an invoice to view details
            </p>

        </div>
    `;
}


/* =========================================
   HELPERS
========================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element)
        element.textContent = value;
}


function formatCurrency(
    value
) {

    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
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
        return "-";

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    )
        return value;

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatDateTime(
    value
) {

    if (!value)
        return "-";

    return new Date(
        value
    ).toLocaleString();
}


function getStatusClass(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();

    if (value === "paid")
        return "status-paid";

    if (
        value.includes("pending")
    )
        return "status-pending";

    if (value === "overdue")
        return "status-overdue";

    if (value === "draft")
        return "status-draft";

    if (
        value === "rejected" ||
        value === "cancelled"
    )
        return "status-rejected";

    return "status-pending";
}


function escapeHtml(
    value
) {

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


function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;
    }
}

function openProfile(){
    window.location.href="/ProcurementProfile";
}

function loadUser(user){

    const name = user.name || "Manager";

    const role = user.role || "Procurement Manager";

    setText( "sidebarName", name );

    setText( "sidebarRole", role );

    setText( "headerName", name );

    setText( "headerRole", role );

}

async function loadProfile(){

    try{
        const data = await getJSON("/api/procurement/profile/me");

        console.log("Manager Profile:",data);

        loadUser(data.user);
    }

    catch(error){
        console.error("Unable to load manager profile:",error);
    }
}